import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Eye,
    Plus,
    Search,
    TrendingUp,
    User,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { ProduksiStatusBadge } from '@/components/produksi/produksi-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import produksi from '@/routes/produksi';
import type { ProduksiIndexProps } from '@/types';

export default function ProduksiIndex({
    produksis,
    summary,
    filters,
}: ProduksiIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const sortBy = filters.sort_by || 'created_at';
    const sortDir = filters.sort_dir || 'desc';

    type SortableColumn =
        'created_at' | 'deadline' | 'qty_target' | 'qty_selesai' | 'status';

    const navigate = (overrides: Record<string, unknown> = {}) => {
        router.get(
            produksi.index.url(),
            {
                search: search || undefined,
                status: status || undefined,
                sort_by: sortBy,
                sort_dir: sortDir,
                ...overrides,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSort = (column: SortableColumn) => {
        const newDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        navigate({ sort_by: column, sort_dir: newDir });
    };

    const SortIcon = ({ column }: { column: SortableColumn }) => {
        if (sortBy !== column)
            return (
                <ChevronsUpDown className="ml-1 inline size-3.5 opacity-50" />
            );
        return sortDir === 'asc' ? (
            <ChevronUp className="ml-1 inline size-3.5" />
        ) : (
            <ChevronDown className="ml-1 inline size-3.5" />
        );
    };

    const sortableHead = (
        column: SortableColumn,
        label: string,
        className?: string,
    ) => (
        <TableHead
            className={`cursor-pointer whitespace-nowrap select-none hover:bg-muted/50 ${className ?? ''}`}
            onClick={() => handleSort(column)}
        >
            {label}
            <SortIcon column={column} />
        </TableHead>
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate({ search: search || undefined });
    };

    const handleStatusFilter = (value: string) => {
        const newVal = value === 'semua' ? '' : value;
        setStatus(newVal);
        navigate({ status: newVal || undefined });
    };

    const handleReset = () => {
        setSearch('');
        setStatus('');
        router.get(produksi.index.url(), {}, { preserveState: false });
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const activeFilterCount = [status].filter(Boolean).length;

    return (
        <>
            <Head title="Produksi" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Produksi
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola proses produksi berdasarkan pesanan
                        </p>
                    </div>
                    <Link href={produksi.create.url()}>
                        <Button>
                            <Plus className="mr-2 size-4" />
                            Buat Produksi
                        </Button>
                    </Link>
                </div>

                {/* Summary Cards — dinamis dari backend */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {/* Card 1 — Produksi Hari Ini */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Produksi Hari Ini
                            </CardTitle>
                            <Wrench className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {summary.qty_selesai_hari_ini}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {summary.batch_hari_ini} batch produksi hari ini
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 2 — Karyawan Paling Produktif */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Karyawan Paling Produktif
                            </CardTitle>
                            <User className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {summary.karyawan_produktif ? (
                                <>
                                    <p className="truncate text-2xl font-bold">
                                        {summary.karyawan_produktif.nama}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>
                                                {
                                                    summary.karyawan_produktif
                                                        .total_qty
                                                }{' '}
                                                pcs (30 hari)
                                            </span>
                                            <span>
                                                {
                                                    summary.karyawan_produktif
                                                        .kontribusi
                                                }
                                                %
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-primary"
                                                style={{
                                                    width: `${summary.karyawan_produktif.kontribusi}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada data
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card 3 — Efisiensi Produksi */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Efisiensi Produksi
                            </CardTitle>
                            <TrendingUp className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {summary.efisiensi.persentase}%
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {summary.efisiensi.qty_selesai} /{' '}
                                {summary.efisiensi.qty_target} pcs produksi
                                aktif
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-1 items-center gap-2"
                    >
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari nomor pesanan atau nama customer..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">
                            Cari
                        </Button>
                    </form>

                    <Select
                        value={status || 'semua'}
                        onValueChange={handleStatusFilter}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua Status</SelectItem>
                            <SelectItem value="draft">Belum Dimulai</SelectItem>
                            <SelectItem value="proses">
                                Sedang Diproduksi
                            </SelectItem>
                            <SelectItem value="selesai">Selesai</SelectItem>
                            <SelectItem value="dibatalkan">
                                Dibatalkan
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {(search || activeFilterCount > 0) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={handleReset}
                        >
                            Reset filter
                        </Button>
                    )}
                </div>

                {/* Tabel */}
                <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Pesanan</TableHead>
                                <TableHead>Customer</TableHead>
                                {sortableHead('status', 'Status')}
                                {sortableHead(
                                    'qty_target',
                                    'Target',
                                    'text-right',
                                )}
                                {sortableHead(
                                    'qty_selesai',
                                    'Selesai',
                                    'text-right',
                                )}
                                {sortableHead('deadline', 'Deadline')}
                                <TableHead className="w-16 text-center">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {produksis.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {search || status
                                            ? 'Tidak ada data yang ditemukan.'
                                            : 'Belum ada data produksi.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                produksis.data.map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-muted-foreground">
                                            {(produksis.current_page - 1) *
                                                produksis.per_page +
                                                idx +
                                                1}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm font-medium">
                                            {item.pesanan?.nomor_pesanan ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            {item.pesanan?.customer
                                                ?.nama_customer ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            <ProduksiStatusBadge
                                                status={item.status}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {item.qty_target}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {item.qty_selesai}
                                        </TableCell>
                                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                                            {formatDate(item.deadline)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Link
                                                href={produksi.show.url(
                                                    item.id,
                                                )}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                >
                                                    <Eye className="size-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {produksis.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan {produksis.from ?? 0}–
                                {produksis.to ?? 0} dari {produksis.total} data
                            </p>
                            <div className="flex gap-1">
                                {produksis.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() =>
                                            link.url &&
                                            router.get(
                                                link.url,
                                                {},
                                                { preserveState: true },
                                            )
                                        }
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ProduksiIndex.layout = {
    breadcrumbs: [{ title: 'Produksi', href: produksi.index.url() }],
};
