import { useForm } from '@inertiajs/react';
import { ArrowDownToLine, ClipboardCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import produksiRoute from '@/routes/produksi';
import type {
    MaterialMovementFormData,
    MaterialMovementType,
    MaterialOption,
    MaterialSummary,
    Produksi,
} from '@/types';

const movementLabels: Record<MaterialMovementType, string> = {
    planned: 'Terencana',
    issued: 'Diterbitkan',
    consumed: 'Digunakan',
    additional: 'Tambahan',
    returned: 'Dikembalikan',
    adjustment: 'Penyesuaian',
};

interface MaterialMovementPanelProps {
    produksi: Produksi;
    materialSummary: MaterialSummary[];
    materialOptions: MaterialOption[];
}

export function MaterialMovementPanel({
    produksi: item,
    materialSummary,
    materialOptions,
}: MaterialMovementPanelProps) {
    const { data, setData, post, processing, errors, reset } =
        useForm<MaterialMovementFormData>({
            bahan_baku_id: '',
            movement_type: 'issued',
            qty: '',
            tanggal: new Date().toISOString().slice(0, 10),
            keterangan: '',
            idempotency_key: crypto.randomUUID(),
        });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        post(produksiRoute.materialMovements.store.url(item.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset('qty', 'keterangan');
                setData('idempotency_key', crypto.randomUUID());
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                <div className="border-b px-6 py-4">
                    <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        Status Material Produksi
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Stok berkurang saat bahan diterbitkan, bukan saat
                        kebutuhan BOM direncanakan atau bahan ditandai sudah
                        digunakan.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bahan</TableHead>
                                <TableHead className="text-right">
                                    Rencana
                                </TableHead>
                                <TableHead className="text-right">
                                    Tersedia
                                </TableHead>
                                <TableHead className="text-right">
                                    Terbit
                                </TableHead>
                                <TableHead className="text-right">
                                    Digunakan
                                </TableHead>
                                <TableHead className="text-right">
                                    Kembali
                                </TableHead>
                                <TableHead className="text-right">
                                    Kekurangan
                                </TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materialSummary.map((material) => (
                                <TableRow key={material.id}>
                                    <TableCell>
                                        <p className="font-medium">
                                            {material.nama_bahan}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {material.kode_bahan}
                                        </p>
                                    </TableCell>
                                    {[
                                        material.planned,
                                        material.available,
                                        material.issued,
                                        material.consumed,
                                        material.returned,
                                        material.shortage,
                                    ].map((value, index) => (
                                        <TableCell
                                            key={index}
                                            className="text-right font-mono"
                                        >
                                            {value.toFixed(2)}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <span
                                            className={
                                                material.status === 'shortage'
                                                    ? 'text-destructive'
                                                    : material.status ===
                                                        'fulfilled'
                                                      ? 'text-green-600 dark:text-green-400'
                                                      : 'text-amber-600 dark:text-amber-400'
                                            }
                                        >
                                            {material.status === 'shortage'
                                                ? 'Kekurangan'
                                                : material.status ===
                                                    'fulfilled'
                                                  ? 'Terpenuhi'
                                                  : 'Cukup tersedia'}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {item.status === 'proses' && (
                <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        <ArrowDownToLine className="size-4" /> Catat Pergerakan
                        Bahan
                    </h2>
                    <form
                        onSubmit={submit}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <div className="space-y-1.5">
                            <Label>Bahan baku</Label>
                            <SearchableCombobox
                                items={materialOptions.map((material) => ({
                                    value: material.id,
                                    label: `${material.kode_bahan} — ${material.nama_bahan} (stok ${material.stok} ${material.satuan ?? ''})`,
                                }))}
                                value={data.bahan_baku_id}
                                onValueChange={(value) =>
                                    setData('bahan_baku_id', Number(value))
                                }
                                placeholder="Pilih bahan..."
                            />
                            {errors.bahan_baku_id && (
                                <p className="text-sm text-destructive">
                                    {errors.bahan_baku_id}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Jenis pergerakan</Label>
                            <Select
                                value={data.movement_type}
                                onValueChange={(value) =>
                                    setData(
                                        'movement_type',
                                        value as MaterialMovementFormData['movement_type'],
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="issued">
                                        Diterbitkan
                                    </SelectItem>
                                    <SelectItem value="consumed">
                                        Digunakan
                                    </SelectItem>
                                    <SelectItem value="additional">
                                        Tambahan
                                    </SelectItem>
                                    <SelectItem value="returned">
                                        Dikembalikan
                                    </SelectItem>
                                    <SelectItem value="adjustment">
                                        Penyesuaian
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="material_qty">Jumlah</Label>
                            <Input
                                id="material_qty"
                                type="number"
                                step="0.01"
                                value={data.qty}
                                onChange={(event) =>
                                    setData(
                                        'qty',
                                        event.target.value === ''
                                            ? ''
                                            : Number(event.target.value),
                                    )
                                }
                            />
                            {errors.qty && (
                                <p className="text-sm text-destructive">
                                    {errors.qty}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="material_tanggal">Tanggal</Label>
                            <Input
                                id="material_tanggal"
                                type="date"
                                value={data.tanggal}
                                onChange={(event) =>
                                    setData('tanggal', event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="material_note">
                                {data.movement_type === 'adjustment'
                                    ? 'Alasan penyesuaian'
                                    : 'Keterangan'}
                            </Label>
                            <Textarea
                                id="material_note"
                                value={data.keterangan}
                                onChange={(event) =>
                                    setData('keterangan', event.target.value)
                                }
                            />
                            {errors.keterangan && (
                                <p className="text-sm text-destructive">
                                    {errors.keterangan}
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="md:col-span-2"
                        >
                            {processing ? 'Menyimpan...' : 'Catat Pergerakan'}
                        </Button>
                    </form>
                </div>
            )}

            <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                <div className="border-b px-6 py-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        <ClipboardCheck className="size-4" /> Riwayat Pergerakan
                        Material
                    </h2>
                </div>
                {(item.material_movements ?? []).length === 0 ? (
                    <p className="px-6 py-8 text-sm text-muted-foreground">
                        Belum ada pergerakan material.
                    </p>
                ) : (
                    <div className="divide-y">
                        {(item.material_movements ?? []).map((movement) => (
                            <div
                                key={movement.id}
                                className="grid gap-2 px-6 py-4 text-sm md:grid-cols-[140px_1fr_auto]"
                            >
                                <div>
                                    <p className="font-medium">
                                        {movementLabels[movement.movement_type]}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(
                                            movement.tanggal,
                                        ).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <div>
                                    <p>
                                        {movement.bahan_baku?.nama_bahan ?? '-'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {movement.keterangan ||
                                            'Tanpa keterangan'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-medium">
                                        {movement.qty.toFixed(2)}{' '}
                                        {movement.bahan_baku?.satuan}
                                    </p>
                                    {movement.stok_history && (
                                        <p className="text-xs text-muted-foreground">
                                            Stok{' '}
                                            {movement.stok_history.stok_sebelum}{' '}
                                            →{' '}
                                            {movement.stok_history.stok_sesudah}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {materialSummary.some((material) => material.returnable > 0) && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RotateCcw className="size-3.5" /> Saat produksi dibatalkan,
                    hanya bahan terbit yang belum digunakan yang dikembalikan.
                </p>
            )}
        </div>
    );
}
