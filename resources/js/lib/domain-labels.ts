import type {
    JenisTransaksiProduk,
    JenisTransaksiStok,
    MaterialMovementType,
    MaterialStatus,
    QcDisposition,
    QcStatus,
    StatusProduksi,
} from '@/types';

export const produksiStatusLabels: Record<StatusProduksi, string> = {
    draft: 'Belum Dimulai',
    proses: 'Sedang Diproduksi',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
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

export function produksiStatusLabel(value: StatusProduksi | string): string {
    return produksiStatusLabels[value as StatusProduksi] ?? String(value);
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
