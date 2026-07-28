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
import { stokBahanTransaksiLabel } from '@/lib/domain-labels';
import produksiRoute from '@/routes/produksi';
import stokBahanBaku from '@/routes/stok-bahan-baku';
import type { JenisTransaksiStok, StokBahanBakuIndexProps } from '@/types';

export default function StokBahanBakuIndex({
    riwayat,
    bahanBakuOptions,
    filters,
}: StokBahanBakuIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [bahanBakuId, setBahanBakuId] = useState(filters.bahan_baku_id || '');
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
            stokBahanBaku.index.url(),
            {
                search: search || undefined,
                bahan_baku_id: bahanBakuId || undefined,
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

    const handleBahanBakuFilter = (value: string) => {
        const newVal = value === 'semua' ? '' : value;
        setBahanBakuId(newVal);
        navigate({ bahan_baku_id: newVal || undefined });
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
        setBahanBakuId('');
        setJenisTransaksi('');
        setTanggalDari('');
        setTanggalSampai('');
        router.get(stokBahanBaku.index.url(), {}, { preserveState: false });
    };

    const activeFilterCount = [
        bahanBakuId,
        jenisTransaksi,
        tanggalDari,
        tanggalSampai,
    ].filter(Boolean).length;
    const formatNumber = (value: number) =>
        new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const jenisBadge = (jenis: JenisTransaksiStok) => {
        const map: Record<
            JenisTransaksiStok,
            {
                label: string;
                variant: 'default' | 'secondary' | 'destructive' | 'outline';
            }
        > = {
            restock: { label: stokBahanTransaksiLabel('restock'), variant: 'default' },
            produksi: { label: stokBahanTransaksiLabel('produksi'), variant: 'secondary' },
            rollback: { label: stokBahanTransaksiLabel('rollback'), variant: 'outline' },
            penyesuaian: { label: stokBahanTransaksiLabel('penyesuaian'), variant: 'outline' },
        };
        const config = map[jenis] ?? {
            label: jenis,
            variant: 'outline' as const,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <>
            <Head title="Stok Bahan Baku" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Stok Bahan Baku
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Riwayat seluruh perubahan stok bahan baku
                        </p>
                    </div>
                    <Link href={stokBahanBaku.create.url()}>
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
                                    placeholder="Cari kode bahan, nama bahan, keterangan..."
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
                            {/* Filter Bahan Baku */}
                            <div className="w-56">
                                <SearchableCombobox
                                    items={[
                                        { value: 'semua', label: 'Semua Bahan Baku' },
                                        ...bahanBakuOptions.map((b) => ({
                                            value: String(b.id),
                                            label: `${b.kode_bahan} — ${b.nama_bahan}`,
                                        }))
                                    ]}
                                    value={bahanBakuId || 'semua'}
                                    onValueChange={(val) => handleBahanBakuFilter(String(val))}
                                    placeholder="Semua Bahan Baku"
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
                                    <SelectItem value="restock">
                                        Penambahan Stok
                                    </SelectItem>
                                    <SelectItem value="produksi">
                                        Pengeluaran untuk Produksi
                                    </SelectItem>
                                    <SelectItem value="rollback">
                                        Pengembalian dari Produksi
                                    </SelectItem>
                                    <SelectItem value="penyesuaian">
                                        Penyesuaian Stok
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
                                <TableHead>Bahan Baku</TableHead>
                                {sortableHead('jenis_transaksi', 'Jenis')}
                                {sortableHead('qty', 'Qty')}
                                {sortableHead('stok_sebelum', 'Stok Sebelum')}
                                {sortableHead('stok_sesudah', 'Stok Sesudah')}
                                <TableHead>Sumber</TableHead>
                                <TableHead>No. Produksi</TableHead>
                                <TableHead>Dicatat Oleh</TableHead>
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
                                        colSpan={12}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        Belum ada riwayat stok.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                riwayat.data.map((item, idx) => {
                                    const isPengurangan = Number(item.stok_sebelum) > Number(item.stok_sesudah);
                                    const qtyColor = isPengurangan ? 'text-destructive' : 'text-green-600 dark:text-green-400';
                                    const qtyDisplay = isPengurangan ? `-${formatNumber(item.qty)}` : `+${formatNumber(item.qty)}`;

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
                                                    {item.bahan_baku?.nama_bahan ??
                                                        '-'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {item.bahan_baku?.kode_bahan ??
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
                                                {formatNumber(item.stok_sebelum)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {formatNumber(item.stok_sesudah)}
                                            </TableCell>
                                            <TableCell className="max-w-44 text-sm text-muted-foreground">
                                                {item.sumber ?? '-'}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {item.produksi_id ? (
                                                    <Link
                                                        href={produksiRoute.show.url(
                                                            item.produksi_id,
                                                        )}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                    >
                                                        Produksi #{item.produksi_id}
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {item.dicatat_oleh ?? '-'}
                                            </TableCell>
                                            <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                                                {item.keterangan ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link
                                                    href={stokBahanBaku.show.url(
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

StokBahanBakuIndex.layout = {
    breadcrumbs: [
        { title: 'Stok', href: '#' },
        { title: 'Bahan Baku', href: stokBahanBaku.index.url() },
    ],
};
