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
    public const JENIS_PRODUKSI = [
        'pesanan' => 'Pesanan',
        'restok' => 'Restok',
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

    /**
     * @var array<string, string>
     */
    public const PESANAN_STATUS = [
        'pending' => 'Menunggu',
        'proses' => 'Diproses',
        'selesai' => 'Selesai',
        'dibatalkan' => 'Dibatalkan',
    ];

    /**
     * Status bayar turunan (bukan kolom enum pesanan).
     *
     * @var array<string, string>
     */
    public const STATUS_PEMBAYARAN = [
        'belum_bayar' => 'Belum Bayar',
        'sebagian' => 'Sebagian',
        'lunas' => 'Lunas',
    ];

    /**
     * Progress pengiriman per item pesanan.
     *
     * @var array<string, string>
     */
    public const STATUS_PENGIRIMAN = [
        'belum' => 'Belum',
        'sebagian' => 'Sebagian',
        'lengkap' => 'Lengkap',
    ];

    /**
     * Jenis pembayaran di header pesanan.
     *
     * @var array<string, string>
     */
    public const JENIS_PEMBAYARAN_PESANAN = [
        'dp' => 'DP (Down Payment)',
        'lunas' => 'Lunas',
        'bertahap' => 'Bertahap',
        'cod' => 'COD',
        'termin' => 'Termin',
    ];

    /**
     * Jenis transaksi pembayaran (baris pembayaran).
     *
     * @var array<string, string>
     */
    public const JENIS_PEMBAYARAN = [
        'dp' => 'DP (Down Payment)',
        'pelunasan' => 'Pelunasan',
        'termin' => 'Termin',
    ];

    /**
     * @var array<string, string>
     */
    public const JENIS_CUSTOMER = [
        'b2b' => 'B2B',
        'b2c' => 'B2C',
    ];

    /**
     * @var array<string, string>
     */
    public const STATUS_KARYAWAN = [
        'aktif' => 'Aktif',
        'nonaktif' => 'Nonaktif',
    ];

    /**
     * @var array<string, string>
     */
    public const JENIS_ARUS_KAS = [
        'pemasukan' => 'Pemasukan',
        'pengeluaran' => 'Pengeluaran',
    ];

    public static function produksiStatus(string $value): string
    {
        return self::PRODUKSI_STATUS[$value] ?? $value;
    }

    public static function jenisProduksi(string $value): string
    {
        return self::JENIS_PRODUKSI[$value] ?? $value;
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

    public static function pesananStatus(string $value): string
    {
        return self::PESANAN_STATUS[$value] ?? $value;
    }

    public static function statusPembayaran(string $value): string
    {
        return self::STATUS_PEMBAYARAN[$value] ?? $value;
    }

    public static function statusPengiriman(string $value): string
    {
        return self::STATUS_PENGIRIMAN[$value] ?? $value;
    }

    public static function jenisPembayaranPesanan(string $value): string
    {
        return self::JENIS_PEMBAYARAN_PESANAN[$value] ?? $value;
    }

    public static function jenisPembayaran(string $value): string
    {
        return self::JENIS_PEMBAYARAN[$value] ?? $value;
    }

    public static function jenisCustomer(string $value): string
    {
        return self::JENIS_CUSTOMER[$value] ?? $value;
    }

    public static function statusKaryawan(string $value): string
    {
        return self::STATUS_KARYAWAN[$value] ?? $value;
    }

    public static function jenisArusKas(string $value): string
    {
        return self::JENIS_ARUS_KAS[$value] ?? $value;
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
