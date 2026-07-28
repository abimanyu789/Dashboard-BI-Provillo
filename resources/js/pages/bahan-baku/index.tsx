import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Eye,
    Pencil,
    Plus,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { BahanBakuDeleteDialog } from '@/components/bahan-baku/bahan-baku-delete-dialog';
import { ExportImportMenu } from '@/components/shared/export-import-menu';
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
import {
    stockLevelBadgeClass,
    stockLevelFilterOptions,
    stockLevelLabel,
    stockLevelStatus,
} from '@/lib/utils';
import type { StockLevelStatus } from '@/lib/utils';
import bahanBaku from '@/routes/bahan-baku';
import type { BahanBakuIndexProps } from '@/types';

export default function BahanBakuIndex({
    bahanBakus,
    filters,
    satuanOptions,
}: BahanBakuIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [satuan, setSatuan] = useState(filters.satuan || '');
    const [stockStatus, setStockStatus] = useState(filters.stock_status || '');

    const sortBy = filters.sort_by || 'created_at';
    const sortDir = filters.sort_dir || 'desc';

    type SortableColumn =
        | 'kode_bahan'
        | 'nama_bahan'
        | 'satuan'
        | 'stok'
        | 'minimum_stok'
        | 'created_at';

    const navigate = (overrides: Record<string, unknown> = {}) => {
        router.get(
            bahanBaku.index.url(),
            {
                search,
                satuan: satuan || undefined,
                stock_status: stockStatus || undefined,
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
                <ChevronsUpDown className="ml-1 inline size-3.5 text-muted-foreground/50" />
            );
        }

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
            className={`cursor-pointer select-none hover:bg-muted/50 ${className ?? ''}`}
            onClick={() => handleSort(column)}
        >
            {label}
            <SortIcon column={column} />
        </TableHead>
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate();
    };

    const handleSatuanFilter = (value: string) => {
        const newSatuan = value === 'semua' ? '' : value;
        setSatuan(newSatuan);
        navigate({ satuan: newSatuan || undefined });
    };

    const handleStockStatusFilter = (value: string) => {
        const next = value === 'semua' ? '' : value;
        setStockStatus(next);
        navigate({ stock_status: next || undefined });
    };

    const formatNumber = (value: number | null) => {
        if (value === null) {
            return '-';
        }

        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const stockStatusBadge = (status: StockLevelStatus) => (
        <span className={stockLevelBadgeClass(status)}>
            {stockLevelLabel(status)}
        </span>
    );

    // Hitung filter aktif untuk badge
    const activeFilterCount = [satuan, stockStatus].filter(Boolean).length;

    return (
        <>
            <Head title="Data Master - Bahan Baku" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Data Master - Bahan Baku
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola data bahan baku untuk produksi
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ExportImportMenu
                            exportExcelUrl={`${bahanBaku.export.url()}?format=excel`}
                            exportPdfUrl={`${bahanBaku.export.url()}?format=pdf`}
                            importUrl={bahanBaku.import.url()}
                            templateUrl={bahanBaku.template.url()}
                            modelName="Bahan Baku"
                        />
                        <Link href={bahanBaku.create()}>
                            <Button>
                                <Plus className="mr-2 size-4" />
                                Tambah Data
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Toolbar: Search + Filter */}
                <div className="flex flex-wrap items-center gap-3">
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-1 items-center gap-2"
                    >
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Cari kode, nama, atau satuan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">
                            Cari
                        </Button>
                    </form>

                    {/* Filter Satuan */}
                    <Select
                        value={satuan || 'semua'}
                        onValueChange={handleSatuanFilter}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Semua Satuan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua Satuan</SelectItem>
                            {satuanOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Filter Status Stok */}
                    <Select
                        value={stockStatus || 'semua'}
                        onValueChange={handleStockStatusFilter}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Semua Status Stok" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">
                                Semua Status Stok
                            </SelectItem>
                            {stockLevelFilterOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Reset filter */}
                    {activeFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => {
                                setSatuan('');
                                setStockStatus('');
                                navigate({
                                    satuan: undefined,
                                    stock_status: undefined,
                                });
                            }}
                        >
                            Reset filter ({activeFilterCount})
                        </Button>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">No</TableHead>
                                {sortableHead('kode_bahan', 'Kode Bahan')}
                                {sortableHead('nama_bahan', 'Nama Bahan')}
                                {sortableHead('satuan', 'Satuan')}
                                {sortableHead(
                                    'stok',
                                    'Stok Saat Ini',
                                    'text-right',
                                )}
                                {sortableHead(
                                    'minimum_stok',
                                    'Min. Stok',
                                    'text-right',
                                )}
                                <TableHead className="text-center">
                                    Status Stok
                                </TableHead>
                                <TableHead className="w-32 text-center">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bahanBakus.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center"
                                    >
                                        {filters.search ||
                                        filters.satuan ||
                                        filters.stock_status
                                            ? 'Tidak ada data yang ditemukan.'
                                            : 'Belum ada data bahan baku.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                bahanBakus.data.map((item, index) => {
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {bahanBakus.from + index}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {item.kode_bahan}
                                            </TableCell>
                                            <TableCell>
                                                {item.nama_bahan}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                                                    {item.satuan}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatNumber(item.stok)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                                {formatNumber(
                                                    item.minimum_stok,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {stockStatusBadge(
                                                    stockLevelStatus(
                                                        item.stok,
                                                        item.minimum_stok,
                                                    ),
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={bahanBaku.show(
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
                                                    <Link
                                                        href={bahanBaku.edit(
                                                            item.id,
                                                        )}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                    </Link>
                                                    <BahanBakuDeleteDialog
                                                        bahanBaku={item}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {bahanBakus.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Menampilkan {bahanBakus.from} - {bahanBakus.to} dari{' '}
                            {bahanBakus.total} data
                        </p>
                        <div className="flex gap-1">
                            {bahanBakus.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={
                                        link.active ? 'default' : 'outline'
                                    }
                                    size="sm"
                                    disabled={link.url === null}
                                    onClick={() => {
                                        if (link.url) {
                                            router.visit(link.url, {
                                                preserveState: true,
                                                preserveScroll: true,
                                            });
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

BahanBakuIndex.layout = {
    breadcrumbs: [
        {
            title: 'Data Master',
            href: '#',
        },
        {
            title: 'Bahan Baku',
            href: bahanBaku.index(),
        },
    ],
};
