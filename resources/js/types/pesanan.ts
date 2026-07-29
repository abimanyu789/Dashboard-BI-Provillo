import type { Customer } from './customer';
import type { Pembayaran } from './pembayaran';
import type { Produk } from './produk';

export type StatusPesanan = 'pending' | 'proses' | 'selesai' | 'dibatalkan';
export type TipeDiskon = 'persen' | 'nominal';

export interface DetailPesanan {
    id: number;
    pesanan_id: number;
    produk_id: number;
    qty: number;
    harga: string;
    subtotal: string;
    created_at: string;
    updated_at: string;
    // Relasi
    produk?: Produk;
}

export type JenisPembayaranPesanan =
    'dp' | 'lunas' | 'bertahap' | 'cod' | 'termin';

export interface Pesanan {
    id: number;
    customer_id: number;
    nomor_pesanan: string;
    tanggal: string;
    status: StatusPesanan;
    status_pembayaran?: 'belum_bayar' | 'sebagian' | 'lunas';
    jenis_pembayaran: JenisPembayaranPesanan | null;
    subtotal: string;
    diskon: string;
    ongkir: string;
    total: string;
    keterangan: string | null;
    created_by: number | { id: number; nama: string };
    created_at: string;
    updated_at: string;
    // Relasi
    customer?: Customer;
    created_by_user?: { id: number; nama: string };
    detail_pesanan?: DetailPesanan[];
    pembayarans?: Pembayaran[];
}

// ─── Form data ───────────────────────────────────────────────────────────────

export interface PesananItemFormData {
    produk_id: number | '';
    qty: number | '';
    harga: number | '';
}

export interface PesananFormData {
    customer_id: number | '';
    tanggal: string;
    jenis_pembayaran: JenisPembayaranPesanan | '';
    items: PesananItemFormData[];
    tipe_diskon: TipeDiskon;
    diskon: number | '';
    catatan_diskon: string;
    ongkir: number | '';
    keterangan: string;
}

// ─── Props interfaces ─────────────────────────────────────────────────────────

export interface PesananPagination {
    data: Pesanan[];
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

export interface PesananIndexProps {
    pesanans: PesananPagination;
    filters: {
        search?: string;
        status?: string;
        status_pembayaran?: string;
        sort_by?: string;
        sort_dir?: string;
    };
}

export interface CustomerOption {
    id: number;
    nama_customer: string;
    jenis_customer: string;
}

export interface PesananProdukOption {
    id: number;
    kode_produk: string;
    nama_produk: string;
    harga_jual: string | null;
    stok: number;
}

export interface PesananCreateProps {
    customers: CustomerOption[];
    produks: PesananProdukOption[];
}

export interface PesananEditProps {
    pesanan: Pesanan;
    customers: CustomerOption[];
    produks: PesananProdukOption[];
}

export type StatusPembayaran = 'belum_bayar' | 'sebagian' | 'lunas';
export type StatusPengirimanItem = 'belum' | 'sebagian' | 'lengkap';

export interface RingkasanPembayaran {
    total: number;
    total_dibayar: number;
    sisa_tagihan: number;
    status_pembayaran: StatusPembayaran;
}

export interface ProgressPengirimanItem {
    produk_id: number;
    kode_produk: string | null;
    nama_produk: string | null;
    qty_pesan: number;
    qty_dikirim: number;
    qty_sisa: number;
    percent: number;
    status: StatusPengirimanItem;
}

export interface ProgressPengiriman {
    overall: {
        qty_pesan: number;
        qty_dikirim: number;
        qty_sisa: number;
        percent: number;
    };
    items: ProgressPengirimanItem[];
}

export interface PesananShowProps {
    pesanan: Pesanan;
    statusTransisi: StatusPesanan[];
    ringkasanPembayaran: RingkasanPembayaran;
    progressPengiriman: ProgressPengiriman;
}
