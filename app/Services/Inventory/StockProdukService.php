<?php

namespace App\Services\Inventory;

use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\StokProdukJadi;
use Illuminate\Support\Facades\DB;

class StockProdukService
{
    /**
     * Tambah stok produk jadi.
     *
     * Digunakan oleh: modul Produksi (tambah stok saat progres produksi selesai).
     * Dapat diperluas untuk: penyesuaian stok.
     *
     * @param  Produk  $produk  Model produk yang stoknya akan ditambah.
     * @param  int  $qty  Jumlah yang ditambahkan (harus > 0).
     * @param  string  $jenis  Jenis transaksi: 'produksi' | 'penyesuaian'.
     * @param  string|null  $keterangan  Catatan opsional.
     * @param  int|null  $createdBy  ID user yang melakukan transaksi (dari auth()->id()).
     * @param  int|null  $pesananId  Hanya untuk jejak (biasanya null pada penambahan).
     */
    public function addStock(
        Produk $produk,
        int $qty,
        string $jenis = 'produksi',
        ?string $keterangan = null,
        ?int $createdBy = null,
        ?int $pesananId = null,
        ?int $detailProduksiId = null,
    ): StokProdukJadi {
        if ($qty <= 0) {
            throw new \InvalidArgumentException('Jumlah penambahan stok harus lebih dari nol.');
        }

        return DB::transaction(function () use (
            $produk,
            $qty,
            $jenis,
            $keterangan,
            $createdBy,
            $pesananId,
            $detailProduksiId,
        ) {
            $lockedProduk = Produk::query()->lockForUpdate()->findOrFail($produk->id);

            if ($detailProduksiId !== null) {
                $existing = StokProdukJadi::query()
                    ->where('detail_produksi_id', $detailProduksiId)
                    ->first();

                if ($existing !== null) {
                    return $existing;
                }
            }

            $stokSebelum = (int) $lockedProduk->stok;
            $stokSesudah = $stokSebelum + $qty;

            $lockedProduk->update(['stok' => $stokSesudah]);

            return StokProdukJadi::create([
                'produk_id' => $lockedProduk->id,
                'detail_produksi_id' => $detailProduksiId,
                'pesanan_id' => $pesananId,
                'jenis_transaksi' => $jenis,
                'qty' => $qty,
                'stok_sebelum' => $stokSebelum,
                'stok_sesudah' => $stokSesudah,
                'keterangan' => $keterangan,
                'created_by' => $createdBy,
            ]);
        });
    }

    /**
     * Kurangi stok produk jadi.
     *
     * Digunakan oleh: pengiriman manual (modul ini), dan rollback produksi.
     * Business rule: stok tidak boleh negatif (BR Stok Produk Jadi).
     *
     * @param  Produk  $produk  Model produk yang stoknya akan dikurangi.
     * @param  int  $qty  Jumlah yang dikurangi (harus > 0).
     * @param  string  $jenis  Jenis transaksi: 'pengiriman' | 'rollback' | 'penyesuaian'.
     * @param  string|null  $keterangan  Catatan opsional.
     * @param  int|null  $createdBy  ID user yang melakukan transaksi (dari auth()->id()).
     * @param  int|null  $pesananId  Wajib diisi untuk pengiriman (BR-KIR-01).
     *
     * @throws \RuntimeException Jika stok tidak mencukupi.
     */
    public function reduceStock(
        Produk $produk,
        int $qty,
        string $jenis = 'pengiriman',
        ?string $keterangan = null,
        ?int $createdBy = null,
        ?int $pesananId = null,
    ): StokProdukJadi {
        if ($qty <= 0) {
            throw new \InvalidArgumentException('Jumlah pengurangan stok harus lebih dari nol.');
        }

        return DB::transaction(function () use ($produk, $qty, $jenis, $keterangan, $createdBy, $pesananId) {
            $lockedProduk = Produk::query()->lockForUpdate()->findOrFail($produk->id);
            $stokSebelum = (int) $lockedProduk->stok;

            if ($stokSebelum < $qty) {
                throw new \RuntimeException(
                    "Stok {$lockedProduk->nama_produk} tidak mencukupi. "
                    ."Tersedia: {$stokSebelum}, dibutuhkan: {$qty}."
                );
            }

            $stokSesudah = $stokSebelum - $qty;
            $lockedProduk->update(['stok' => $stokSesudah]);

            return StokProdukJadi::create([
                'produk_id' => $lockedProduk->id,
                'pesanan_id' => $pesananId,
                'jenis_transaksi' => $jenis,
                'qty' => $qty,
                'stok_sebelum' => $stokSebelum,
                'stok_sesudah' => $stokSesudah,
                'keterangan' => $keterangan,
                'created_by' => $createdBy,
            ]);
        });
    }

