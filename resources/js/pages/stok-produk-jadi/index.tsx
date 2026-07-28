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
import { stokProdukTransaksiLabel } from '@/lib/domain-labels';
import produksiRoute from '@/routes/produksi';
import stokProdukJadi from '@/routes/stok-produk-jadi';
import type {
    JenisTransaksiProduk,
    StokProdukJadiIndexProps,
    StokProdukTab,
} from '@/types';

export default function StokProdukJadiIndex({
    tab = 'normal',
    riwayat,
    produkCacat,
    riwayatDimusnahkan,
    produkOptions,
    filters,
    unresolvedNotes = [],
}: StokProdukJadiIndexProps) {
    const activeTab = (filters.tab as StokProdukTab) || tab || 'normal';
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
                tab: activeTab,
                search: search || undefined,
                produk_id: produkId || undefined,
                jenis_transaksi:
                    activeTab === 'normal'
                        ? jenisTransaksi || undefined
                        : undefined,
                tanggal_dari: tanggalDari || undefined,
                tanggal_sampai: tanggalSampai || undefined,
                sort_by: activeTab === 'normal' ? sortBy : undefined,
                sort_dir: activeTab === 'normal' ? sortDir : undefined,
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

    const handleTab = (next: StokProdukTab) => {
        navigate({
            tab: next,
            jenis_transaksi: next === 'normal' ? jenisTransaksi || undefined : undefined,
        });
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) {
            return '-';
        }

        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const jenisBadge = (jenis: JenisTransaksiProduk, label?: string) => {
        const map: Record<
            JenisTransaksiProduk,
            {
                variant: 'default' | 'secondary' | 'destructive' | 'outline';
            }
        > = {
            produksi: { variant: 'default' },
            pengiriman: { variant: 'secondary' },
            rollback: { variant: 'outline' },
            penyesuaian: { variant: 'outline' },
        };
        const config = map[jenis] ?? { variant: 'outline' as const };

        return (
            <Badge variant={config.variant}>
                {label ?? stokProdukTransaksiLabel(jenis)}
            </Badge>
        );
    };

    const tabs: { id: StokProdukTab; label: string }[] = [
        { id: 'normal', label: 'Produk Normal' },
        { id: 'cacat', label: 'Produk Cacat Layak Jual' },
        { id: 'dimusnahkan', label: 'Riwayat Dimusnahkan' },
    ];

    const activeFilterCount = [
        produkId,
        activeTab === 'normal' ? jenisTransaksi : '',
        tanggalDari,
        tanggalSampai,
    ].filter(Boolean).length;

    return (
        <>
            <Head title="Stok Produk Jadi" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Stok Produk Jadi
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Stok normal, produk cacat layak jual, dan riwayat
                            dimusnahkan
                        </p>
                    </div>
                    {activeTab === 'normal' && (
                        <Link href={stokProdukJadi.create.url()}>
                            <Button>
                                <Plus className="mr-2 size-4" />
                                Tambah Data
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {tabs.map((item) => (
                        <Button
                            key={item.id}
                            type="button"
                            variant={
                                activeTab === item.id ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleTab(item.id)}
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>

                {activeTab === 'cacat' && unresolvedNotes.length > 0 && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-200">
                        <p className="font-medium">Catatan cakupan saat ini</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            {unresolvedNotes.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="rounded-xl border border-sidebar-border/70 bg-background p-4 dark:border-sidebar-border">
                    <div className="flex flex-col gap-3">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Cari kode/nama produk, keterangan..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit" variant="secondary">
                                Cari
                            </Button>
                        </form>

                        <div className="flex flex-wrap gap-2">
                            <SearchableCombobox
                                items={produkOptions.map((p) => ({
                                    value: p.id,
                                    label: `${p.kode_produk} — ${p.nama_produk}`,
                                }))}
                                value={produkId ? Number(produkId) : ''}
                                onValueChange={(value) => {
                                    const next = value ? String(value) : '';
                                    setProdukId(next);
                                    navigate({
                                        produk_id: next || undefined,
                                    });
                                }}
                                placeholder="Semua produk"
                                className="w-64"
                            />

                            {activeTab === 'normal' && (
                                <Select
                                    value={jenisTransaksi || 'semua'}
                                    onValueChange={(value) => {
                                        const next =
                                            value === 'semua' ? '' : value;
                                        setJenisTransaksi(next);
                                        navigate({
                                            jenis_transaksi: next || undefined,
                                        });
                                    }}
                                >
                                    <SelectTrigger className="w-56">
                                        <SelectValue placeholder="Semua Jenis" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="semua">
                                            Semua Jenis
                                        </SelectItem>
                                        <SelectItem value="produksi">
                                            Pengeluaran untuk Produksi
                                        </SelectItem>
                                        <SelectItem value="pengiriman">
                                            Pengiriman Produk
                                        </SelectItem>
                                        <SelectItem value="rollback">
                                            Pengembalian dari Produksi
                                        </SelectItem>
                                        <SelectItem value="penyesuaian">
                                            Penyesuaian Stok
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            <Input
                                type="date"
                                value={tanggalDari}
                                onChange={(e) => {
                                    setTanggalDari(e.target.value);
                                    navigate({
                                        tanggal_dari:
                                            e.target.value || undefined,
                                    });
                                }}
                                className="w-40"
                            />
                            <Input
                                type="date"
                                value={tanggalSampai}
                                onChange={(e) => {
                                    setTanggalSampai(e.target.value);
                                    navigate({
                                        tanggal_sampai:
                                            e.target.value || undefined,
                                    });
                                }}
                                className="w-40"
                            />

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

                {activeTab === 'normal' && riwayat && (
                    <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    {sortableHead('created_at', 'Tanggal')}
                                    <TableHead>Produk</TableHead>
                                    {sortableHead('jenis_transaksi', 'Jenis')}
                                    {sortableHead('qty', 'Qty', 'text-right')}
                                    {sortableHead(
                                        'stok_sebelum',
                                        'Stok Sebelum',
                                        'text-right',
                                    )}
                                    {sortableHead(
                                        'stok_sesudah',
                                        'Stok Sesudah',
                                        'text-right',
                                    )}
                                    <TableHead>Pesanan</TableHead>
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
                                            colSpan={11}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            Belum ada riwayat stok produk
                                            normal.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    riwayat.data.map((item, idx) => {
                                        const isPengurangan =
                                            Number(item.stok_sebelum) >
                                            Number(item.stok_sesudah);
                                        const qtyColor = isPengurangan
                                            ? 'text-destructive'
                                            : 'text-green-600 dark:text-green-400';
                                        const qtyDisplay = isPengurangan
                                            ? `-${item.qty}`
                                            : `+${item.qty}`;

                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-muted-foreground">
                                                    {(riwayat.current_page -
                                                        1) *
                                                        riwayat.per_page +
                                                        idx +
                                                        1}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {formatDate(
                                                        item.created_at,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {item.produk
                                                            ?.nama_produk ?? '-'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.produk
                                                            ?.kode_produk ?? '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {jenisBadge(
                                                        item.jenis_transaksi,
                                                        item.jenis_transaksi_label,
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right font-mono font-medium ${qtyColor}`}
                                                >
                                                    {qtyDisplay}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {item.stok_sebelum}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium">
                                                    {item.stok_sesudah}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {item.pesanan
                                                        ?.nomor_pesanan ?? '-'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {item.dicatat_oleh ?? '-'}
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
                    </div>
                )}

                {activeTab === 'cacat' && produkCacat && (
                    <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                        <div className="border-b px-6 py-4">
                            <p className="text-sm text-muted-foreground">
                                Hanya menampilkan disposisi Produk Cacat Layak
                                Jual. Qty ini tidak digabung ke stok normal.
                                Disposisi Perbaikan Ulang tetap di antrean
                                rework produksi.
                            </p>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead className="text-right">
                                        Qty Cacat
                                    </TableHead>
                                    <TableHead>Alasan QC</TableHead>
                                    <TableHead>Sumber Produksi</TableHead>
                                    <TableHead>Karyawan</TableHead>
                                    <TableHead>Tgl Pemeriksaan</TableHead>
                                    <TableHead>Catatan</TableHead>
                                    <TableHead>Dicatat Oleh</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {produkCacat.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            Belum ada stok produk cacat layak
                                            jual.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    produkCacat.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {row.nama_produk ?? '-'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {row.kode_produk ?? '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-orange-600 dark:text-orange-400">
                                                {row.qty}
                                            </TableCell>
                                            <TableCell className="max-w-56 text-sm">
                                                {row.alasan_qc ?? '-'}
                                            </TableCell>
                                            <TableCell>
                                                {row.produksi_id ? (
                                                    <Link
                                                        href={produksiRoute.show.url(
                                                            row.produksi_id,
                                                        )}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                    >
                                                        Produksi #
                                                        {row.produksi_id}
                                                    </Link>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {row.karyawan ?? '-'}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {formatDate(row.inspected_at)}
                                            </TableCell>
                                            <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                                                {row.catatan ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {row.dicatat_oleh ?? '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {activeTab === 'dimusnahkan' && riwayatDimusnahkan && (
                    <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                        <div className="border-b px-6 py-4">
                            <p className="text-sm text-muted-foreground">
                                Produk dimusnahkan tidak pernah dihitung sebagai
                                stok.
                            </p>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead className="text-right">
                                        Qty
                                    </TableHead>
                                    <TableHead>Alasan</TableHead>
                                    <TableHead>Sumber Produksi</TableHead>
                                    <TableHead>Tgl Pemeriksaan</TableHead>
                                    <TableHead>Catatan</TableHead>
                                    <TableHead>Pengguna</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {riwayatDimusnahkan.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            Belum ada riwayat produk
                                            dimusnahkan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    riwayatDimusnahkan.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {row.nama_produk ?? '-'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {row.kode_produk ?? '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {row.qty}
                                            </TableCell>
                                            <TableCell className="max-w-56 text-sm">
                                                {row.alasan_qc ?? '-'}
                                            </TableCell>
                                            <TableCell>
                                                {row.produksi_id ? (
                                                    <Link
                                                        href={produksiRoute.show.url(
                                                            row.produksi_id,
                                                        )}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                    >
                                                        Produksi #
                                                        {row.produksi_id}
                                                    </Link>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {formatDate(row.inspected_at)}
                                            </TableCell>
                                            <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                                                {row.catatan ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {row.dicatat_oleh ?? '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
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
