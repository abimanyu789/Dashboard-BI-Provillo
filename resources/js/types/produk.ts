import type { BomCategorie, BomDetail, BomCategoryOption } from './bom';

export interface Produk {
    id: number;
    kode_produk: string;
    nama_produk: string;
    ukuran: string | null;
    warna: string | null;
    harga_jual: number | null;
    stok: number;
    minimum_stok: number | null;
    bom_category_id: number | null;
    created_at: string;
    updated_at: string;
    // Relasi
    bom_categorie?: BomCategorie & {
        bom_details: BomDetail[];
    };
    stok_history?: {
        id: number;
        jenis_transaksi: string;
        qty: number;
        stok_sebelum: number;
        stok_sesudah: number;
        keterangan: string | null;
        created_at: string;
    }[];
}

export interface ProdukFormData {
    kode_produk: string;
    nama_produk: string;
    ukuran: string;
    warna: string;
    harga_jual: number | null;
    stok: number;
    minimum_stok: number | null;
    bom_category_id: number | null;
}

export interface ProdukPagination {
    data: Produk[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export interface ProdukIndexProps {
    produks: ProdukPagination;
    filters: {
        search?: string;
        bom?: string;
        stock_status?: string;
        sort_by?: string;
        sort_dir?: string;
    };
}

export interface ProdukCreateProps {
    produk?: never;
    bomCategories: BomCategoryOption[];
}

export interface ProdukEditProps {
    produk: Produk;
    bomCategories: BomCategoryOption[];
}

export interface ProdukShowProps {
    produk: Produk;
}
