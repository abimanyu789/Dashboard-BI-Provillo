import type { Customer } from './customer';
import type { DetailPesanan, Pesanan } from './pesanan';

export type StatusProduksi = 'draft' | 'proses' | 'selesai' | 'dibatalkan';
export type StatusQc = 'belum_dicek' | 'lolos' | 'tidak_lolos';
export type JenisProduksi = 'pesanan' | 'restok';
export type QcStatus = 'lolos' | 'tidak_lolos';
export type QcDisposition = 'rework' | 'jual_cacat' | 'dimusnahkan';
export type MaterialMovementType =
    | 'planned'
    | 'issued'
    | 'consumed'
    | 'additional'
    | 'returned'
    | 'adjustment';
export type MaterialStatus = 'sufficient' | 'shortage' | 'fulfilled';

export interface ProduksiItem {
    id: number;
    produksi_id: number;
    produk_id: number;
    qty_target: number;
    produk?: {
        id: number;
        kode_produk: string;
        nama_produk: string;
    };
}

export interface ProduksiKaryawan {
    id: number;
    produksi_id: number;
    karyawan_id: number;
    karyawan?: {
        id: number;
        nama_karyawan: string;
        jabatan: string | null;
    };
}

export interface StokProdukCacat {
    id: number;
    detail_produksi_id: number;
    disposisi: Exclude<QcDisposition, 'rework'>;
    qty: number;
}

export interface DetailProduksi {
    id: number;
    produksi_id: number;
    produk_id: number;
    karyawan_id: number | null;
    qty_selesai: number;
    qc_status: QcStatus;
    alasan_qc: string | null;
    disposisi_qc: QcDisposition | null;
    rework_parent_id: number | null;
    catatan: string | null;
    inspected_by: number | null;
    inspected_at: string | null;
    created_at: string;
    updated_at: string;
    produk?: {
        id: number;
        kode_produk: string;
        nama_produk: string;
    };
    karyawan?: {
        id: number;
        nama_karyawan: string;
        jabatan: string | null;
    } | null;
    inspector?: {
        id: number;
        name: string;
    } | null;
    rework_results?: DetailProduksi[];
    defect_ledger?: StokProdukCacat | null;
}

export interface MaterialMovement {
    id: number;
    produksi_id: number;
    bahan_baku_id: number;
    movement_type: MaterialMovementType;
    qty: number;
    tanggal: string;
    keterangan: string | null;
    created_at: string;
    bahan_baku?: {
        id: number;
        kode_bahan: string;
        nama_bahan: string;
        satuan: string | null;
    };
    created_by?: {
        id: number;
        name: string;
    };
    stok_history?: {
        id: number;
        stok_sebelum: number;
        stok_sesudah: number;
    } | null;
}

export interface Produksi {
    id: number;
    pesanan_id: number | null;
    created_by: number;
    jenis_produksi: JenisProduksi;
    deadline: string | null;
    qty_target: number;
    qty_selesai: number;
    status: StatusProduksi;
    status_qc: StatusQc;
    catatan: string | null;
    created_at: string;
    updated_at: string;
    pesanan?: Pesanan & { customer?: Customer };
    produksi_items?: ProduksiItem[];
    produksi_karyawans?: ProduksiKaryawan[];
    detail_produksi?: DetailProduksi[];
    material_movements?: MaterialMovement[];
    defect_ledgers?: StokProdukCacat[];
}

export interface ProgressPerProduk {
    [produkId: number]: {
        lolos: number;
        tidak_lolos: number;
        target: number;
        selesai: boolean;
    };
}

export interface ProdukBelumSelesai {
    id: number;
    kode_produk: string;
    nama_produk: string;
    qty_target: number;
    qty_lolos: number;
    sisa: number;
}

export interface KebutuhanBahan {
    id: number;
    kode_bahan: string;
    nama_bahan: string;
    satuan: string;
    kebutuhan: number;
    stok_tersedia: number;
    cukup: boolean;
}

export interface MaterialSummary {
    id: number;
    kode_bahan: string;
    nama_bahan: string;
    satuan: string;
    planned: number;
    available: number;
    issued: number;
    consumed: number;
    returned: number;
    shortage: number;
    returnable: number;
    status: MaterialStatus;
}

export interface MaterialOption {
    id: number;
    kode_bahan: string;
    nama_bahan: string;
    satuan: string | null;
    stok: number;
}

export interface ActiveRework {
    id: number;
    produk_id: number;
    produk?: ProduksiItem['produk'];
    karyawan?: ProduksiKaryawan['karyawan'] | null;
    qty_gagal: number;
    qty_diproses: number;
    qty_aktif: number;
    alasan_qc: string | null;
    created_at: string;
}

export interface QcSummary {
    lolos: number;
    tidak_lolos: number;
    jual_cacat: number;
    dimusnahkan: number;
    rework_aktif: number;
}

export interface WageBasis {
    karyawan_id: number;
    nama: string;
    qty_lolos: number;
}

export interface ProduksiItemRestokFormData {
    produk_id: number | '';
    qty_target: number | '';
}

export interface ProduksiFormData {
    jenis_produksi: JenisProduksi;
    pesanan_id: number | '';
    items: ProduksiItemRestokFormData[];
    karyawan_ids: number[];
    deadline: string;
    catatan: string;
}

export interface InputProgressFormData {
    produk_id: number | '';
    karyawan_id: number | '';
    qty: number | '';
    qc_status: QcStatus;
    alasan_qc: string;
    disposisi_qc: QcDisposition | '';
    rework_parent_id: number | '';
    catatan: string;
    idempotency_key: string;
}

export interface MaterialMovementFormData {
    bahan_baku_id: number | '';
    movement_type: Exclude<MaterialMovementType, 'planned'>;
    qty: number | '';
    tanggal: string;
    keterangan: string;
    idempotency_key: string;
}

export interface PesananOption {
    id: number;
    nomor_pesanan: string;
    status: string;
    tanggal: string;
    total: string;
    customer?: Customer;
}

export interface ProduksiProdukOption {
    id: number;
    kode_produk: string;
    nama_produk: string;
    stok: number;
}

export interface KaryawanOption {
    id: number;
    nama_karyawan: string;
    jabatan: string | null;
}

export interface ProduksiSummary {
    batch_hari_ini: number;
    qty_selesai_hari_ini: number;
    karyawan_produktif: {
        nama: string;
        total_qty: number;
        kontribusi: number;
    } | null;
    efisiensi: {
        qty_selesai: number;
        qty_target: number;
        persentase: number;
    };
}

export interface ProduksiPagination {
    data: Produksi[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface ProduksiIndexProps {
    produksis: ProduksiPagination;
    summary: ProduksiSummary;
    filters: {
        search?: string;
        status?: string;
        sort_by?: string;
        sort_dir?: string;
    };
}

export interface ProduksiCreateProps {
    pesananValid: PesananOption[];
    produkList: ProduksiProdukOption[];
    karyawanList: KaryawanOption[];
    selectedPesanan:
        | (Pesanan & {
              customer?: Customer;
              detail_pesanan?: DetailPesanan[];
          })
        | null;
    kebutuhanBahan: KebutuhanBahan[];
}

export interface ProduksiShowProps {
    produksi: Produksi;
    kebutuhanBahan: KebutuhanBahan[];
    stokCukup: boolean;
    progressPerProduk: ProgressPerProduk;
    produkBelumSelesai: ProdukBelumSelesai[];
    materialSummary: MaterialSummary[];
    materialOptions: MaterialOption[];
    activeRework: ActiveRework[];
    qcSummary: QcSummary;
    wageBasis: WageBasis[];
}
