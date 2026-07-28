import { router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownToLine,
    ClipboardCheck,
    PackageOpen,
    RotateCcw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import {
    materialAvailabilityLabel,
    materialMovementLabel,
} from '@/lib/domain-labels';
import { createIdempotencyKey } from '@/lib/utils';
import produksiRoute from '@/routes/produksi';
import type {
    MaterialMovementFormData,
    MaterialMovementType,
    MaterialOption,
    MaterialSummary,
    Produksi,
} from '@/types';

interface MaterialMovementPanelProps {
    produksi: Produksi;
    materialSummary: MaterialSummary[];
    materialOptions: MaterialOption[];
}

type BulkQtyMap = Record<number, string>;

/**
 * Sisa kebutuhan rencana — sumber yang sama dengan materialSummary.shortage di backend.
 * Backend menghitung: max(0, planned − max(0, (issued+additional) − returned))
 * dan field summary.issued sudah berisi issued + additional.
 */
function remainingPlannedQty(material: MaterialSummary): number {
    return Math.max(0, material.shortage);
}

function suggestedIssueQty(material: MaterialSummary): number {
    return Math.min(
        remainingPlannedQty(material),
        Math.max(0, material.available),
    );
}

function maxQtyForMovement(
    material: MaterialSummary | undefined,
    movementType: MaterialMovementFormData['movement_type'],
): number | null {
    if (!material) {
        return null;
    }

    if (movementType === 'issued') {
        return Math.min(
            remainingPlannedQty(material),
            Math.max(0, material.available),
        );
    }

    if (movementType === 'additional') {
        return Math.max(0, material.available);
    }

    if (movementType === 'consumed' || movementType === 'returned') {
        return Math.max(0, material.returnable);
    }

    // adjustment: tidak dibatasi di UI selain stok negatif di backend
    return null;
}

function zeroMaxReason(
    material: MaterialSummary | undefined,
    movementType: MaterialMovementFormData['movement_type'],
): string | null {
    if (!material) {
        return null;
    }

    if (movementType === 'issued') {
        if (remainingPlannedQty(material) <= 0.00001) {
            return 'Kebutuhan bahan berdasarkan rencana sudah terpenuhi.';
        }

        if (material.available <= 0.00001) {
            return 'Stok gudang tidak tersedia untuk mengeluarkan bahan.';
        }

        return 'Jumlah maksimum yang dapat dikeluarkan saat ini adalah 0.';
    }

    if (movementType === 'additional') {
        if (material.available <= 0.00001) {
            return 'Stok gudang tidak tersedia untuk bahan tambahan.';
        }

        return 'Jumlah maksimum yang dapat dikeluarkan saat ini adalah 0.';
    }

    if (movementType === 'consumed') {
        return 'Tidak ada sisa bahan yang dapat ditandai sebagai Bahan Terpakai.';
    }

    if (movementType === 'returned') {
        return 'Tidak ada sisa bahan yang dapat dikembalikan ke gudang.';
    }

    return null;
}

export function MaterialMovementPanel({
    produksi: item,
    materialSummary,
    materialOptions,
}: MaterialMovementPanelProps) {
    const { data, setData, post, processing, errors, reset, transform } =
        useForm<MaterialMovementFormData>({
            bahan_baku_id: '',
            movement_type: 'issued',
            qty: '',
            tanggal: new Date().toISOString().slice(0, 10),
            keterangan: '',
            // Generated right before submit / after success (SSR-safe).
            idempotency_key: '',
        });

    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [quickProcessingId, setQuickProcessingId] = useState<number | null>(
        null,
    );
    const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
    const [bulkTanggal, setBulkTanggal] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [bulkKeterangan, setBulkKeterangan] = useState('');
    // Keys are created when the bulk dialog opens or just before request.
    const [bulkRequestKey, setBulkRequestKey] = useState('');
    const [bulkQtys, setBulkQtys] = useState<BulkQtyMap>(() => {
        const initial: BulkQtyMap = {};
        materialSummary.forEach((material) => {
            initial[material.id] = suggestedIssueQty(material).toFixed(2);
        });

        return initial;
    });
    const [itemIdempotency, setItemIdempotency] = useState<
        Record<number, string>
    >({});

    const selectedMaterial = materialSummary.find(
        (material) => material.id === Number(data.bahan_baku_id),
    );
    const remainingForSelected = selectedMaterial
        ? remainingPlannedQty(selectedMaterial)
        : 0;
    const planAlreadyFulfilled =
        data.movement_type === 'issued' &&
        !!selectedMaterial &&
        remainingForSelected <= 0.00001;
    // Cap qty dari sumber summary yang sama dengan backend.
    const maxForSelected = maxQtyForMovement(
        selectedMaterial,
        data.movement_type,
    );
    const qtyNumber = Number(data.qty || 0);
    const exceedsMax =
        maxForSelected !== null &&
        qtyNumber > 0 &&
        qtyNumber - maxForSelected > 0.00001;
    const maxIsZero =
        maxForSelected !== null &&
        maxForSelected <= 0.00001 &&
        !!selectedMaterial;
    const zeroReason = maxIsZero
        ? zeroMaxReason(selectedMaterial, data.movement_type)
        : null;
    const projectedStockAfter =
        selectedMaterial &&
        (data.movement_type === 'issued' ||
            data.movement_type === 'additional') &&
        qtyNumber > 0
            ? selectedMaterial.available - qtyNumber
            : selectedMaterial &&
                data.movement_type === 'returned' &&
                qtyNumber > 0
              ? selectedMaterial.available + qtyNumber
              : null;
    const maxLimitLabel =
        data.movement_type === 'issued'
            ? 'batas sisa rencana & stok gudang'
            : data.movement_type === 'additional'
              ? 'stok gudang tersedia'
              : data.movement_type === 'consumed' ||
                  data.movement_type === 'returned'
                ? 'maksimum yang dapat ditandai/dikembalikan'
                : 'batas pergerakan';
    const canSubmitManual =
        !processing &&
        !exceedsMax &&
        !maxIsZero &&
        !planAlreadyFulfilled &&
        data.bahan_baku_id !== '' &&
        qtyNumber !== 0;

    const needsIssue = useMemo(
        () =>
            materialSummary.some(
                (material) => remainingPlannedQty(material) > 0.00001,
            ),
        [materialSummary],
    );
    const hasShortage = materialSummary.some(
        (material) => material.status === 'shortage',
    );
    const hasReturnable = materialSummary.some(
        (material) => material.returnable > 0.00001,
    );

    const bulkItemsPreview = materialSummary
        .map((material) => {
            const qty = Number(bulkQtys[material.id] || 0);

            return { material, qty };
        })
        .filter((row) => row.qty > 0.00001);

    const openBulkDialog = () => {
        const nextQtys: BulkQtyMap = {};
        const nextKeys: Record<number, string> = {};
        materialSummary.forEach((material) => {
            nextQtys[material.id] = suggestedIssueQty(material).toFixed(2);
            nextKeys[material.id] = createIdempotencyKey();
        });
        setBulkQtys(nextQtys);
        setItemIdempotency(nextKeys);
        setBulkRequestKey(createIdempotencyKey());
        setBulkTanggal(new Date().toISOString().slice(0, 10));
        setBulkKeterangan('');
        setBulkOpen(true);
    };

    const confirmBulkIssue = () => {
        const requestKey = bulkRequestKey || createIdempotencyKey();

        if (!bulkRequestKey) {
            setBulkRequestKey(requestKey);
        }

        const nextItemKeys = { ...itemIdempotency };
        const items = bulkItemsPreview.map(({ material, qty }) => {
            const key = nextItemKeys[material.id] ?? createIdempotencyKey();
            nextItemKeys[material.id] = key;

            return {
                bahan_baku_id: material.id,
                qty,
                idempotency_key: key,
            };
        });

        if (items.length === 0) {
            return;
        }

        setItemIdempotency(nextItemKeys);
        setBulkProcessing(true);
        router.post(
            produksiRoute.materialMovements.bulkIssue.url(item.id),
            {
                tanggal: bulkTanggal,
                keterangan: bulkKeterangan || null,
                request_key: requestKey,
                items,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBulkConfirmOpen(false);
                    setBulkOpen(false);
                    setBulkRequestKey(createIdempotencyKey());
                },
                onFinish: () => {
                    // Always re-enable on success and error so retries work.
                    setBulkProcessing(false);
                },
            },
        );
    };

    const issueRemainingForMaterial = (material: MaterialSummary) => {
        const qty = suggestedIssueQty(material);

        if (qty <= 0.00001) {
            return;
        }

        setQuickProcessingId(material.id);
        router.post(
            produksiRoute.materialMovements.store.url(item.id),
            {
                bahan_baku_id: material.id,
                movement_type: 'issued',
                qty,
                tanggal: new Date().toISOString().slice(0, 10),
                keterangan: `Pengeluaran sisa kebutuhan rencana untuk ${material.nama_bahan}`,
                idempotency_key: createIdempotencyKey(),
            },
            {
                preserveScroll: true,
                onFinish: () => setQuickProcessingId(null),
            },
        );
    };

    const submitManual = (event: React.FormEvent) => {
        event.preventDefault();

        if (!canSubmitManual) {
            return;
        }

        if (data.movement_type === 'returned') {
            // Key is prepared before the confirm dialog so retry uses the same value.
            if (!data.idempotency_key) {
                setData('idempotency_key', createIdempotencyKey());
            }

            setReturnConfirmOpen(true);

            return;
        }

        const key = data.idempotency_key || createIdempotencyKey();
        transform((formData) => ({
            ...formData,
            idempotency_key: key,
        }));

        post(produksiRoute.materialMovements.store.url(item.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset('qty', 'keterangan');
                setData('idempotency_key', createIdempotencyKey());
            },
        });
    };

    const confirmReturn = () => {
        const key = data.idempotency_key || createIdempotencyKey();
        transform((formData) => ({
            ...formData,
            idempotency_key: key,
        }));

        post(produksiRoute.materialMovements.store.url(item.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset('qty', 'keterangan');
                setData('idempotency_key', createIdempotencyKey());
                setReturnConfirmOpen(false);
            },
            onError: () => setReturnConfirmOpen(false),
        });
    };

    if (item.status === 'draft') {
        return (
            <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Status Material Produksi
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Mulai produksi terlebih dahulu untuk menghitung rencana
                    kebutuhan BOM. Stok gudang belum berkurang sampai bahan
                    dikeluarkan.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {item.status === 'proses' && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="size-4" />
                                Produksi telah dimulai
                            </p>
                            <p className="text-sm text-amber-900/90 dark:text-amber-200/90">
                                Produksi telah dimulai. Kebutuhan bahan sudah
                                dihitung, tetapi stok belum dikurangi. Keluarkan
                                bahan dari gudang untuk mencatat perubahan stok.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Rencana kebutuhan tidak mengubah stok. Menandai
                                bahan sebagai terpakai tidak mengurangi stok
                                kembali.
                            </p>
                        </div>
                        <Button type="button" onClick={openBulkDialog}>
                            <PackageOpen className="mr-2 size-4" />
                            Keluarkan Bahan untuk Produksi
                        </Button>
                    </div>
                    {hasShortage && (
                        <p className="mt-3 text-sm text-destructive">
                            Ada bahan dengan stok kurang. Produksi tetap bisa
                            berjalan, tetapi pengeluaran massal dibatasi stok
                            gudang.
                        </p>
                    )}
                    {hasReturnable && (
                        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                            Masih ada bahan yang sudah dikeluarkan tetapi belum
                            ditandai terpakai atau dikembalikan.
                        </p>
                    )}
                </div>
            )}

            <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                <div className="border-b px-6 py-4">
                    <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        Status Material Produksi
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Stok berkurang saat Bahan Dikeluarkan / Bahan Tambahan
                        Dikeluarkan, bukan saat Rencana Kebutuhan atau Bahan
                        Terpakai.
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
                                    Stok Gudang
                                </TableHead>
                                <TableHead className="text-right">
                                    Dikeluarkan
                                </TableHead>
                                <TableHead className="text-right">
                                    Terpakai
                                </TableHead>
                                <TableHead className="text-right">
                                    Dikembalikan
                                </TableHead>
                                <TableHead className="text-right">
                                    Sisa Rencana
                                </TableHead>
                                <TableHead>Status</TableHead>
                                {item.status === 'proses' && (
                                    <TableHead className="text-right">
                                        Aksi
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materialSummary.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={
                                            item.status === 'proses' ? 9 : 8
                                        }
                                        className="py-8 text-center text-muted-foreground"
                                    >
                                        Belum ada data material.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                materialSummary.map((material) => {
                                    const remaining =
                                        remainingPlannedQty(material);
                                    const suggested =
                                        suggestedIssueQty(material);

                                    return (
                                        <TableRow key={material.id}>
                                            <TableCell>
                                                <p className="font-medium">
                                                    {material.nama_bahan}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {material.kode_bahan}
                                                    {material.satuan
                                                        ? ` · ${material.satuan}`
                                                        : ''}
                                                </p>
                                            </TableCell>
                                            {[
                                                material.planned,
                                                material.available,
                                                material.issued,
                                                material.consumed,
                                                material.returned,
                                                remaining,
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
                                                        material.status ===
                                                        'shortage'
                                                            ? 'text-destructive'
                                                            : material.status ===
                                                                'fulfilled'
                                                              ? 'text-green-600 dark:text-green-400'
                                                              : 'text-amber-600 dark:text-amber-400'
                                                    }
                                                >
                                                    {materialAvailabilityLabel(
                                                        material.status,
                                                    )}
                                                </span>
                                            </TableCell>
                                            {item.status === 'proses' && (
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={
                                                            suggested <=
                                                                0.00001 ||
                                                            quickProcessingId ===
                                                                material.id ||
                                                            bulkProcessing
                                                        }
                                                        onClick={() =>
                                                            issueRemainingForMaterial(
                                                                material,
                                                            )
                                                        }
                                                    >
                                                        {quickProcessingId ===
                                                        material.id
                                                            ? 'Memproses...'
                                                            : 'Keluarkan Sesuai Sisa Kebutuhan'}
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {item.status === 'proses' && (
                <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                            Form Manual Pergerakan Bahan
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Untuk kasus khusus (bahan tambahan, penyesuaian,
                            pengembalian, atau qty partial). Umumnya gunakan
                            tombol Keluarkan Bahan untuk Produksi.
                        </p>
                    </div>

                    <form
                        onSubmit={submitManual}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <div className="space-y-1.5">
                            <Label>Bahan baku</Label>
                            <SearchableCombobox
                                items={materialOptions.map((option) => ({
                                    value: option.id,
                                    label: `${option.kode_bahan} — ${option.nama_bahan} (stok ${Number(option.stok).toFixed(2)})`,
                                }))}
                                value={
                                    data.bahan_baku_id === ''
                                        ? ''
                                        : String(data.bahan_baku_id)
                                }
                                onValueChange={(value) =>
                                    setData(
                                        'bahan_baku_id',
                                        value === '' ? '' : Number(value),
                                    )
                                }
                                placeholder="Pilih bahan kebutuhan BOM..."
                                emptyText="Tidak ada bahan pada rencana produksi."
                            />
                            <p className="text-xs text-muted-foreground">
                                Hanya menampilkan bahan dari kebutuhan BOM
                                produksi ini.
                            </p>
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
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih jenis..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {(
                                        [
                                            'issued',
                                            'additional',
                                            'consumed',
                                            'returned',
                                            'adjustment',
                                        ] as Exclude<
                                            MaterialMovementType,
                                            'planned'
                                        >[]
                                    ).map((type) => (
                                        <SelectItem
                                            key={type}
                                            value={type}
                                            disabled={
                                                type === 'issued' &&
                                                planAlreadyFulfilled
                                            }
                                        >
                                            {materialMovementLabel(type)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {planAlreadyFulfilled && (
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    Kebutuhan bahan berdasarkan rencana sudah
                                    terpenuhi. Gunakan Bahan Tambahan
                                    Dikeluarkan untuk kelebihan di luar rencana.
                                </p>
                            )}
                            {errors.movement_type && (
                                <p className="text-sm text-destructive">
                                    {errors.movement_type}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Jumlah</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={data.qty}
                                disabled={maxIsZero || planAlreadyFulfilled}
                                onChange={(event) => {
                                    const next = event.target.value;

                                    setData(
                                        'qty',
                                        next === '' ? '' : Number(next),
                                    );
                                }}
                            />
                            {selectedMaterial &&
                                data.movement_type !== 'adjustment' && (
                                    <div className="space-y-0.5 text-xs text-muted-foreground">
                                        {(data.movement_type === 'issued' ||
                                            data.movement_type ===
                                                'additional') && (
                                            <>
                                                <p>
                                                    Sisa kebutuhan rencana:{' '}
                                                    <span className="font-mono text-foreground">
                                                        {remainingForSelected.toFixed(
                                                            2,
                                                        )}{' '}
                                                        {
                                                            selectedMaterial.satuan
                                                        }
                                                    </span>
                                                </p>
                                                <p>
                                                    Stok gudang:{' '}
                                                    <span className="font-mono text-foreground">
                                                        {selectedMaterial.available.toFixed(
                                                            2,
                                                        )}{' '}
                                                        {
                                                            selectedMaterial.satuan
                                                        }
                                                    </span>
                                                </p>
                                            </>
                                        )}
                                        {(data.movement_type === 'consumed' ||
                                            data.movement_type ===
                                                'returned') && (
                                            <p>
                                                Sisa bahan yang dapat diproses:{' '}
                                                <span className="font-mono text-foreground">
                                                    {selectedMaterial.returnable.toFixed(
                                                        2,
                                                    )}{' '}
                                                    {selectedMaterial.satuan}
                                                </span>
                                            </p>
                                        )}
                                        {maxForSelected !== null && (
                                            <p>
                                                Jumlah maksimum ({maxLimitLabel}
                                                ):{' '}
                                                <span className="font-mono text-foreground">
                                                    {maxForSelected.toFixed(2)}{' '}
                                                    {selectedMaterial.satuan}
                                                </span>
                                            </p>
                                        )}
                                        {projectedStockAfter !== null && (
                                            <p>
                                                Perkiraan stok gudang setelah
                                                transaksi:{' '}
                                                <span className="font-mono text-foreground">
                                                    {projectedStockAfter.toFixed(
                                                        2,
                                                    )}{' '}
                                                    {selectedMaterial.satuan}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            {zeroReason && (
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    {zeroReason}
                                </p>
                            )}
                            {exceedsMax && (
                                <p className="text-sm font-medium text-destructive">
                                    Jumlah melebihi {maxLimitLabel} (
                                    {maxForSelected?.toFixed(2)}
                                    {selectedMaterial
                                        ? ` ${selectedMaterial.satuan}`
                                        : ''}{' '}
                                    ).
                                </p>
                            )}
                            {errors.qty && (
                                <p className="text-sm text-destructive">
                                    {errors.qty}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Tanggal</Label>
                            <Input
                                type="date"
                                value={data.tanggal}
                                onChange={(event) =>
                                    setData('tanggal', event.target.value)
                                }
                            />
                            {errors.tanggal && (
                                <p className="text-sm text-destructive">
                                    {errors.tanggal}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label>
                                Keterangan
                                {data.movement_type === 'adjustment'
                                    ? ' *'
                                    : ''}
                            </Label>
                            <Textarea
                                value={data.keterangan}
                                onChange={(event) =>
                                    setData('keterangan', event.target.value)
                                }
                                placeholder={
                                    data.movement_type === 'consumed'
                                        ? 'Opsional — menandai Bahan Terpakai tidak mengurangi stok kembali'
                                        : data.movement_type === 'returned'
                                          ? 'Alasan pengembalian (opsional)'
                                          : 'Catatan pergerakan'
                                }
                            />
                            {errors.keterangan && (
                                <p className="text-sm text-destructive">
                                    {errors.keterangan}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <Button type="submit" disabled={!canSubmitManual}>
                                <ArrowDownToLine className="mr-2 size-4" />
                                {processing
                                    ? 'Menyimpan...'
                                    : 'Simpan Pergerakan'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                <div className="border-b px-6 py-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        <ClipboardCheck className="size-4" />
                        Riwayat Material Produksi
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Rencana kebutuhan tampil di sini saja dan tidak masuk
                        riwayat stok gudang.
                    </p>
                </div>
                <div className="space-y-3 p-4">
                    {(item.material_movements ?? []).length === 0 ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                            Belum ada pergerakan material.
                        </p>
                    ) : (
                        (item.material_movements ?? []).map((movement) => (
                            <div
                                key={movement.id}
                                className="rounded-lg border border-sidebar-border/60 px-4 py-3"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-medium">
                                            {materialMovementLabel(
                                                movement.movement_type,
                                            )}
                                            {' · '}
                                            {movement.bahan_baku?.nama_bahan ??
                                                `Bahan #${movement.bahan_baku_id}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {movement.bahan_baku?.kode_bahan}
                                            {movement.created_by?.name
                                                ? ` · oleh ${movement.created_by.name}`
                                                : ''}
                                        </p>
                                        {movement.movement_type ===
                                            'planned' && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Rencana kebutuhan tidak mengubah
                                                stok.
                                            </p>
                                        )}
                                        {movement.movement_type ===
                                            'consumed' && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Menandai bahan sebagai terpakai
                                                tidak mengurangi stok kembali.
                                            </p>
                                        )}
                                        {movement.keterangan && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {movement.keterangan}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono font-semibold">
                                            {Number(movement.qty).toFixed(2)}
                                        </p>
                                        {movement.stok_history && (
                                            <p className="text-xs text-muted-foreground">
                                                Stok{' '}
                                                {
                                                    movement.stok_history
                                                        .stok_sebelum
                                                }{' '}
                                                →{' '}
                                                {
                                                    movement.stok_history
                                                        .stok_sesudah
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {hasReturnable && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RotateCcw className="size-3.5" /> Saat produksi dibatalkan,
                    hanya bahan yang sudah dikeluarkan dan belum terpakai yang
                    dikembalikan.
                </p>
            )}

            {/* Bulk issue dialog */}
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>
                            Keluarkan Bahan untuk Produksi #{item.id}
                        </DialogTitle>
                        <DialogDescription>
                            Isi qty pengeluaran per bahan. Saran otomatis =
                            min(sisa rencana, stok gudang). Stok baru berkurang
                            setelah konfirmasi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>Tanggal pengeluaran</Label>
                            <Input
                                type="date"
                                value={bulkTanggal}
                                onChange={(event) =>
                                    setBulkTanggal(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Keterangan (opsional)</Label>
                            <Input
                                value={bulkKeterangan}
                                onChange={(event) =>
                                    setBulkKeterangan(event.target.value)
                                }
                                placeholder="Catatan pengeluaran massal"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead className="text-right">
                                        Rencana
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Sudah Keluar
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Sisa Rencana
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Stok Gudang
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Saran
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Qty Keluar
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {materialSummary.map((material) => {
                                    const remaining =
                                        remainingPlannedQty(material);
                                    const suggested =
                                        suggestedIssueQty(material);
                                    const qtyValue = Number(
                                        bulkQtys[material.id] || 0,
                                    );
                                    const invalid =
                                        qtyValue < 0 ||
                                        qtyValue - material.available >
                                            0.00001 ||
                                        (material.planned > 0 &&
                                            qtyValue - remaining > 0.00001);

                                    return (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-mono text-xs">
                                                {material.kode_bahan}
                                            </TableCell>
                                            <TableCell>
                                                {material.nama_bahan}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {material.planned.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {material.issued.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {remaining.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {material.available.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {suggested.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    className={`ml-auto w-28 text-right font-mono ${invalid ? 'border-destructive' : ''}`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={
                                                        bulkQtys[material.id] ??
                                                        '0'
                                                    }
                                                    onChange={(event) =>
                                                        setBulkQtys(
                                                            (current) => ({
                                                                ...current,
                                                                [material.id]:
                                                                    event.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            {needsIssue
                                ? `${bulkItemsPreview.length} bahan akan dikeluarkan.`
                                : 'Semua rencana sudah terpenuhi atau tidak ada qty yang bisa dikeluarkan.'}
                        </p>
                        <div className="flex gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="button"
                                disabled={
                                    bulkItemsPreview.length === 0 ||
                                    bulkProcessing ||
                                    bulkItemsPreview.some(
                                        ({ material, qty }) => {
                                            const remaining =
                                                remainingPlannedQty(material);

                                            return (
                                                qty < 0 ||
                                                qty - material.available >
                                                    0.00001 ||
                                                (material.planned > 0 &&
                                                    qty - remaining > 0.00001)
                                            );
                                        },
                                    )
                                }
                                onClick={() => setBulkConfirmOpen(true)}
                            >
                                Lanjut Konfirmasi
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pengeluaran Bahan</DialogTitle>
                        <DialogDescription>
                            Stok gudang akan berkurang untuk{' '}
                            {bulkItemsPreview.length} bahan pada Produksi #
                            {item.id}. Lanjutkan?
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                        {bulkItemsPreview.map(({ material, qty }) => (
                            <li
                                key={material.id}
                                className="flex justify-between gap-3"
                            >
                                <span>
                                    {material.kode_bahan} —{' '}
                                    {material.nama_bahan}
                                </span>
                                <span className="font-mono">
                                    {qty.toFixed(2)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkConfirmOpen(false)}
                            disabled={bulkProcessing}
                        >
                            Kembali
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmBulkIssue}
                            disabled={bulkProcessing}
                        >
                            {bulkProcessing
                                ? 'Memproses...'
                                : 'Ya, Keluarkan Bahan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={returnConfirmOpen}
                onOpenChange={setReturnConfirmOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pengembalian Bahan</DialogTitle>
                        <DialogDescription>
                            Bahan yang dikembalikan akan menambah stok gudang.
                            Maksimum untuk bahan terpilih:{' '}
                            {maxForSelected?.toFixed(2) ?? '0'}. Lanjutkan?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReturnConfirmOpen(false)}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmReturn}
                            disabled={processing || exceedsMax}
                        >
                            {processing
                                ? 'Memproses...'
                                : 'Ya, Kembalikan Bahan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
