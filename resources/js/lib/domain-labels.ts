import type {
    JenisArusKas,
    JenisCustomer,
    JenisPembayaran,
    JenisPembayaranPesanan,
    JenisProduksi,
    JenisTransaksiProduk,
    JenisTransaksiStok,
    MaterialMovementType,
    MaterialStatus,
    QcDisposition,
    QcStatus,
    StatusKaryawan,
    StatusPembayaran,
    StatusPengirimanItem,
    StatusPesanan,
    StatusProduksi,
} from '@/types';

export const produksiStatusLabels: Record<StatusProduksi, string> = {
    draft: 'Belum Dimulai',
    proses: 'Sedang Diproduksi',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
};

export const jenisProduksiLabels: Record<JenisProduksi, string> = {
    pesanan: 'Pesanan',
    restok: 'Restok',
};

export const materialMovementLabels: Record<MaterialMovementType, string> = {
    planned: 'Rencana Kebutuhan',
    issued: 'Bahan Dikeluarkan',
    consumed: 'Bahan Terpakai',
    additional: 'Bahan Tambahan Dikeluarkan',
    returned: 'Bahan Dikembalikan',
    adjustment: 'Penyesuaian Stok',
};

export const materialAvailabilityLabels: Record<MaterialStatus, string> = {
    sufficient: 'Stok Cukup, Belum Dikeluarkan',
    shortage: 'Stok Kurang',
    fulfilled: 'Bahan Sudah Dikeluarkan Sesuai Rencana',
};

export const qcStatusLabels: Record<QcStatus, string> = {
    lolos: 'Lolos Pemeriksaan',
    tidak_lolos: 'Tidak Lolos Pemeriksaan',
};

export const qcDispositionLabels: Record<QcDisposition, string> = {
    rework: 'Perbaikan Ulang',
    jual_cacat: 'Produk Cacat Layak Jual',
    dimusnahkan: 'Dimusnahkan',
};

export const stokBahanTransaksiLabels: Record<JenisTransaksiStok, string> = {
    restock: 'Penambahan Stok',
    produksi: 'Pengeluaran untuk Produksi',
    rollback: 'Pengembalian dari Produksi',
    penyesuaian: 'Penyesuaian Stok',
};

/**
 * Label transaksi stok produk jadi.
 * Internal value `produksi` means stock increased from QC-pass output
 * (not raw-material issue). Keep separate from stokBahanTransaksiLabels.
 */
export const stokProdukTransaksiLabels: Record<JenisTransaksiProduk, string> = {
    produksi: 'Hasil Produksi',
    pengiriman: 'Pengiriman Produk',
    rollback: 'Pengembalian dari Produksi',
    penyesuaian: 'Penyesuaian Stok',
};

export const pesananStatusLabels: Record<StatusPesanan, string> = {
    pending: 'Menunggu',
    proses: 'Diproses',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
};

export const statusPembayaranLabels: Record<StatusPembayaran, string> = {
    belum_bayar: 'Belum Bayar',
    sebagian: 'Sebagian',
    lunas: 'Lunas',
};

export const statusPengirimanLabels: Record<StatusPengirimanItem, string> = {
    belum: 'Belum',
    sebagian: 'Sebagian',
    lengkap: 'Lengkap',
};

export const jenisPembayaranPesananLabels: Record<
    JenisPembayaranPesanan,
    string
> = {
    dp: 'DP (Down Payment)',
    lunas: 'Lunas',
    bertahap: 'Bertahap',
    cod: 'COD',
    termin: 'Termin',
};

export const jenisPembayaranLabels: Record<JenisPembayaran, string> = {
    dp: 'DP (Down Payment)',
    pelunasan: 'Pelunasan',
    termin: 'Termin',
};

export const jenisCustomerLabels: Record<JenisCustomer, string> = {
    b2b: 'B2B',
    b2c: 'B2C',
};

export const statusKaryawanLabels: Record<StatusKaryawan, string> = {
    aktif: 'Aktif',
    nonaktif: 'Nonaktif',
};

export const jenisArusKasLabels: Record<JenisArusKas, string> = {
    pemasukan: 'Pemasukan',
    pengeluaran: 'Pengeluaran',
};

export function produksiStatusLabel(value: StatusProduksi | string): string {
    return produksiStatusLabels[value as StatusProduksi] ?? String(value);
}

export function jenisProduksiLabel(value: JenisProduksi | string): string {
    return jenisProduksiLabels[value as JenisProduksi] ?? String(value);
}

export function materialMovementLabel(
    value: MaterialMovementType | string,
): string {
    return (
        materialMovementLabels[value as MaterialMovementType] ?? String(value)
    );
}

export function materialAvailabilityLabel(
    value: MaterialStatus | string,
): string {
    return materialAvailabilityLabels[value as MaterialStatus] ?? String(value);
}

export function qcStatusLabel(value: QcStatus | string): string {
    return qcStatusLabels[value as QcStatus] ?? String(value);
}

export function qcDispositionLabel(value: QcDisposition | string): string {
    return qcDispositionLabels[value as QcDisposition] ?? String(value);
}

export function stokBahanTransaksiLabel(
    value: JenisTransaksiStok | string,
): string {
    return (
        stokBahanTransaksiLabels[value as JenisTransaksiStok] ?? String(value)
    );
}

export function stokProdukTransaksiLabel(
    value: JenisTransaksiProduk | string,
): string {
    return (
        stokProdukTransaksiLabels[value as JenisTransaksiProduk] ??
        String(value)
    );
}

export function pesananStatusLabel(value: StatusPesanan | string): string {
    return pesananStatusLabels[value as StatusPesanan] ?? String(value);
}

export function statusPembayaranLabel(
    value: StatusPembayaran | string,
): string {
    return statusPembayaranLabels[value as StatusPembayaran] ?? String(value);
}

export function statusPengirimanLabel(
    value: StatusPengirimanItem | string,
): string {
    return (
        statusPengirimanLabels[value as StatusPengirimanItem] ?? String(value)
    );
}

export function jenisPembayaranPesananLabel(
    value: JenisPembayaranPesanan | string,
): string {
    return (
        jenisPembayaranPesananLabels[value as JenisPembayaranPesanan] ??
        String(value)
    );
}

export function jenisPembayaranLabel(value: JenisPembayaran | string): string {
    return jenisPembayaranLabels[value as JenisPembayaran] ?? String(value);
}

export function jenisCustomerLabel(value: JenisCustomer | string): string {
    return jenisCustomerLabels[value as JenisCustomer] ?? String(value);
}

export function statusKaryawanLabel(value: StatusKaryawan | string): string {
    return statusKaryawanLabels[value as StatusKaryawan] ?? String(value);
}

export function jenisArusKasLabel(value: JenisArusKas | string): string {
    return jenisArusKasLabels[value as JenisArusKas] ?? String(value);
}

export function sumberStokBahanLabel(
    jenis: JenisTransaksiStok | string,
    produksiId?: number | null,
): string {
    switch (jenis) {
        case 'restock':
            return 'Penambahan Stok Manual';
        case 'penyesuaian':
            return 'Penyesuaian Stok';
        case 'produksi':
            return produksiId
                ? `Produksi #${produksiId}`
                : 'Pengeluaran untuk Produksi';
        case 'rollback':
            return produksiId
                ? `Pengembalian dari Produksi #${produksiId}`
                : 'Pengembalian dari Produksi';
        default:
            return stokBahanTransaksiLabel(jenis);
    }
}
