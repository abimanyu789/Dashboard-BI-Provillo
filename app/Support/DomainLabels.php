<?php

namespace App\Support;

/**
 * Label Bahasa Indonesia untuk nilai enum/internal domain.
 * Nilai internal DB tidak diubah — hanya label user-facing.
 */
final class DomainLabels
{
    /**
     * @var array<string, string>
     */
    public const PRODUKSI_STATUS = [
        'draft' => 'Belum Dimulai',
        'proses' => 'Sedang Diproduksi',
        'selesai' => 'Selesai',
        'dibatalkan' => 'Dibatalkan',
    ];

    /**
     * @var array<string, string>
     */
    public const MATERIAL_MOVEMENT = [
        'planned' => 'Rencana Kebutuhan',
        'issued' => 'Bahan Dikeluarkan',
        'consumed' => 'Bahan Terpakai',
        'additional' => 'Bahan Tambahan Dikeluarkan',
        'returned' => 'Bahan Dikembalikan',
        'adjustment' => 'Penyesuaian Stok',
    ];

    /**
     * @var array<string, string>
     */
    public const MATERIAL_AVAILABILITY = [
        'sufficient' => 'Stok Cukup, Belum Dikeluarkan',
        'shortage' => 'Stok Kurang',
        'fulfilled' => 'Bahan Sudah Dikeluarkan Sesuai Rencana',
    ];

    /**
     * @var array<string, string>
     */
    public const QC_STATUS = [
        'lolos' => 'Lolos Pemeriksaan',
        'tidak_lolos' => 'Tidak Lolos Pemeriksaan',
        'belum_dicek' => 'Belum Dicek',
    ];

    /**
     * @var array<string, string>
     */
    public const QC_DISPOSITION = [
        'rework' => 'Perbaikan Ulang',
        'jual_cacat' => 'Produk Cacat Layak Jual',
        'dimusnahkan' => 'Dimusnahkan',
    ];

    /**
     * @var array<string, string>
     */
    public const STOK_BAHAN_TRANSAKSI = [
        'restock' => 'Penambahan Stok',
        'produksi' => 'Pengeluaran untuk Produksi',
        'rollback' => 'Pengembalian dari Produksi',
        'penyesuaian' => 'Penyesuaian Stok',
    ];

    /**
     * Label transaksi stok produk jadi.
     * Internal value `produksi` means stock increased from QC-pass output
     * (not raw-material issue). Keep separate from STOK_BAHAN_TRANSAKSI.
     *
     * @var array<string, string>
     */
    public const STOK_PRODUK_TRANSAKSI = [
        'produksi' => 'Hasil Produksi',
        'pengiriman' => 'Pengiriman Produk',
        'rollback' => 'Pengembalian dari Produksi',
        'penyesuaian' => 'Penyesuaian Stok',
    ];

    public static function produksiStatus(string $value): string
    {
        return self::PRODUKSI_STATUS[$value] ?? $value;
    }

    public static function materialMovement(string $value): string
    {
        return self::MATERIAL_MOVEMENT[$value] ?? $value;
    }

    public static function materialAvailability(string $value): string
    {
        return self::MATERIAL_AVAILABILITY[$value] ?? $value;
    }

    public static function qcStatus(string $value): string
    {
        return self::QC_STATUS[$value] ?? $value;
    }

    public static function qcDisposition(string $value): string
    {
        return self::QC_DISPOSITION[$value] ?? $value;
    }

    public static function stokBahanTransaksi(string $value): string
    {
        return self::STOK_BAHAN_TRANSAKSI[$value] ?? $value;
    }

    public static function stokProdukTransaksi(string $value): string
    {
        return self::STOK_PRODUK_TRANSAKSI[$value] ?? $value;
    }

    /**
     * Ringkasan sumber transaksi stok bahan baku untuk audit trail.
     */
    public static function sumberStokBahan(
        string $jenisTransaksi,
        ?int $produksiId = null,
    ): string {
        return match ($jenisTransaksi) {
            'restock' => 'Penambahan Stok Manual',
            'penyesuaian' => 'Penyesuaian Stok',
            'produksi' => $produksiId
                ? "Produksi #{$produksiId}"
                : 'Pengeluaran untuk Produksi',
            'rollback' => $produksiId
                ? "Pengembalian dari Produksi #{$produksiId}"
                : 'Pengembalian dari Produksi',
            default => self::stokBahanTransaksi($jenisTransaksi),
        };
    }
}
