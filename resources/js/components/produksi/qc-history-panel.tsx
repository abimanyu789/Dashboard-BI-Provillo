import { useForm } from '@inertiajs/react';
import { AlertTriangle, History, RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { qcDispositionLabel, qcStatusLabel } from '@/lib/domain-labels';
import produksiRoute from '@/routes/produksi';
import type {
    ActiveRework,
    DetailProduksi,
    Produksi,
    QcDisposition,
    QcSummary,
    WageBasis,
} from '@/types';

const dispositionLabels: Record<QcDisposition, string> = {
    rework: qcDispositionLabel('rework'),
    jual_cacat: qcDispositionLabel('jual_cacat'),
    dimusnahkan: qcDispositionLabel('dimusnahkan'),
};

function LegacyDispositionForm({
    produksiId,
    detail,
}: {
    produksiId: number;
    detail: DetailProduksi;
}) {
    const { data, setData, patch, processing, errors } = useForm({
        alasan_qc: detail.alasan_qc ?? '',
        disposisi_qc: '' as QcDisposition | '',
        catatan: detail.catatan ?? '',
    });

    return (
        <form
            className="mt-3 grid gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 md:grid-cols-2"
            onSubmit={(event) => {
                event.preventDefault();
                patch(
                    produksiRoute.qc.disposition.update.url({
                        produksi: produksiId,
                        detailProduksi: detail.id,
                    }),
                    { preserveScroll: true },
                );
            }}
        >
            <div className="space-y-1 md:col-span-2">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4" /> Data lama memerlukan
                    alasan dan disposisi QC.
                </p>
            </div>
            <div className="space-y-1.5">
                <Label>Alasan QC</Label>
                <Input
                    value={data.alasan_qc}
                    onChange={(event) =>
                        setData('alasan_qc', event.target.value)
                    }
                />
                {errors.alasan_qc && (
                    <p className="text-xs text-destructive">
                        {errors.alasan_qc}
                    </p>
                )}
            </div>
            <div className="space-y-1.5">
                <Label>Disposisi</Label>
                <Select
                    value={data.disposisi_qc}
                    onValueChange={(value) =>
                        setData('disposisi_qc', value as QcDisposition)
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih disposisi..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="rework">
                            {dispositionLabels.rework}
                        </SelectItem>
                        <SelectItem value="jual_cacat">
                            {dispositionLabels.jual_cacat}
                        </SelectItem>
                        <SelectItem value="dimusnahkan">
                            {dispositionLabels.dimusnahkan}
                        </SelectItem>
                    </SelectContent>
                </Select>
                {errors.disposisi_qc && (
                    <p className="text-xs text-destructive">
                        {errors.disposisi_qc}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    {dispositionLabels.jual_cacat} dan{' '}
                    {dispositionLabels.dimusnahkan} masuk ledger audit produk
                    cacat (bukan stok normal, bukan dasar upah).{' '}
                    {dispositionLabels.rework} tetap di antrean produksi.
                </p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
                <Label>Catatan</Label>
                <Textarea
                    value={data.catatan}
                    onChange={(event) => setData('catatan', event.target.value)}
                />
            </div>
            <Button type="submit" size="sm" disabled={processing}>
                Simpan Disposisi
            </Button>
        </form>
    );
}

export function QcHistoryPanel({
    produksi,
    activeRework,
    qcSummary,
    wageBasis,
}: {
    produksi: Produksi;
    activeRework: ActiveRework[];
    qcSummary: QcSummary;
    wageBasis: WageBasis[];
}) {
    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                    [
                        qcStatusLabel('lolos'),
                        qcSummary.lolos,
                        'text-green-600 dark:text-green-400',
                    ],
                    [
                        qcStatusLabel('tidak_lolos'),
                        qcSummary.tidak_lolos,
                        'text-destructive',
                    ],
                    [
                        'Perbaikan Ulang Aktif',
                        qcSummary.rework_aktif,
                        'text-amber-600 dark:text-amber-400',
                    ],
                    [
                        qcDispositionLabel('jual_cacat'),
                        qcSummary.jual_cacat,
                        'text-orange-600 dark:text-orange-400',
                    ],
                    [
                        qcDispositionLabel('dimusnahkan'),
                        qcSummary.dimusnahkan,
                        'text-muted-foreground',
                    ],
                ].map(([label, value, className]) => (
                    <div
                        key={label}
                        className="rounded-xl border border-sidebar-border/70 bg-background p-4 dark:border-sidebar-border"
                    >
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p
                            className={`mt-1 text-2xl font-semibold ${className}`}
                        >
                            {value} pcs
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <div className="border-b px-6 py-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                            <RotateCcw className="size-4" /> Antrean Perbaikan
                            Ulang Aktif
                        </h2>
                    </div>
                    {activeRework.length === 0 ? (
                        <p className="px-6 py-8 text-sm text-muted-foreground">
                            Tidak ada rework aktif.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {activeRework.map((rework) => (
                                <div
                                    key={rework.id}
                                    className="px-6 py-4 text-sm"
                                >
                                    <div className="flex justify-between gap-4">
                                        <div>
                                            <p className="font-medium">
                                                {rework.produk?.nama_produk ??
                                                    '-'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Asal:{' '}
                                                {rework.karyawan
                                                    ?.nama_karyawan ??
                                                    'Data lama'}
                                            </p>
                                        </div>
                                        <p className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                                            {rework.qty_aktif} pcs
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {rework.alasan_qc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <div className="border-b px-6 py-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                            <Users className="size-4" /> Dasar Perhitungan Upah
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Hanya output yang lolos QC dan teratribusi langsung
                            ke karyawan.
                        </p>
                    </div>
                    {wageBasis.length === 0 ? (
                        <p className="px-6 py-8 text-sm text-muted-foreground">
                            Belum ada output lolos QC yang teratribusi.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {wageBasis.map((worker) => (
                                <div
                                    key={worker.karyawan_id}
                                    className="flex items-center justify-between px-6 py-4 text-sm"
                                >
                                    <p className="font-medium">{worker.nama}</p>
                                    <p className="font-mono font-semibold">
                                        {worker.qty_lolos} pcs lolos
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                <div className="border-b px-6 py-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        <History className="size-4" /> Riwayat QC & Disposisi
                    </h2>
                </div>
                {(produksi.detail_produksi ?? []).length === 0 ? (
                    <p className="px-6 py-8 text-sm text-muted-foreground">
                        Belum ada progress QC.
                    </p>
                ) : (
                    <div className="divide-y">
                        {(produksi.detail_produksi ?? []).map((detail) => (
                            <div key={detail.id} className="px-6 py-4 text-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-medium">
                                            {detail.produk?.nama_produk ?? '-'}{' '}
                                            — {detail.qty_selesai} pcs
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {detail.karyawan?.nama_karyawan ??
                                                'Data lama tanpa atribusi karyawan'}{' '}
                                            •{' '}
                                            {new Date(
                                                detail.created_at,
                                            ).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <span
                                        className={
                                            detail.qc_status === 'lolos'
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-destructive'
                                        }
                                    >
                                        {detail.qc_status === 'lolos'
                                            ? 'Lolos QC'
                                            : `Tidak lolos${detail.disposisi_qc ? ` — ${dispositionLabels[detail.disposisi_qc]}` : ''}`}
                                    </span>
                                </div>
                                {detail.rework_parent_id && (
                                    <p className="mt-2 text-xs text-primary">
                                        Hasil rework dari progress #
                                        {detail.rework_parent_id}
                                    </p>
                                )}
                                {detail.alasan_qc && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Alasan: {detail.alasan_qc}
                                    </p>
                                )}
                                {detail.qc_status === 'tidak_lolos' &&
                                    !detail.disposisi_qc && (
                                        <LegacyDispositionForm
                                            produksiId={produksi.id}
                                            detail={detail}
                                        />
                                    )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
