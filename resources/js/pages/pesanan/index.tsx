import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PesananDeleteDialog } from '@/components/pesanan/pesanan-delete-dialog';
import { PesananStatusBadge } from '@/components/pesanan/pesanan-status-badge';
import { Button } from '@/components/ui/button';
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
import pesanan from '@/routes/pesanan';
import type { PesananIndexProps, StatusPesanan } from '@/types';

export default function PesananIndex({ pesanans, filters }: PesananIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const sortBy  = filters.sort_by  || 'created_at';
    const sortDir = filters.sort_dir || 'desc';

    type SortableColumn = 'nomor_pesanan' | 'tanggal' | 'total' | 'status' | 'created_at';

    const navigate = (overrides: Record<string, unknown> = {}) => {
        router.get(
            pesanan.index.url(),
            {
                search:   search || undefined,
                status:   status || undefined,
                sort_by:  sortBy,
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
        if (sortBy !== column) return <ChevronsUpDown className="ml-1 inline size-3.5 opacity-50" />;
        return sortDir === 'asc'
            ? <ChevronUp className="ml-1 inline size-3.5" />
            : <ChevronDown className="ml-1 inline size-3.5" />;
    };

    const sortableHead = (column: SortableColumn, label: string, className?: string) => (
        <TableHead
            className={`cursor-pointer select-none whitespace-nowrap hover:bg-muted/50 ${className ?? ''}`}
            onClick={() => handleSort(column)}
        >
            {label}<SortIcon column={column} />
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
        router.get(pesanan.index.url(), {}, { preserveState: false });
    };

    const formatRupiah = (value: string | number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(Number(value));

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

    const activeFilterCount = [status].filter(Boolean).length;

    return (
        <>
            <Head title="Pesanan" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pesanan</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola pesanan dan status pengiriman
                        </p>
                    </div>
                    <Link href={pesanan.create.url()}>
                        <Button>
                            <Plus className="mr-2 size-4" />
                            Buat Pesanan
                        </Button>
                    </Link>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Cari nomor pesanan atau nama customer..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">Cari</Button>
                    </form>

                    <Select value={status || 'semua'} onValueChange={handleStatusFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="proses">Proses</SelectItem>
                            <SelectItem value="selesai">Selesai</SelectItem>
                            <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                        </SelectContent>
                    </Select>

                    {(search || activeFilterCount > 0) && (
                        <Button variant="ghost" size="sm" onClick={handleReset}
                            className="text-muted-foreground">
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
                                {sortableHead('nomor_pesanan', 'Nomor Pesanan')}
                                <TableHead>Customer</TableHead>
                                {sortableHead('tanggal', 'Tanggal')}
                                {sortableHead('status', 'Status')}
                                <TableHead>Status Pembayaran</TableHead>
                                {sortableHead('total', 'Total', 'text-right')}
                                <TableHead className="w-28 text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pesanans.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        {search || status ? 'Tidak ada data yang ditemukan.' : 'Belum ada pesanan.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pesanans.data.map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-muted-foreground">
                                            {(pesanans.current_page - 1) * pesanans.per_page + idx + 1}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm font-medium">
                                            {item.nomor_pesanan}
                                        </TableCell>
                                        <TableCell>
                                            {item.customer?.nama_customer ?? '-'}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm">
                                            {formatDate(item.tanggal)}
                                        </TableCell>
                                        <TableCell>
                                            <PesananStatusBadge status={item.status} />
                                        </TableCell>
                                        <TableCell>
                                            <span className={
                                                item.status_pembayaran === 'lunas'
                                                    ? 'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400'
                                                    : item.status_pembayaran === 'sebagian'
                                                    ? 'inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                                    : 'inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                                            }>
                                                {item.status_pembayaran === 'lunas'
                                                    ? 'Lunas'
                                                    : item.status_pembayaran === 'sebagian'
                                                    ? 'Sebagian'
                                                    : 'Belum Bayar'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-medium">
                                            {formatRupiah(item.total)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1">
                                                <Link href={pesanan.show.url(item.id)}>
                                                    <Button variant="ghost" size="icon" className="size-8">
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </Link>
                                                {!['selesai', 'dibatalkan'].includes(item.status) && (
                                                    <Link href={pesanan.edit.url(item.id)}>
                                                        <Button variant="ghost" size="icon" className="size-8">
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                                {!['selesai', 'dibatalkan'].includes(item.status) && (
                                                    <PesananDeleteDialog pesanan={item} />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pesanans.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan {pesanans.from ?? 0}–{pesanans.to ?? 0} dari {pesanans.total} data
                            </p>
                            <div className="flex gap-1">
                                {pesanans.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
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

PesananIndex.layout = {
    breadcrumbs: [
        { title: 'Pesanan', href: pesanan.index.url() },
    ],
};
