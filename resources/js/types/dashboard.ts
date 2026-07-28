export interface FinancialStat {
    value: number;
    percentage: number | null;
}

export interface DashboardStats {
    totalPemasukan: FinancialStat;
    totalPengeluaran: FinancialStat;
    saldo: FinancialStat;
    pesananAktif: number;
    produksiBerjalan: number;
    selesaiProduksi: number;
}

export interface FinancialChartData {
    bulan: string;
    pemasukan: number;
    pengeluaran: number;
}

export interface BestSeller {
    nama_produk: string;
    total_qty: number;
}

export interface ActiveOrder {
    id: number;
    nomor_pesanan: string;
    nama_customer: string;
    status: string;
    status_produksi: string;
    tanggal: string;
    total: number;
    progress: number;
}

export interface TopEmployee {
    nama_karyawan: string;
    jabatan: string;
    total_output: number;
}

export interface OperationalIndicators {
    activeRework: number;
    failedQcQty: number;
    productionsWithShortage: number;
    outstandingReceivables: number;
    ordersNotFullyShipped: number;
}

export interface DashboardProps {
    stats: DashboardStats;
    financialChart: FinancialChartData[];
    bestSellers: BestSeller[];
    activeOrders: ActiveOrder[];
    topEmployees: TopEmployee[];
    operationalIndicators: OperationalIndicators;
    filter: string;
}
