import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, FileText, Pencil, Trash2, Truck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { PesananDeleteDialog } from '@/components/pesanan/pesanan-delete-dialog';
import { PesananStatusBadge } from '@/components/pesanan/pesanan-status-badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import pembayaran from '@/routes/pembayaran';
import pesanan from '@/routes/pesanan';
import type {
    PembayaranFormData,
    PesananShowProps,
    ProgressPengirimanItem,
    StatusPembayaran,
    StatusPesanan,
} from '@/types';

const statusBayarConfig: Record<
    StatusPembayaran,
    { label: string; className: string }
> = {
    belum_bayar: {
        label: 'Belum bayar',
        className:
            'inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    },
    sebagian: {
        label: 'Sebagian',
        className:
            'inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    },
    lunas: {
        label: 'Lunas',
        className:
            'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400',
    },
};

const statusKirimConfig: Record<
    ProgressPengirimanItem['status'],
    { label: string; className: string }
> = {
    belum: {
        label: 'Belum',
        className:
            'inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground',
    },
    sebagian: {
        label: 'Sebagian',
        className:
            'inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    },
    lengkap: {
        label: 'Lengkap',
        className:
            'inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400',
    },
};

export default function PesananShow({
    pesanan: item,
    statusTransisi,
    ringkasanPembayaran,
    progressPengiriman,
}: PesananShowProps) {
    const formatRupiah = (value: string | number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(Number(value));

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

    const formatDateTime = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const handleUpdateStatus = (statusBaru: string) => {
        router.patch(
            pesanan.updateStatus.url(item.id),
            { status: statusBaru },
            { preserveScroll: true },
        );
    };

    const statusLabels: Record<StatusPesanan, string> = {
        pending: 'Pending',
        proses: 'Proses',
        selesai: 'Selesai',
        dibatalkan: 'Dibatalkan',
    };

    const isLocked =
        item.status === 'selesai' || item.status === 'dibatalkan';
    const sisaTagihan = ringkasanPembayaran.sisa_tagihan;
    const canAddPayment = !isLocked && sisaTagihan > 0.009;
    const progressByProduk = new Map(
        progressPengiriman.items.map((row) => [row.produk_id, row]),
    );
    const overall = progressPengiriman.overall;

    return (
        <>
            <Head title={`Pesanan — ${item.nomor_pesanan}`} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={pesanan.index.url()}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="size-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {item.nomor_pesanan}
                            </h1>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <PesananStatusBadge status={item.status} />
                                <span
                                    className={
                                        statusBayarConfig[
                                            ringkasanPembayaran.status_pembayaran
                                        ].className
                                    }
                                >
                                    {
                                        statusBayarConfig[
                                            ringkasanPembayaran.status_pembayaran
                                        ].label
                                    }
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {formatDate(item.tanggal)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={pesanan.invoice.url(item.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="outline">
                                <FileText className="mr-2 size-4" />
                                Cetak Invoice
                            </Button>
                        </a>
                        {!isLocked && (
                            <Link href={pesanan.edit.url(item.id)}>
                                <Button variant="outline">
                                    <Pencil className="mr-2 size-4" />
                                    Edit
                                </Button>
                            </Link>
                        )}
                        {!isLocked && (
                            <PesananDeleteDialog
                                pesanan={item}
                                redirectTo={pesanan.index.url()}
                                trigger={
                                    <Button
                                        variant="outline"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                        Hapus
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Kolom kiri — detail & items */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Info Pesanan */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="border-b px-6 py-4">
                                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Informasi Pesanan
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-y">
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Customer
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {item.customer?.nama_customer ?? '-'}
                                    </p>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Tanggal Pesanan
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {formatDate(item.tanggal)}
                                    </p>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Jenis Pembayaran
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {item.jenis_pembayaran ? (
                                            {
                                                dp: 'DP (Down Payment)',
                                                lunas: 'Lunas',
                                                bertahap: 'Bertahap',
                                                cod: 'COD',
                                                termin: 'Termin',
                                            }[item.jenis_pembayaran]
                                        ) : (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Dibuat oleh
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {(item as { created_by_nama?: string })
                                            .created_by_nama ?? 'Admin'}
                                    </p>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Tanggal Dibuat
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {formatDateTime(item.created_at)}
                                    </p>
                                </div>
                                {item.keterangan && (
                                    <div className="col-span-2 px-6 py-4">
                                        <p className="text-sm text-muted-foreground">
                                            Keterangan
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {item.keterangan}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabel Item + progress kirim per produk */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="border-b px-6 py-4">
                                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Item & Progress Pengiriman
                                </h2>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="text-right">
                                            Harga
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Dipesan
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Dikirim
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Sisa
                                        </TableHead>
                                        <TableHead className="min-w-36">
                                            Progress
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Subtotal
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(item.detail_pesanan ?? []).map(
                                        (detail) => {
                                            const progress =
                                                progressByProduk.get(
                                                    detail.produk_id,
                                                );
                                            const qtyDikirim =
                                                progress?.qty_dikirim ?? 0;
                                            const qtySisa =
                                                progress?.qty_sisa ??
                                                detail.qty;
                                            const percent =
                                                progress?.percent ?? 0;
                                            const statusKirim =
                                                progress?.status ?? 'belum';

                                            return (
                                                <TableRow key={detail.id}>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {detail.produk
                                                                ?.nama_produk ??
                                                                '-'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {detail.produk
                                                                ?.kode_produk ??
                                                                '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm">
                                                        {formatRupiah(
                                                            detail.harga,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {detail.qty}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {qtyDikirim}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {qtySisa}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span
                                                                    className={
                                                                        statusKirimConfig[
                                                                            statusKirim
                                                                        ]
                                                                            .className
                                                                    }
                                                                >
                                                                    {
                                                                        statusKirimConfig[
                                                                            statusKirim
                                                                        ]
                                                                            .label
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {percent}%
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={percent}
                                                                className="h-1.5"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm font-medium">
                                                        {formatRupiah(
                                                            detail.subtotal,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        },
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Form & Riwayat Pembayaran */}
                        <div className="grid gap-6 md:grid-cols-3">
                            {canAddPayment && (
                                <div className="h-fit rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border md:col-span-1">
                                    <h2 className="mb-1 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                        Tambah Pembayaran
                                    </h2>
                                    <p className="mb-4 text-xs text-muted-foreground">
                                        Sisa tagihan:{' '}
                                        <span className="font-medium text-foreground">
                                            {formatRupiah(sisaTagihan)}
                                        </span>
                                    </p>
                                    <PembayaranForm
                                        pesananId={item.id}
                                        sisaTagihan={sisaTagihan}
                                    />
                                </div>
                            )}

                            {!canAddPayment && !isLocked && (
                                <div className="h-fit rounded-xl border border-sidebar-border/70 bg-background p-6 text-sm text-muted-foreground dark:border-sidebar-border md:col-span-1">
                                    Tagihan sudah lunas. Tidak ada sisa yang
                                    bisa dibayar.
                                </div>
                            )}

                            <div
                                className={`h-fit w-full max-w-full justify-self-start overflow-x-auto rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border md:w-fit ${
                                    canAddPayment || !isLocked
                                        ? 'md:col-span-2'
                                        : 'md:col-span-3'
                                }`}
                            >
                                <div className="border-b px-6 py-4">
                                    <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                        Riwayat Pembayaran
                                    </h2>
                                </div>
                                {(item.pembayarans ?? []).length > 0 ? (
                                    <table className="w-full text-left text-sm md:w-max">
                                        <thead>
                                            <tr className="border-b text-muted-foreground">
                                                <th className="px-6 py-3 font-medium whitespace-nowrap">
                                                    Tanggal
                                                </th>
                                                <th className="px-6 py-3 text-center font-medium whitespace-nowrap">
                                                    Jenis
                                                </th>
                                                <th className="px-6 py-3 font-medium whitespace-nowrap">
                                                    Metode
                                                </th>
                                                <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                                                    Nominal
                                                </th>
                                                <th className="px-6 py-3 font-medium">
                                                    Keterangan
                                                </th>
                                                <th className="w-12 px-6 py-3 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(item.pembayarans ?? []).map(
                                                (p) => (
                                                    <tr
                                                        key={p.id}
                                                        className="border-b last:border-0"
                                                    >
                                                        <td className="px-6 py-3 whitespace-nowrap">
                                                            {p.tanggal
                                                                ? new Date(
                                                                      p.tanggal,
                                                                  ).toLocaleDateString(
                                                                      'id-ID',
                                                                      {
                                                                          day: 'numeric',
                                                                          month: 'short',
                                                                          year: 'numeric',
                                                                      },
                                                                  )
                                                                : '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-center capitalize whitespace-nowrap">
                                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                                                                {p.jenis_pembayaran.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                                                            {p.metode ?? '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-mono font-semibold whitespace-nowrap text-green-600 dark:text-green-400">
                                                            {formatRupiah(
                                                                p.nominal,
                                                            )}
                                                        </td>
                                                        <td
                                                            className="max-w-50 truncate px-6 py-3 text-muted-foreground md:max-w-75"
                                                            title={
                                                                p.keterangan ??
                                                                undefined
                                                            }
                                                        >
                                                            {p.keterangan ??
                                                                '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            {!isLocked && (
                                                                <button
                                                                    onClick={() =>
                                                                        router.delete(
                                                                            pembayaran.destroy.url(
                                                                                p.id,
                                                                            ),
                                                                            {
                                                                                preserveScroll:
                                                                                    true,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="text-muted-foreground hover:text-destructive"
                                                                    title="Hapus pembayaran"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                                        Belum ada pembayaran yang dicatat.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Kolom kanan — ringkasan & status */}
                    <div className="space-y-6">
                        {statusTransisi.length > 0 && (
                            <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                                <h2 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Ubah Status
                                </h2>
                                <p className="mb-4 text-xs text-muted-foreground">
                                    Status <strong>Selesai</strong> di-set
                                    otomatis saat lunas dan semua produk
                                    terkirim.
                                </p>
                                <Select onValueChange={handleUpdateStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih status baru..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusTransisi.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {statusLabels[s]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Progress Pengiriman overall */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                            <div className="mb-4 flex items-center gap-2">
                                <Truck className="size-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Progress Pengiriman
                                </h2>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Qty dipesan
                                    </span>
                                    <span className="font-medium">
                                        {overall.qty_pesan}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Qty dikirim
                                    </span>
                                    <span className="font-medium">
                                        {overall.qty_dikirim}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Qty sisa
                                    </span>
                                    <span className="font-medium">
                                        {overall.qty_sisa}
                                    </span>
                                </div>
                                <div className="space-y-1.5 border-t pt-3">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Penyelesaian</span>
                                        <span>{overall.percent}%</span>
                                    </div>
                                    <Progress
                                        value={overall.percent}
                                        className="h-2"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Ringkasan Pembayaran */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Ringkasan Pembayaran
                                </h2>
                                <span
                                    className={
                                        statusBayarConfig[
                                            ringkasanPembayaran.status_pembayaran
                                        ].className
                                    }
                                >
                                    {
                                        statusBayarConfig[
                                            ringkasanPembayaran.status_pembayaran
                                        ].label
                                    }
                                </span>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Subtotal
                                    </span>
                                    <span className="font-mono">
                                        {formatRupiah(item.subtotal)}
                                    </span>
                                </div>
                                {Number(item.diskon) > 0 && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                        <span>Diskon</span>
                                        <span className="font-mono">
                                            -{formatRupiah(item.diskon)}
                                        </span>
                                    </div>
                                )}
                                {Number(item.ongkir) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Ongkos Kirim
                                        </span>
                                        <span className="font-mono">
                                            {formatRupiah(item.ongkir)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t pt-3 font-semibold">
                                    <span>Total</span>
                                    <span className="font-mono text-lg">
                                        {formatRupiah(item.total)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Sudah dibayar
                                    </span>
                                    <span className="font-mono text-green-600 dark:text-green-400">
                                        {formatRupiah(
                                            ringkasanPembayaran.total_dibayar,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-3 font-semibold">
                                    <span>Sisa tagihan</span>
                                    <span className="font-mono text-lg">
                                        {formatRupiah(sisaTagihan)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Inline form tambah pembayaran ───────────────────────────────────────────

function PembayaranForm({
    pesananId,
    sisaTagihan,
}: {
    pesananId: number;
    sisaTagihan: number;
}) {
    const { data, setData, post, processing, errors, reset } =
        useForm<PembayaranFormData>({
            tanggal: new Date().toISOString().slice(0, 10),
            jenis_pembayaran: '',
            nominal: '',
            metode: '',
            keterangan: '',
        });

    // Auto-isi nominal = sisa saat pilih pelunasan
    useEffect(() => {
        if (data.jenis_pembayaran === 'pelunasan' && sisaTagihan > 0) {
            setData('nominal', Math.round(sisaTagihan));
        }
    }, [data.jenis_pembayaran, sisaTagihan, setData]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(pembayaran.store.url(pesananId), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
        });
    };

    const maxNominal = Math.max(0, Math.round(sisaTagihan));

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                    Tanggal
                </label>
                <input
                    type="date"
                    value={data.tanggal}
                    onChange={(e) => setData('tanggal', e.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-3 text-sm"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                    Jenis Pembayaran
                </label>
                <Select
                    value={data.jenis_pembayaran}
                    onValueChange={(val: string) =>
                        setData(
                            'jenis_pembayaran',
                            val as PembayaranFormData['jenis_pembayaran'],
                        )
                    }
                >
                    <SelectTrigger className="h-8 w-full text-sm">
                        <SelectValue placeholder="Pilih Jenis..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="dp">DP (Down Payment)</SelectItem>
                        <SelectItem value="pelunasan">Pelunasan</SelectItem>
                        <SelectItem value="termin">Termin</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                    Nominal (Rp)
                </label>
                <input
                    type="number"
                    min="1"
                    max={maxNominal}
                    step="1"
                    value={data.nominal}
                    onChange={(e) =>
                        setData(
                            'nominal',
                            e.target.value === ''
                                ? ''
                                : Number(e.target.value),
                        )
                    }
                    placeholder="0"
                    className="h-8 w-full rounded-md border bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    Maksimal {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                    }).format(maxNominal)}
                </p>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                    Metode Pembayaran
                </label>
                <Select
                    value={data.metode}
                    onValueChange={(val) => setData('metode', val)}
                >
                    <SelectTrigger className="h-8 w-full text-sm">
                        <SelectValue placeholder="Pilih Metode..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tunai">Tunai</SelectItem>
                        <SelectItem value="Transfer Bank">
                            Transfer Bank
                        </SelectItem>
                        <SelectItem value="QRIS">QRIS</SelectItem>
                        <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                    Keterangan
                </label>
                <input
                    type="text"
                    value={data.keterangan}
                    onChange={(e) => setData('keterangan', e.target.value)}
                    placeholder="Opsional..."
                    className="h-8 w-full rounded-md border bg-background px-3 text-sm"
                />
            </div>

            <Button
                type="submit"
                size="sm"
                className="mt-1 w-full"
                disabled={processing || maxNominal <= 0}
            >
                {processing ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </Button>
            {Object.values(errors).filter(Boolean).length > 0 && (
                <p className="mt-1 w-full text-sm text-destructive">
                    {Object.values(errors)[0]}
                </p>
            )}
        </form>
    );
}

PesananShow.layout = {
    breadcrumbs: [
        { title: 'Pesanan', href: pesanan.index.url() },
        { title: 'Detail', href: '#' },
    ],
};
