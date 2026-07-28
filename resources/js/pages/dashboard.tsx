import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    CircleDollarSign,
    DollarSign,
    PackageCheck,
    RotateCcw,
    ShoppingCart,
    Target,
    Truck,
    Wallet,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { BestSellersChart } from '@/components/dashboard/best-sellers-chart';
import { FinancialChart } from '@/components/dashboard/financial-chart';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';
import type { DashboardProps } from '@/types';

export default function Dashboard({
    stats,
    financialChart,
    bestSellers,
    activeOrders,
    topEmployees,
    operationalIndicators,
    filter,
}: DashboardProps) {
    const queryStartDate =
        new URLSearchParams(
            typeof window !== 'undefined' ? window.location.search : '',
        ).get('start_date') || '';
    const queryEndDate =
        new URLSearchParams(
            typeof window !== 'undefined' ? window.location.search : '',
        ).get('end_date') || '';

    const [localStart, setLocalStart] = useState(queryStartDate);
    const [localEnd, setLocalEnd] = useState(queryEndDate);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const handleFilterChange = (value: string) => {
        if (value !== 'range') {
            router.get(
                dashboard.url(),
                { filter: value },
                { preserveState: true },
            );
        } else {
            router.get(
                dashboard.url(),
                { filter: 'range', start_date: localStart, end_date: localEnd },
                { preserveState: true },
            );
        }
    };

    const applyRange = (s: string, e: string) => {
        setLocalStart(s);
        setLocalEnd(e);

        if (s && e) {
            router.get(
                dashboard.url(),
                { filter: 'range', start_date: s, end_date: e },
                { preserveState: true },
            );
        }
    };

    const getFilterLabel = () => {
        switch (filter) {
            case 'tahun_ini':
                return 'Tahun ini';
            case 'semua':
                return 'Semua waktu';
            case 'range':
                return 'Rentang waktu';
            case 'bulan_ini':
            default:
                return 'Bulan ini';
        }
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Dashboard Overview
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Ringkasan operasional Provillo
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {filter === 'range' && (
                            <div className="flex h-9 items-center gap-2 rounded-md border border-sidebar-border bg-background px-2 shadow-sm">
                                <input
                                    type="date"
                                    value={localStart}
                                    onChange={(e) =>
                                        applyRange(e.target.value, localEnd)
                                    }
                                    className="h-full w-auto max-w-[120px] bg-transparent text-sm outline-none"
                                />
                                <span className="text-xs text-muted-foreground">
                                    -
                                </span>
                                <input
                                    type="date"
                                    value={localEnd}
                                    onChange={(e) =>
                                        applyRange(localStart, e.target.value)
                                    }
                                    className="h-full w-auto max-w-[120px] bg-transparent text-sm outline-none"
                                />
                            </div>
                        )}
                        <Select
                            value={filter}
                            onValueChange={handleFilterChange}
                        >
                            <SelectTrigger className="h-9 w-[160px]">
                                <SelectValue placeholder="Pilih Periode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bulan_ini">
                                    Bulan Ini
                                </SelectItem>
                                <SelectItem value="tahun_ini">
                                    Tahun Ini
                                </SelectItem>
                                <SelectItem value="semua">
                                    Semua Waktu
                                </SelectItem>
                                <SelectItem value="range">
                                    Range Tanggal
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Link
                            href="/laporan"
                            className="hidden items-center gap-2 rounded-md border border-sidebar-border/70 bg-background px-4 py-1.5 text-sm font-medium hover:bg-accent sm:flex"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                <path d="M8 13h2" />
                                <path d="M8 17h2" />
                                <path d="M14 13h2" />
                                <path d="M14 17h2" />
                            </svg>
                            Pusat Laporan
                        </Link>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        title="Total Pemasukan"
                        value={formatCurrency(stats.totalPemasukan.value)}
                        icon={DollarSign}
                        iconClassName="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-500"
                        trend={
                            stats.totalPemasukan.percentage !== null
                                ? stats.totalPemasukan.percentage >= 0
                                    ? 'up'
                                    : 'down'
                                : 'neutral'
                        }
                        trendValue={
                            stats.totalPemasukan.percentage !== null
                                ? `${Math.abs(stats.totalPemasukan.percentage).toFixed(1)}% vs ${filter === 'tahun_ini' ? 'tahun lalu' : filter === 'range' ? 'periode sebelumnya' : 'bulan lalu'}`
                                : getFilterLabel()
                        }
                    />
                    <StatCard
                        title="Total Pengeluaran"
                        value={formatCurrency(stats.totalPengeluaran.value)}
                        icon={ArrowDownRight}
                        iconClassName="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-500"
                        trend={
                            stats.totalPengeluaran.percentage !== null
                                ? stats.totalPengeluaran.percentage > 0
                                    ? 'down'
                                    : 'up'
                                : 'neutral'
                        }
                        trendValue={
                            stats.totalPengeluaran.percentage !== null
                                ? `${Math.abs(stats.totalPengeluaran.percentage).toFixed(1)}% vs ${filter === 'tahun_ini' ? 'tahun lalu' : filter === 'range' ? 'periode sebelumnya' : 'bulan lalu'}`
                                : getFilterLabel()
                        }
                    />
                    <StatCard
                        title="Saldo Kas"
                        value={formatCurrency(stats.saldo.value)}
                        icon={Wallet}
                        iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-500"
                        trend={
                            stats.saldo.percentage !== null
                                ? stats.saldo.percentage >= 0
                                    ? 'up'
                                    : 'down'
                                : 'neutral'
                        }
                        trendValue={
                            stats.saldo.percentage !== null
                                ? `${Math.abs(stats.saldo.percentage).toFixed(1)}% vs ${filter === 'tahun_ini' ? 'tahun lalu' : filter === 'range' ? 'periode sebelumnya' : 'bulan lalu'}`
                                : 'Sepanjang waktu'
                        }
                    />
                    <StatCard
                        title="Pesanan Aktif"
                        value={stats.pesananAktif}
                        icon={ShoppingCart}
                        iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-500"
                        trendValue="Pending & Proses"
                    />
                    <StatCard
                        title="Produksi Berjalan"
                        value={stats.produksiBerjalan}
                        icon={Wrench}
                        iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-500"
                        trendValue="Status Proses"
                    />
                    <StatCard
                        title="Selesai Produksi"
                        value={`${stats.selesaiProduksi} unit`}
                        icon={Target}
                        iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-500"
                        trendValue={getFilterLabel()}
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                        {
                            label: 'Perbaikan Ulang aktif',
                            value: `${operationalIndicators.activeRework} pcs`,
                            icon: RotateCcw,
                        },
                        {
                            label: 'Gagal QC',
                            value: `${operationalIndicators.failedQcQty} pcs`,
                            icon: AlertTriangle,
                        },
                        {
                            label: 'Produksi kekurangan bahan',
                            value: operationalIndicators.productionsWithShortage,
                            icon: PackageCheck,
                        },
                        {
                            label: 'Piutang customer',
                            value: formatCurrency(
                                operationalIndicators.outstandingReceivables,
                            ),
                            icon: CircleDollarSign,
                        },
                        {
                            label: 'Pesanan belum terkirim penuh',
                            value: operationalIndicators.ordersNotFullyShipped,
                            icon: Truck,
                        },
                    ].map((indicator) => (
                        <div
                            key={indicator.label}
                            className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-background p-4 dark:border-sidebar-border"
                        >
                            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                                <indicator.icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs text-muted-foreground">
                                    {indicator.label}
                                </p>
                                <p className="truncate font-semibold">
                                    {indicator.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <FinancialChart data={financialChart} />
                    <BestSellersChart data={bestSellers} />
                </div>

                {/* Bottom Panels */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Active Orders Progress */}
                    <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                        <h3 className="mb-4 text-lg font-semibold">
                            Active Orders Progress
                        </h3>
                        {activeOrders.length === 0 ? (
                            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                Tidak ada pesanan aktif
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="space-y-2 rounded-lg border border-sidebar-border/50 p-4"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium">
                                                    {order.nomor_pesanan}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {order.nama_customer}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge
                                                    variant={
                                                        order.status ===
                                                        'proses'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {order.status}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {order.status_produksi}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Progress Produksi</span>
                                                <span>{order.progress}%</span>
                                            </div>
                                            <Progress
                                                value={order.progress}
                                                className="h-2"
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>
                                                {formatDate(order.tanggal)}
                                            </span>
                                            <span>
                                                {formatCurrency(order.total)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top Employee Performance */}
                    <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                        <h3 className="mb-4 text-lg font-semibold">
                            Top Employee Performance
                        </h3>
                        {topEmployees.length === 0 ? (
                            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                Belum ada data produksi
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {topEmployees.map((employee, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {employee.nama_karyawan}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {employee.jabatan}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">
                                                {employee.total_output}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                unit
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
