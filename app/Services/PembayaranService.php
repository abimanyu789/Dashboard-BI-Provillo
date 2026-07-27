<?php

namespace App\Services;

use App\Models\ArusKas;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use Illuminate\Support\Facades\DB;

class PembayaranService
{
    public function __construct(
        private readonly PesananService $pesananService
    ) {}

    /**
     * Catat pembayaran pesanan dan otomatis buat entry arus kas (pemasukan).
     *
     * Business rules:
     * - BR-03: Transaksi pembayaran pesanan wajib terhubung ke data pesanan terkait
     * - BR-05: Saldo kas dihitung ulang otomatis setiap transaksi berhasil disimpan
     * - BR-PBY-10: Nominal tidak boleh melebihi sisa tagihan
     * - BR-PSN-13: pending → proses otomatis
     * - BR-PSN-10: evaluasi auto-selesai
     *
     * @throws \RuntimeException
     */
    public function create(Pesanan $pesanan, array $data, int $createdBy): Pembayaran
    {
        return DB::transaction(function () use ($pesanan, $data, $createdBy) {
            // Lock baris pesanan agar race condition overpay tidak lolos
            $pesanan = Pesanan::query()->whereKey($pesanan->id)->lockForUpdate()->firstOrFail();

            if ($pesanan->isDibatalkan()) {
                throw new \RuntimeException(
                    'Tidak dapat menambah pembayaran pada pesanan yang dibatalkan.'
                );
            }

            if ($pesanan->isSelesai()) {
                throw new \RuntimeException(
                    'Tidak dapat menambah pembayaran pada pesanan yang sudah selesai.'
                );
            }

            $sisa = $this->pesananService->sisaTagihan($pesanan);
            $nominal = round((float) $data['nominal'], 2);

            if ($nominal <= 0) {
                throw new \RuntimeException('Nominal harus lebih dari 0.');
            }

            if ($nominal > $sisa + 0.0001) {
                $sisaFormatted = number_format($sisa, 0, ',', '.');
                throw new \RuntimeException(
                    "Nominal melebihi sisa tagihan. Sisa: Rp {$sisaFormatted}."
                );
            }

            $pembayaran = Pembayaran::create([
                'pesanan_id'       => $pesanan->id,
                'tanggal'          => $data['tanggal'],
                'jenis_pembayaran' => $data['jenis_pembayaran'],
                'nominal'          => $nominal,
                'metode'           => $data['metode'] ?? null,
                'keterangan'       => $data['keterangan'] ?? null,
            ]);

            // Auto-create entry arus kas sebagai pemasukan
            ArusKas::create([
                'pembayaran_id'     => $pembayaran->id,
                'created_by'        => $createdBy,
                'tanggal'           => $data['tanggal'],
                'jenis'             => 'pemasukan',
                'kategori'          => 'Pendapatan Penjualan',
                'nominal'           => $nominal,
                'metode_pembayaran' => $data['metode'] ?? null,
                'keterangan'        => "Pembayaran pesanan {$pesanan->nomor_pesanan}".
                                       ($data['keterangan'] ? " — {$data['keterangan']}" : ''),
                'bukti_transaksi'   => null,
            ]);

            // Aktivitas bayar → promote proses + cek auto-selesai
            $this->pesananService->evaluateCompletion($pesanan);

            return $pembayaran->load('arusKas');
        });
    }

    /**
     * Hapus pembayaran beserta entry arus kas yang terkait.
     *
     * BR-07: Penghapusan transaksi menyebabkan saldo dihitung ulang.
     * H5: Tidak boleh hapus jika pesanan sudah selesai.
     *
     * @throws \RuntimeException
     */
    public function destroy(Pembayaran $pembayaran): void
    {
        DB::transaction(function () use ($pembayaran) {
            $pesanan = Pesanan::query()
                ->whereKey($pembayaran->pesanan_id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->pesananService->assertPembayaranDeletable($pesanan);

            // Hapus arus kas terkait dulu (FK nullable RESTRICT)
            $pembayaran->arusKas()->delete();
            $pembayaran->delete();
        });
    }
}
