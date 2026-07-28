import type { Produk } from './produk';

export type JenisTransaksiProduk =
    'produksi' | 'pengiriman' | 'rollback' | 'penyesuaian';

export type StokProdukTab = 'normal' | 'cacat' | 'dimusnahkan';

export interface StokProdukJadi {
    id: number;
    produk_id: number;
    pesanan_id: number | null;
    jenis_transaksi: JenisTransaksiProduk;
    jenis_transaksi_label?: string;
    qty: number;
    stok_sebelum: number;
    stok_sesudah: number;
    keterangan: string | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    dicatat_oleh?: string | null;
    // Relasi
    produk?: Produk;
    pesanan?: {
        id: number;
        nomor_pesanan: string;
        customer?: { id: number; nama_customer: string };
    };
}

export interface StokProdukCacatRow {
    id: number;
    produk_id: number;
    kode_produk: string | null;
    nama_produk: string | null;
    qty: number;
    alasan_qc: string | null;
    catatan: string | null;
    produksi_id: number | null;
    karyawan?: string | null;
    inspected_at: string | null;
    created_at: string;
    dicatat_oleh: string | null;
    disposisi: 'jual_cacat' | 'dimusnahkan';
    disposisi_label: string;
}

export interface StokProdukOption {
    id: number;
    kode_produk: string;
    nama_produk: string;
    stok: number;
}

export interface PesananOptionForPengiriman {
    id: number;
    nomor_pesanan: string;
    tanggal: string | null;
    status: string;
    customer: string | null;
    total: string | number;
}

export interface SisaPengirimanItem {
    produk_id: number;
    kode_produk: string | null;
    nama_produk: string | null;
    qty_pesan: number;
    qty_dikirim: number;
    qty_sisa: number;
    stok_tersedia: number;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export interface StokProdukJadiIndexProps {
    tab: StokProdukTab;
    riwayat: Paginated<StokProdukJadi> | null;
    produkCacat: Paginated<StokProdukCacatRow> | null;
    riwayatDimusnahkan: Paginated<StokProdukCacatRow> | null;
    produkOptions: StokProdukOption[];
    filters: {
        tab?: string;
        search?: string;
        produk_id?: string;
        jenis_transaksi?: string;
        tanggal_dari?: string;
        tanggal_sampai?: string;
        sort_by?: string;
        sort_dir?: string;
    };
    unresolvedNotes?: string[];
}

export interface StokProdukJadiCreateProps {
    produkList: StokProdukOption[];
    pesananOptions: PesananOptionForPengiriman[];
    selectedId: number | null;
    selectedPesananId: number | null;
}

export interface StokProdukJadiShowProps {
    transaksi: StokProdukJadi;
}

export interface PengirimanItemRow {
    produk_id: number | '';
    qty: number | '';
    keterangan: string;
}

export interface PengirimanFormData {
    jenis_transaksi: 'pengiriman' | 'penyesuaian';
    pesanan_id: number | '';
    items: PengirimanItemRow[];
}
