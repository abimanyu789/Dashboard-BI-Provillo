<?php

namespace App\Services;

use App\Models\DetailPesanan;
use App\Models\Pesanan;
use Illuminate\Support\Facades\DB;

class PesananService
{
    /**
     * Buat pesanan baru beserta seluruh detail item dalam satu transaksi.
     *
     * @param  array $data  Validated data dari PesananRequest
     * @param  int   $createdBy  ID user yang membuat pesanan
     */
    public function createWithDetails(array $data, int $createdBy): Pesanan
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $kalkulasi = $this->hitungTotal($data['items'], $data);

            $pesanan = Pesanan::create([
                'customer_id'      => $data['customer_id'],
                'created_by'       => $createdBy,
                'tanggal'          => $data['tanggal'],
                'status'           => 'pending',
                'jenis_pembayaran' => $data['jenis_pembayaran'] ?? null,
                'subtotal'         => $kalkulasi['subtotal'],
                'diskon'           => $kalkulasi['diskon'],
                'ongkir'           => $data['ongkir'] ?? 0,
                'total'            => $kalkulasi['total'],
                'keterangan'       => $data['keterangan'] ?? null,
            ]);

            $this->syncDetails($pesanan, $data['items']);

            return $pesanan->load('detailPesanan.produk');
        });
    }

    /**
     * Update pesanan (full edit — hanya boleh saat status pending & belum ada pengiriman).
     *
     * @param  array $data  Validated data dari PesananRequest
     */
    public function updateWithDetails(Pesanan $pesanan, array $data): Pesanan
    {
        return DB::transaction(function () use ($pesanan, $data) {
            // H9: blok edit jika sudah ada pengiriman
            if ($pesanan->hasPengiriman()) {
                throw new \RuntimeException(
                    'Pesanan yang sudah memiliki pengiriman tidak dapat diedit.'
                );
            }

            if ($pesanan->isLocked()) {
                throw new \RuntimeException(
                    "Pesanan dengan status '{$pesanan->status}' tidak dapat diedit."
                );
            }

            $kalkulasi = $this->hitungTotal($data['items'], $data);

            $pesanan->update([
                'customer_id'      => $data['customer_id'],
                'tanggal'          => $data['tanggal'],
                'jenis_pembayaran' => $data['jenis_pembayaran'] ?? null,
                'subtotal'         => $kalkulasi['subtotal'],
                'diskon'           => $kalkulasi['diskon'],
                'ongkir'           => $data['ongkir'] ?? 0,
                'total'            => $kalkulasi['total'],
                'keterangan'       => $data['keterangan'] ?? null,
            ]);

            // Hapus semua detail lama, ganti dengan yang baru
            $pesanan->detailPesanan()->delete();
            $this->syncDetails($pesanan, $data['items']);

            return $pesanan->load('detailPesanan.produk');
        });
    }

    /**
     * Update status pesanan dengan validasi flow BR-06 & BR-07 + hardening.
     *
     * Flow yang valid (manual):
     *   pending → proses
     *   pending → dibatalkan
     *   proses  → dibatalkan
     *
     * Transisi ke 'selesai' HANYA lewat evaluateCompletion() (R1 / BR-PSN-10).
     *
     * @throws \RuntimeException  Jika transisi status tidak valid
     */
    public function updateStatus(Pesanan $pesanan, string $statusBaru): Pesanan
    {
        if ($pesanan->isLocked()) {
            throw new \RuntimeException(
                "Pesanan dengan status '{$pesanan->status}' tidak dapat diubah."
            );
        }

        // R1: selesai hanya otomatis
        if ($statusBaru === 'selesai') {
            throw new \RuntimeException(
                'Status Selesai di-set otomatis saat pembayaran lunas dan semua produk sudah terkirim.'
            );
        }

        $transisiValid = [
            'pending' => ['proses', 'dibatalkan'],
            'proses'  => ['dibatalkan'],
        ];

        $statusSaatIni   = $pesanan->status;
        $statusDiizinkan = $transisiValid[$statusSaatIni] ?? [];

        if (! in_array($statusBaru, $statusDiizinkan, true)) {
            throw new \RuntimeException(
                "Tidak dapat mengubah status dari '{$statusSaatIni}' ke '{$statusBaru}'."
            );
        }

        // H10: blok cancel jika sudah ada pengiriman
        if ($statusBaru === 'dibatalkan' && $pesanan->hasPengiriman()) {
            throw new \RuntimeException(
                'Pesanan yang sudah memiliki pengiriman tidak dapat dibatalkan. '.
                'Reverse stok pengiriman terlebih dahulu jika diperlukan.'
            );
        }

        $pesanan->update(['status' => $statusBaru]);

        return $pesanan->fresh();
    }

    /**
     * BR-PSN-13: Naikkan pending → proses saat ada aktivitas (bayar/ship pertama).
     */
    public function promoteToProsesIfPending(Pesanan $pesanan): void
    {
        $pesanan->refresh();

        if ($pesanan->status === 'pending') {
            $pesanan->update(['status' => 'proses']);
        }
    }

    /**
     * BR-PSN-10: Auto-selesai jika lunas + semua produk terkirim.
     * Hanya dari status 'proses'.
     */
    public function evaluateCompletion(Pesanan $pesanan): void
    {
        $pesanan->refresh();
        $pesanan->loadMissing('detailPesanan', 'pembayarans');

        if ($pesanan->status !== 'proses') {
            return;
        }

        if ($pesanan->isLunas() && $pesanan->isFullyShipped()) {
            $pesanan->update(['status' => 'selesai']);
        }
    }

    /**
     * H5: Pembayaran tidak boleh dihapus jika pesanan sudah selesai.
     *
     * @throws \RuntimeException
     */
    public function assertPembayaranDeletable(Pesanan $pesanan): void
    {
        if ($pesanan->isSelesai()) {
            throw new \RuntimeException(
                'Pembayaran pada pesanan yang sudah selesai tidak dapat dihapus.'
            );
        }

        if ($pesanan->isDibatalkan()) {
            throw new \RuntimeException(
                'Pembayaran pada pesanan yang dibatalkan tidak dapat dihapus.'
            );
        }
    }

    /**
     * Hitung subtotal, diskon (nominal akhir), dan total.
     *
     * @param  array $items  Array of ['produk_id', 'qty', 'harga']
     * @param  array $data   Termasuk 'tipe_diskon', 'diskon', 'ongkir'
     */
    public function hitungTotal(array $items, array $data): array
    {
        $subtotal = collect($items)->sum(fn ($item) => $item['qty'] * $item['harga']);

        $nilaiDiskon = 0;
        $inputDiskon = (float) ($data['diskon'] ?? 0);

        if ($inputDiskon > 0) {
            $tipe = $data['tipe_diskon'] ?? 'nominal';
            $nilaiDiskon = $tipe === 'persen'
                ? round($subtotal * ($inputDiskon / 100), 2)
                : $inputDiskon;
        }

        $ongkir = (float) ($data['ongkir'] ?? 0);
        $total  = $subtotal - $nilaiDiskon + $ongkir;

        return [
            'subtotal' => $subtotal,
            'diskon'   => $nilaiDiskon,    // selalu disimpan sebagai nominal rupiah
            'total'    => max(0, $total),  // total tidak boleh negatif
        ];
    }

    /**
     * Insert detail pesanan dari array items.
     */
    private function syncDetails(Pesanan $pesanan, array $items): void
    {
        foreach ($items as $item) {
            DetailPesanan::create([
                'pesanan_id' => $pesanan->id,
                'produk_id'  => $item['produk_id'],
                'qty'        => $item['qty'],
                'harga'      => $item['harga'],
                'subtotal'   => $item['qty'] * $item['harga'],
            ]);
        }
    }
}
