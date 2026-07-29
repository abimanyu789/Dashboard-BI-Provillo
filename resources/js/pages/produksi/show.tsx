import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Users, XCircle } from 'lucide-react';
import { InputProgressForm } from '@/components/produksi/input-progress-form';
import { MaterialMovementPanel } from '@/components/produksi/material-movement-panel';
import { ProduksiActionDialog } from '@/components/produksi/produksi-action-dialog';
import { ProduksiStatusBadge } from '@/components/produksi/produksi-status-badge';
import { QcHistoryPanel } from '@/components/produksi/qc-history-panel';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { jenisProduksiLabel, qcStatusLabel } from '@/lib/domain-labels';
import pesanan from '@/routes/pesanan';
import produksiRoute from '@/routes/produksi';
import type { KebutuhanBahan, ProduksiShowProps } from '@/types';

export default function ProduksiShow({
    produksi: item,
    kebutuhanBahan,
    stokCukup,
    progressPerProduk,
    produkBelumSelesai,
    materialSummary,
    materialOptions,
    activeRework,
    qcSummary,
    wageBasis,
    completionBlockers = [],
}: ProduksiShowProps) {
    const formatDate = (s: string | null) => {
        if (!s) {
            return '-';
        }

        return new Date(s).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatDateTime = (s: string) =>
        new Date(s).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    // Progress Bar 1: Progress Produksi (qty_selesai lolos / qty_target)
    const progressPct =
        item.qty_target > 0
            ? Math.round((item.qty_selesai / item.qty_target) * 100)
            : 0;

    // Progress Bar 2: Progress QC (lolos / total progress yang diinput)
    const totalProgress = (item.detail_produksi ?? []).reduce(
        (s, d) => s + d.qty_selesai,
        0,
    );
    const totalLolos = (item.detail_produksi ?? [])
        .filter((d) => d.qc_status === 'lolos')
        .reduce((s, d) => s + d.qty_selesai, 0);
    const totalTidakLolos = totalProgress - totalLolos;

    // Banner informatif di tengah proses (bukan sumber kebenaran tombol Selesai).
    // Tombol Selesai + checklist memakai completionBlockers dari backend.
    const hasMaterialShortage = materialSummary.some(
        (material) => material.shortage > 0.00001,
    );
    const hasUnissuedPlan = materialSummary.some((material) => {
        const remaining = Math.max(
            0,
            material.planned - (material.issued - material.returned),
        );

        return remaining > 0.00001;
    });
    const isSelesaiEnabled =
        item.status === 'proses' && completionBlockers.length === 0;

    return (
        <>
            <Head
                title={`Produksi — ${item.pesanan?.nomor_pesanan ?? `#${item.id}`}`}
            />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={produksiRoute.index.url()}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="size-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Detail Produksi #{item.id}
                            </h1>
                            <div className="mt-1 flex items-center gap-2">
                                <ProduksiStatusBadge status={item.status} />
                                <span className="text-sm text-muted-foreground">
                                    {jenisProduksiLabel(item.jenis_produksi)}
                                    {item.jenis_produksi === 'pesanan'
                                        ? item.pesanan?.nomor_pesanan
                                            ? ` · ${item.pesanan.nomor_pesanan}`
                                            : ''
                                        : ` · #${item.id}`}
                                </span>
                            </div>
                        </div>
                    </div>
                    <ProduksiActionDialog
                        produksi={item}
                        stokCukup={stokCukup}
                    />
                </div>

                {item.status === 'proses' && (
                    <div className="space-y-3">
                        {hasMaterialShortage && (
                            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                                Peringatan: masih ada kekurangan stok bahan
                                terhadap rencana. Produksi dapat berjalan,
                                tetapi keluarkan bahan hanya sampai stok gudang
                                mencukupi.
                            </div>
                        )}
                        {hasUnissuedPlan && (
                            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
                                Produksi telah dimulai. Kebutuhan bahan sudah
                                dihitung, tetapi stok gudang belum dikurangi.
                                Gunakan tombol{' '}
                                <span className="font-semibold">
                                    Keluarkan Bahan untuk Produksi
                                </span>{' '}
                                agar stok tercatat.
                            </div>
                        )}
                        {completionBlockers.length > 0 && (
                            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                                <p className="font-medium">
                                    Produksi belum dapat diselesaikan.
                                    Selesaikan dulu checklist berikut:
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                    {completionBlockers.map((reason) => (
                                        <li key={reason}>{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* ── Kolom Kiri ──────────────────────────────────── */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Informasi Produksi */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="border-b px-6 py-4">
                                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Informasi Produksi
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-y">
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Jenis
                                    </p>
                                    <p className="mt-1 font-medium capitalize">
                                        {item.jenis_produksi}
                                    </p>
                                </div>
                                {item.jenis_produksi === 'pesanan' &&
                                    item.pesanan && (
                                        <div className="px-6 py-4">
                                            <p className="text-sm text-muted-foreground">
                                                Pesanan
                                            </p>
                                            <Link
                                                href={pesanan.show.url(
                                                    item.pesanan_id!,
                                                )}
                                                className="mt-1 font-medium text-primary underline-offset-4 hover:underline"
                                            >
                                                {item.pesanan.nomor_pesanan}
                                            </Link>
                                        </div>
                                    )}
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Customer
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {item.pesanan?.customer
                                            ?.nama_customer ?? '-'}
                                    </p>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Deadline
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {formatDate(item.deadline)}
                                    </p>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Dibuat Pada
                                    </p>
                                    <p className="mt-1 text-sm">
                                        {formatDateTime(item.created_at)}
                                    </p>
                                </div>
                                {item.catatan && (
                                    <div className="col-span-2 px-6 py-4">
                                        <p className="text-sm text-muted-foreground">
                                            Catatan
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {item.catatan}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Target Produk */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="border-b px-6 py-4">
                                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Target Produk
                                </h2>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="text-right">
                                            Target
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Lolos QC
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Sisa
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(item.produksi_items ?? []).map((pi) => {
                                        const prog = progressPerProduk[
                                            pi.produk_id
                                        ] ?? {
                                            lolos: 0,
                                            tidak_lolos: 0,
                                            target: pi.qty_target,
                                            selesai: false,
                                        };

                                        return (
                                            <TableRow key={pi.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {pi.produk
                                                            ?.nama_produk ??
                                                            '-'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {pi.produk
                                                            ?.kode_produk ??
                                                            '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {pi.qty_target}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium text-green-600 dark:text-green-400">
                                                    {prog.lolos}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right font-mono ${prog.selesai ? 'text-muted-foreground' : 'font-medium'}`}
                                                >
                                                    {prog.selesai
                                                        ? '✓'
                                                        : pi.qty_target -
                                                          prog.lolos}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Kebutuhan Bahan Baku */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="flex items-center justify-between border-b px-6 py-4">
                                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    Kebutuhan Bahan Baku
                                </h2>
                                {kebutuhanBahan.length > 0 &&
                                    (stokCukup ? (
                                        <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                                            <CheckCircle className="size-4" />
                                            Semua stok mencukupi
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                                            <XCircle className="size-4" />
                                            Ada stok tidak mencukupi
                                        </span>
                                    ))}
                            </div>
                            {kebutuhanBahan.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bahan Baku</TableHead>
                                            <TableHead className="text-right">
                                                Dibutuhkan
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Tersedia
                                            </TableHead>
                                            <TableHead className="text-center">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {kebutuhanBahan.map(
                                            (bahan: KebutuhanBahan) => (
                                                <TableRow key={bahan.id}>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {bahan.nama_bahan}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {bahan.kode_bahan}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {bahan.kebutuhan.toFixed(
                                                            2,
                                                        )}{' '}
                                                        {bahan.satuan}
                                                    </TableCell>
                                                    <TableCell
                                                        className={`text-right font-mono ${!bahan.cukup ? 'font-semibold text-destructive' : ''}`}
                                                    >
                                                        {bahan.stok_tersedia.toFixed(
                                                            2,
                                                        )}{' '}
                                                        {bahan.satuan}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {bahan.cukup ? (
                                                            <CheckCircle className="mx-auto size-4 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <XCircle className="mx-auto size-4 text-destructive" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                                    Produk pada produksi ini belum memiliki BOM.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Kolom Kanan ──────────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Progress Bar 1: Produksi */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                            <h2 className="mb-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Progress Produksi
                            </h2>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Selesai (Lolos QC)
                                    </span>
                                    <span className="font-medium">
                                        {item.qty_selesai} / {item.qty_target}{' '}
                                        pcs
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                                <p className="text-right text-sm font-semibold">
                                    {progressPct}%
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar 2: QC */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                            <h2 className="mb-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Progress QC
                            </h2>
                            {totalProgress > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                            <CheckCircle className="size-3.5" />{' '}
                                            Lolos
                                        </span>
                                        <span className="font-medium">
                                            {totalLolos} pcs
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-green-500 transition-all"
                                            style={{
                                                width: `${totalProgress > 0 ? Math.round((totalLolos / item.qty_target) * 100) : 0}%`,
                                            }}
                                        />
                                    </div>
                                    {totalTidakLolos > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="flex items-center gap-1 text-destructive">
                                                <XCircle className="size-3.5" />{' '}
                                                Tidak Lolos
                                            </span>
                                            <span className="font-medium">
                                                {totalTidakLolos} pcs
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada progress yang diinput.
                                </p>
                            )}
                        </div>

                        {/* Karyawan Terlibat */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                <Users className="size-4" /> Tim Karyawan
                            </h2>
                            {(item.produksi_karyawans ?? []).length > 0 ? (
                                <div className="space-y-2">
                                    {(item.produksi_karyawans ?? []).map(
                                        (pk) => (
                                            <div
                                                key={pk.id}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                                    {pk.karyawan?.nama_karyawan?.charAt(
                                                        0,
                                                    ) ?? '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {pk.karyawan
                                                            ?.nama_karyawan ??
                                                            '-'}
                                                    </p>
                                                    {pk.karyawan?.jabatan && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {
                                                                pk.karyawan
                                                                    .jabatan
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada karyawan yang ditugaskan.
                                </p>
                            )}
                        </div>

                        {/* Status QC Keseluruhan */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-background p-4 dark:border-sidebar-border">
                            <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Status QC Keseluruhan
                            </p>
                            <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                    item.status_qc === 'lolos'
                                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                                        : item.status_qc === 'tidak_lolos'
                                          ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                            >
                                {qcStatusLabel(item.status_qc)}
                            </span>
                        </div>

                        {/* Tombol Selesaikan Produksi */}
                        {isSelesaiEnabled && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        className="w-full"
                                        variant="default"
                                    >
                                        Selesaikan Produksi
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Selesaikan Produksi
                                        </DialogTitle>
                                        <DialogDescription>
                                            Seluruh target produksi (
                                            {item.qty_target} pcs) telah
                                            selesai. Status akan diubah menjadi{' '}
                                            <strong>Selesai</strong>. Tidak ada
                                            perubahan stok karena stok sudah
                                            bertambah bertahap.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">
                                                Batal
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            onClick={() =>
                                                router.patch(
                                                    produksiRoute.selesai.url(
                                                        item.id,
                                                    ),
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            Ya, Selesaikan
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {/* Section Form & Histori */}
                <div className="mt-2 grid gap-6 lg:grid-cols-3">
                    {/* Section Input Progress — hanya saat proses */}
                    {item.status === 'proses' && (
                        <div className="h-fit rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                            <h2 className="mb-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Input Progress
                            </h2>
                            <InputProgressForm
                                produksi={item}
                                produkBelumSelesai={produkBelumSelesai}
                                activeRework={activeRework}
                            />
                        </div>
                    )}

                    {/* Histori Progress */}
                    <div
                        className={`h-fit rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border ${item.status !== 'proses' ? 'lg:col-span-3' : 'lg:col-span-2'}`}
                    >
                        <div className="border-b px-6 py-4">
                            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Histori Progress
                            </h2>
                        </div>
                        {(item.detail_produksi ?? []).length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="text-right">
                                            Qty
                                        </TableHead>
                                        <TableHead>QC</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(item.detail_produksi ?? []).map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {d.produk?.nama_produk ??
                                                        '-'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {d.produk?.kode_produk ??
                                                        '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold">
                                                {d.qty_selesai} pcs
                                            </TableCell>
                                            <TableCell>
                                                {d.qc_status === 'lolos' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                                                        <CheckCircle className="size-3" />{' '}
                                                        Lolos
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                                                        <XCircle className="size-3" />{' '}
                                                        Tidak Lolos
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(
                                                    d.created_at,
                                                ).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                                Belum ada progress yang dicatat.
                            </div>
                        )}
                    </div>
                </div>

                <MaterialMovementPanel
                    produksi={item}
                    materialSummary={materialSummary}
                    materialOptions={materialOptions}
                />

                <QcHistoryPanel
                    produksi={item}
                    activeRework={activeRework}
                    qcSummary={qcSummary}
                    wageBasis={wageBasis}
                />
            </div>
        </>
    );
}

ProduksiShow.layout = {
    breadcrumbs: [
        { title: 'Produksi', href: produksiRoute.index.url() },
        { title: 'Detail', href: '#' },
    ],
};
