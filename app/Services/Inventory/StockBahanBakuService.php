<?php

namespace App\Services\Inventory;

use App\Models\BahanBaku;
use App\Models\StokBahanBaku;
use Illuminate\Support\Facades\DB;

class StockBahanBakuService
{
    /**
     * Tambah stok bahan baku (restock manual).
     *
     * Digunakan oleh: modul Stok Bahan Baku (restock manual admin).
     * Dapat diperluas untuk: penyesuaian.
     *
     * @param  BahanBaku  $bahanBaku  Model yang stoknya akan ditambah.
     * @param  float  $qty  Jumlah yang ditambahkan (harus > 0).
     * @param  string  $jenis  Jenis transaksi: 'restock' | 'penyesuaian'.
     * @param  string|null  $keterangan  Catatan opsional.
     */
    public function addStock(
        BahanBaku $bahanBaku,
        float $qty,
        string $jenis = 'restock',
        ?string $keterangan = null,
        ?int $createdBy = null,
        ?int $produksiPemakaianBahanId = null,
    ): StokBahanBaku {
        if ($qty <= 0) {
            throw new \InvalidArgumentException('Jumlah penambahan stok harus lebih dari nol.');
        }

        return DB::transaction(function () use (
            $bahanBaku,
            $qty,
            $jenis,
            $keterangan,
            $createdBy,
            $produksiPemakaianBahanId,
        ) {
            $lockedBahan = BahanBaku::query()->lockForUpdate()->findOrFail($bahanBaku->id);

            if ($produksiPemakaianBahanId !== null) {
                $existing = StokBahanBaku::query()
                    ->where('produksi_pemakaian_bahan_id', $produksiPemakaianBahanId)
                    ->first();

                if ($existing !== null) {
                    return $existing;
                }
            }

            $stokSebelum = (float) $lockedBahan->stok;
            $stokSesudah = $stokSebelum + $qty;

            $lockedBahan->update(['stok' => $stokSesudah]);

            return StokBahanBaku::create([
                'bahan_baku_id' => $lockedBahan->id,
                'produksi_pemakaian_bahan_id' => $produksiPemakaianBahanId,
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
     * Kurangi stok bahan baku.
     *
     * Digunakan oleh: modul Produksi (potong stok saat produksi dimulai),
     * dan rollback saat produksi dibatalkan.
     *
     * @param  BahanBaku  $bahanBaku  Model yang stoknya akan dikurangi.
     * @param  float  $qty  Jumlah yang dikurangi (harus > 0).
     * @param  string  $jenis  Jenis transaksi: 'produksi' | 'rollback' | 'penyesuaian'.
     * @param  string|null  $keterangan  Catatan opsional.
     *
     * @throws \RuntimeException Jika stok tidak mencukupi (BR-01: stok tidak boleh negatif).
     */
    public function reduceStock(
        BahanBaku $bahanBaku,
        float $qty,
        string $jenis = 'produksi',
        ?string $keterangan = null,
        ?int $createdBy = null,
        ?int $produksiPemakaianBahanId = null,
    ): StokBahanBaku {
        if ($qty <= 0) {
            throw new \InvalidArgumentException('Jumlah pengurangan stok harus lebih dari nol.');
        }

        return DB::transaction(function () use (
            $bahanBaku,
            $qty,
            $jenis,
            $keterangan,
            $createdBy,
            $produksiPemakaianBahanId,
        ) {
            $lockedBahan = BahanBaku::query()->lockForUpdate()->findOrFail($bahanBaku->id);

            if ($produksiPemakaianBahanId !== null) {
                $existing = StokBahanBaku::query()
                    ->where('produksi_pemakaian_bahan_id', $produksiPemakaianBahanId)
                    ->first();

                if ($existing !== null) {
                    return $existing;
                }
            }

            $stokSebelum = (float) $lockedBahan->stok;

            if ($stokSebelum < $qty) {
                throw new \RuntimeException(
                    "Stok {$lockedBahan->nama_bahan} tidak mencukupi. "
                    ."Tersedia: {$stokSebelum}, dibutuhkan: {$qty}."
                );
            }

            $stokSesudah = $stokSebelum - $qty;
            $lockedBahan->update(['stok' => $stokSesudah]);

            return StokBahanBaku::create([
                'bahan_baku_id' => $lockedBahan->id,
                'produksi_pemakaian_bahan_id' => $produksiPemakaianBahanId,
                'jenis_transaksi' => $jenis,
                'qty' => $qty,
                'stok_sebelum' => $stokSebelum,
                'stok_sesudah' => $stokSesudah,
                'keterangan' => $keterangan,
                'created_by' => $createdBy,
            ]);
        });
    }
}