    /**
     * Total qty yang sudah dikirim untuk satu produk pada satu pesanan.
     */
    public function qtyDikirim(int $pesananId, int $produkId): int
    {
        return (int) StokProdukJadi::query()
            ->where('pesanan_id', $pesananId)
            ->where('produk_id', $produkId)
            ->where('jenis_transaksi', 'pengiriman')
            ->sum('qty');
    }

    /**
     * Ringkasan sisa pengiriman per item untuk form pengiriman / detail pesanan.
     *
     * @return array{
     *     overall: array{qty_pesan: int, qty_dikirim: int, qty_sisa: int, percent: float, is_fully_shipped: bool},
     *     items: list<array{
     *         produk_id: int,
     *         kode_produk: string|null,
     *         nama_produk: string|null,
     *         stok: int,
     *         qty_pesan: int,
     *         qty_dikirim: int,
     *         qty_sisa: int,
     *         percent: float,
     *         status: 'belum'|'sebagian'|'lengkap'
     *     }>
     * }
     */
    public function progressPengiriman(Pesanan $pesanan): array
    {
        $pesanan->loadMissing('detailPesanan.produk');

        $shippedByProduk = StokProdukJadi::query()
            ->where('pesanan_id', $pesanan->id)
            ->where('jenis_transaksi', 'pengiriman')
            ->selectRaw('produk_id, SUM(qty) as total_qty')
            ->groupBy('produk_id')
            ->pluck('total_qty', 'produk_id');

        $items = [];
        $qtyPesanTotal = 0;
        $qtyDikirimTotal = 0;

        foreach ($pesanan->detailPesanan as $detail) {
            $qtyPesan = (int) $detail->qty;
            $qtyDikirim = (int) ($shippedByProduk[$detail->produk_id] ?? 0);
            // Clamp agar UI tidak menampilkan over-ship aneh jika data historis
            $qtyDikirim = min($qtyDikirim, $qtyPesan);
            $qtySisa = max(0, $qtyPesan - $qtyDikirim);
            $percent = $qtyPesan > 0
                ? round(($qtyDikirim / $qtyPesan) * 100, 1)
                : 0.0;

            $status = match (true) {
                $qtyDikirim <= 0 => 'belum',
                $qtySisa <= 0 => 'lengkap',
                default => 'sebagian',
            };

            $items[] = [
                'produk_id' => $detail->produk_id,
                'kode_produk' => $detail->produk?->kode_produk,
                'nama_produk' => $detail->produk?->nama_produk,
                'stok' => (int) ($detail->produk?->stok ?? 0),
                'qty_pesan' => $qtyPesan,
                'qty_dikirim' => $qtyDikirim,
                'qty_sisa' => $qtySisa,
                'percent' => $percent,
                'status' => $status,
            ];

            $qtyPesanTotal += $qtyPesan;
            $qtyDikirimTotal += $qtyDikirim;
        }

        $qtySisaTotal = max(0, $qtyPesanTotal - $qtyDikirimTotal);
        $overallPercent = $qtyPesanTotal > 0
            ? round(($qtyDikirimTotal / $qtyPesanTotal) * 100, 1)
            : 0.0;

        return [
            'overall' => [
                'qty_pesan' => $qtyPesanTotal,
                'qty_dikirim' => $qtyDikirimTotal,
                'qty_sisa' => $qtySisaTotal,
                'percent' => $overallPercent,
                'is_fully_shipped' => $qtyPesanTotal > 0 && $qtySisaTotal === 0,
            ],
            'items' => $items,
        ];
    }
}
