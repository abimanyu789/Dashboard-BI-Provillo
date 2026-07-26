import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Eye,
    Plus,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
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
import stokProdukJadi from '@/routes/stok-produk-jadi';
import type { JenisTransaksiProduk, StokProdukJadiIndexProps } from '@/types';

export default function StokProdukJadiIndex({
    riwayat,
    produkOptions,
    filters,
}: StokProdukJadiIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [produkId, setProdukId] = useState(filters.produk_id || '');
    const [jenisTransaksi, setJenisTransaksi] = useState(
        filters.jenis_transaksi || '',
    );
    const [tanggalDari, setTanggalDari] = useState(filters.tanggal_dari || '');
    const [tanggalSampai, setTanggalSampai] = useState(
        filters.tanggal_sampai || '',
    );

    const sortBy = filters.sort_by || 'created_at';
    const sortDir = filters.sort_dir || 'desc';

    type SortableColumn =
        | 'created_at'
        | 'qty'
        | 'stok_sebelum'
        | 'stok_sesudah'
        | 'jenis_transaksi';

    const navigate = (overrides: Record<string, unknown> = {}) => {
        router.get(
            stokProdukJadi.index.url(),
            {
                search: search || undefined,
                produk_id: produkId || undefined,
                jenis_transaksi: jenisTransaksi || undefined,
                tanggal_dari: tanggalDari || undefined,
                tanggal_sampai: tanggalSampai || undefined,
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
        if (sortBy !== column) {
            return (
                <ChevronsUpDown className="ml-1 inline size-3.5 opacity-50" />
            );
        }

        return sortDir === 'asc' ? (
            <ChevronUp className="ml-1 inline size-3.5" />
        ) : (
            <ChevronDown className="ml-1 inline size-3.5" />
        );
    };

    const sortableHead = (column: SortableColumn, label: string) => (
        <TableHead
            className="cursor-pointer whitespace-nowrap select-none"
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

    const handleProdukFilter = (value: string) => {
        const newVal = value === 'semua' ? '' : value;
        setProdukId(newVal);
        navigate({ produk_id: newVal || undefined });
    };

    const handleJenisFilter = (value: string) => {
        const newVal = value === 'semua' ? '' : value;
        setJenisTransaksi(newVal);
        navigate({ jenis_transaksi: newVal || undefined });
    };

    const handleTanggalDari = (value: string) => {
        setTanggalDari(value);
        navigate({ tanggal_dari: value || undefined });
    };

    const handleTanggalSampai = (value: string) => {
        setTanggalSampai(value);
        navigate({ tanggal_sampai: value || undefined });
    };

    const handleReset = () => {
        setSearch('');
        setProdukId('');
        setJenisTransaksi('');
        setTanggalDari('');
        setTanggalSampai('');
        router.get(stokProdukJadi.index.url(), {}, { preserveState: false });
    };

    const activeFilterCount = [
        produkId,
        jenisTransaksi,
        tanggalDari,
        tanggalSampai,
    ].filter(Boolean).length;
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const jenisBadge = (jenis: JenisTransaksiProduk) => {
        const map: Record<
            JenisTransaksiProduk,
            {
                label: string;
                variant: 'default' | 'secondary' | 'destructive' | 'outline';
            }
        > = {
            produksi: { label: 'Produksi', variant: 'default' },
            pengiriman: { label: 'Pengiriman', variant: 'secondary' },
            rollback: { label: 'Rollback', variant: 'outline' },
            penyesuaian: { label: 'Penyesuaian', variant: 'outline' },
        };
        const config = map[jenis] ?? {
            label: jenis,
            variant: 'outline' as const,
        };

        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <>
            <Head title="Stok Produk Jadi" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Stok Produk Jadi
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Riwayat seluruh perubahan stok produk jadi
                        </p>
                    </div>
                    <Link href={stokProdukJadi.create.url()}>
                        <Button>
                            <Plus className="mr-2 size-4" />
                            Tambah Data
                        </Button>
                    </Link>
                </div>

                {/* Filter & Search */}
                <div className="rounded-xl border border-sidebar-border/70 bg-background p-4 dark:border-sidebar-border">
                    <div className="flex flex-col gap-3">
                        {/* Baris 1: Search */}
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Cari kode produk, nama produk, keterangan..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit" variant="secondary">
                                Cari
                            </Button>
                            {(search || activeFilterCount > 0) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleReset}
                                >
                                    Reset
                                </Button>
                            )}
                        </form>

                        {/* Baris 2: Filters */}
                        <div className="flex flex-wrap gap-2">
                            {/* Filter Produk */}
                            <div className="w-56">
                                <SearchableCombobox
                                    items={[
                                        { value: 'semua', label: 'Semua Produk' },
                                        ...produkOptions.map((p) => ({
                                            value: String(p.id),
                                            label: `${p.kode_produk} — ${p.nama_produk}`,
                                        }))
                                    ]}
                                    value={produkId || 'semua'}
                                    onValueChange={(val) => handleProdukFilter(String(val))}
                                    placeholder="Semua Produk"
                                />
                            </div>

                            {/* Filter Jenis Transaksi */}
                            <Select
                                value={jenisTransaksi || 'semua'}
                                onValueChange={handleJenisFilter}
                            >
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Semua Jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="semua">
                                        Semua Jenis
                                    </SelectItem>
                                    <SelectItem value="produksi">
                                        Produksi
                                    </SelectItem>
                                    <SelectItem value="pengiriman">
                                        Pengiriman
                                    </SelectItem>
                                    <SelectItem value="rollback">
                                        Rollback
                                    </SelectItem>
                                    <SelectItem value="penyesuaian">
                                        Penyesuaian
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Filter Tanggal Dari */}
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">
                                    Dari
                                </span>
                                <Input
                                    type="date"
                                    value={tanggalDari}
                                    onChange={(e) =>
                                        handleTanggalDari(e.target.value)
                                    }
                                    className="w-40"
                                />
                            </div>

                            {/* Filter Tanggal Sampai */}
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">
                                    Sampai
                                </span>
                                <Input
                                    type="date"
                                    value={tanggalSampai}
                                    onChange={(e) =>
                                        handleTanggalSampai(e.target.value)
                                    }
                                    className="w-40"
                                />
                            </div>

                            {activeFilterCount > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="self-center"
                                >
                                    {activeFilterCount} filter aktif
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabel */}
                <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                {sortableHead('created_at', 'Tanggal')}
                                <TableHead>Produk</TableHead>
                                {sortableHead('jenis_transaksi', 'Jenis')}
                                {sortableHead('qty', 'Qty')}
                                {sortableHead('stok_sebelum', 'Stok Sebelum')}
                                {sortableHead('stok_sesudah', 'Stok Sesudah')}
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="w-16 text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {riwayat.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        Belum ada riwayat stok.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                riwayat.data.map((item, idx) => {
                                    const isPengurangan = Number(item.stok_sebelum) > Number(item.stok_sesudah);
                                    const qtyColor = isPengurangan ? 'text-destructive' : 'text-green-600 dark:text-green-400';
                                    const qtyDisplay = isPengurangan ? `-${item.qty}` : `+${item.qty}`;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-muted-foreground">
                                                {(riwayat.current_page - 1) *
                                                    riwayat.per_page +
                                                    idx +
                                                    1}
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {formatDate(item.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {item.produk?.nama_produk ??
                                                        '-'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {item.produk?.kode_produk ??
                                                        '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {jenisBadge(item.jenis_transaksi)}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono font-medium ${qtyColor}`}>
                                                {qtyDisplay}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {item.stok_sebelum}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {item.stok_sesudah}
                                            </TableCell>
                                            <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                                                {item.keterangan ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link
                                                    href={stokProdukJadi.show.url(
                                                        item.id,
                                                    )}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {riwayat.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan {riwayat.from ?? 0}–
                                {riwayat.to ?? 0} dari {riwayat.total} data
                            </p>
                            <div className="flex gap-1">
                                {riwayat.links.map((link, i) => (
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
                                                {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                },
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

StokProdukJadiIndex.layout = {
    breadcrumbs: [
        { title: 'Stok', href: '#' },
        { title: 'Produk Jadi', href: stokProdukJadi.index.url() },
    ],
};
