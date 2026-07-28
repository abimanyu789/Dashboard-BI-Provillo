import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    ClipboardList,
    Eye,
    Pencil,
    Plus,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { ProdukDeleteDialog } from '@/components/produk/produk-delete-dialog';
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
import bomCategorie from '@/routes/bom-categorie';
import produk from '@/routes/produk';
import type { ProdukIndexProps } from '@/types';

export default function ProdukIndex({ produks, filters }: ProdukIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [bom, setBom] = useState(filters.bom ?? '');
    const [stockStatus, setStockStatus] = useState(filters.stock_status ?? '');

    const sortBy = filters.sort_by || 'created_at';
    const sortDir = filters.sort_dir || 'desc';

    type SortableColumn =
        | 'kode_produk'
        | 'nama_produk'
        | 'ukuran'
        | 'warna'
        | 'harga_jual'
        | 'stok'
        | 'created_at';

    const navigate = (overrides: Record<string, unknown> = {}) => {
        router.get(
            produk.index.url(),
            {
                search,
                bom: bom || undefined,
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

    const handleBomFilter = (value: string) => {
        const newBom = value === 'semua' ? '' : value;
        setBom(newBom);
        navigate({ bom: newBom || undefined });
    };

    const handleStockStatusFilter = (value: string) => {
        const next = value === 'semua' ? '' : value;
        setStockStatus(next);
        navigate({ stock_status: next || undefined });
    };

    const formatHarga = (value: number | null) => {
        if (value === null) {
            return '-';
        }

        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatStok = (value: number) =>
        new Intl.NumberFormat('id-ID', {
            maximumFractionDigits: 0,
        }).format(value);

    const stockStatusBadge = (status: StockLevelStatus) => (
        <span className={stockLevelBadgeClass(status)}>
            {stockLevelLabel(status)}
        </span>
    );

    const activeFilterCount = [bom, stockStatus].filter(Boolean).length;

    return (
        <>
            <Head title="Data Master - Produk" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Data Master - Produk
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola data produk sepatu Provillo
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <ExportImportMenu
                            exportExcelUrl={
                                produk.export.url() + '?format=excel'
                            }
                            exportPdfUrl={produk.export.url() + '?format=pdf'}
                            templateUrl={produk.template.url()}
                            importUrl={produk.import.url()}
                            modelName="Produk"
                        />
                        <Link href={bomCategorie.index()}>
                            <Button variant="outline">
                                <ClipboardList className="mr-2 size-4" />
                                BOM
                            </Button>
                        </Link>
                        <Link href={produk.create()}>
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
                                placeholder="Cari kode, nama, atau warna..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">
                            Cari
                        </Button>
                    </form>

                    {/* Filter BOM */}
                    <Select
                        value={bom || 'semua'}
                        onValueChange={handleBomFilter}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Semua BOM" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua BOM</SelectItem>
                            <SelectItem value="ada">✓ Sudah Ada BOM</SelectItem>
                            <SelectItem value="tidak">
                                ✗ Belum Ada BOM
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Filter Status Stok */}
                    <Select
                        value={stockStatus || 'semua'}
                        onValueChange={handleStockStatusFilter}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Semua status stok" />
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
                                setBom('');
                                setStockStatus('');
                                navigate({
                                    bom: undefined,
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
                                {sortableHead('kode_produk', 'Kode Produk')}
                                {sortableHead('nama_produk', 'Nama Produk')}
                                {sortableHead('ukuran', 'Ukuran')}
                                {sortableHead('warna', 'Warna')}
                                {sortableHead(
                                    'harga_jual',
                                    'Harga Jual',
                                    'text-right',
                                )}
                                {sortableHead(
                                    'stok',
                                    'Stok Saat Ini',
                                    'text-right',
                                )}
                                <TableHead className="text-center">
                                    Status Stok
                                </TableHead>
                                <TableHead className="w-8 text-center">
                                    BOM
                                </TableHead>
                                <TableHead className="w-32 text-center">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {produks.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={10}
                                        className="h-24 text-center"
                                    >
                                        {filters.search ||
                                        filters.bom ||
                                        filters.stock_status
                                            ? 'Tidak ada data yang ditemukan.'
                                            : 'Belum ada data produk.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                produks.data.map((item, index) => {
                                    const hasBom =
                                        item.bom_category_id !== null;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {produks.from + index}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {item.kode_produk}
                                            </TableCell>
                                            <TableCell>
                                                {item.nama_produk}
                                            </TableCell>
                                            <TableCell>
                                                {item.ukuran ? (
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                        {item.ukuran}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.warna ? (
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                                                        {item.warna}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatHarga(item.harga_jual)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatStok(item.stok)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {stockStatusBadge(
                                                    stockLevelStatus(
                                                        item.stok,
                                                        item.minimum_stok,
                                                    ),
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {hasBom ? (
                                                    <span
                                                        className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400"
                                                        title="Sudah ada BOM"
                                                    >
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400"
                                                        title="Belum ada BOM"
                                                    >
                                                        ✗
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link
                                                        href={produk.show(
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
                                                        href={produk.edit(
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
                                                    <ProdukDeleteDialog
                                                        produk={item}
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
                {produks.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Menampilkan {produks.from} - {produks.to} dari{' '}
                            {produks.total} data
                        </p>
                        <div className="flex gap-1">
                            {produks.links.map((link, index) => (
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

ProdukIndex.layout = {
    breadcrumbs: [
        { title: 'Data Master', href: '#' },
        { title: 'Produk', href: produk.index() },
    ],
};
