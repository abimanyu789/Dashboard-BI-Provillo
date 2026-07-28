import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { stokBahanTransaksiLabel } from '@/lib/domain-labels';
import stokBahanBaku from '@/routes/stok-bahan-baku';
import type { RestockFormData, RestockItemRow, StokBahanBakuCreateProps } from '@/types';

const emptyRow = (): RestockItemRow => ({
    bahan_baku_id: '',
    qty: '',
    keterangan: '',
});

export default function StokBahanBakuCreate({
    bahanBakuList,
    selectedId,
}: StokBahanBakuCreateProps) {
    const { data, setData, post, processing, errors } = useForm<RestockFormData>({
        jenis_transaksi: 'restock',
        items: [emptyRow()],
    });

    // Pre-fill baris pertama jika ada deep-link selectedId
    useEffect(() => {
        if (selectedId) {
            setData('items', [
                { bahan_baku_id: selectedId, qty: '', keterangan: '' },
            ]);
        }
    }, [selectedId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(stokBahanBaku.store.url());
    };

    const addRow = () => {
        setData('items', [...data.items, emptyRow()]);
    };

    const removeRow = (index: number) => {
        if (data.items.length === 1) return; // minimal 1 baris
        setData(
            'items',
            data.items.filter((_, i) => i !== index),
        );
    };

    const updateRow = <K extends keyof RestockItemRow>(
        index: number,
        field: K,
        value: RestockItemRow[K],
    ) => {
        const updated = data.items.map((row, i) =>
            i === index ? { ...row, [field]: value } : row,
        );
        setData('items', updated);
    };

    const isRestock = data.jenis_transaksi === 'restock';

    // IDs yang sudah dipakai di baris lain (cegah duplikat)
    const usedIds = data.items.map((r) => (r.bahan_baku_id !== '' ? Number(r.bahan_baku_id) : null)).filter((id): id is number => id !== null);

    const formatNumber = (v: number) =>
        new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(v);

    // Helper error per baris
    const rowError = (index: number, field: keyof RestockItemRow): string | undefined =>
        (errors as Record<string, string>)[`items.${index}.${field}`];

    const globalItemsError = (errors as Record<string, string>)['items'];

    return (
        <>
            <Head title="Transaksi Stok Bahan Baku" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={stokBahanBaku.index.url()}>
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="size-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Transaksi Stok Bahan Baku
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Catat perubahan stok beberapa bahan baku sekaligus dalam satu transaksi
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="mx-auto w-full max-w-4xl">
                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-6 rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border"
                    >
                        {/* Jenis Transaksi */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="jenis_transaksi">
                                Jenis Transaksi{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.jenis_transaksi}
                                onValueChange={(v) =>
                                    setData(
                                        'jenis_transaksi',
                                        v as RestockFormData['jenis_transaksi'],
                                    )
                                }
                            >
                                <SelectTrigger id="jenis_transaksi" className="w-full max-w-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="restock">Penambahan Stok</SelectItem>
                                    <SelectItem value="penyesuaian">Penyesuaian Stok</SelectItem>
                                </SelectContent>
                            </Select>
                            {(errors as Record<string, string>)['jenis_transaksi'] && (
                                <p className="text-sm text-destructive">
                                    {(errors as Record<string, string>)['jenis_transaksi']}
                                </p>
                            )}
                            {!isRestock && (
                                <p className="text-sm text-muted-foreground">
                                    Penyesuaian: qty positif (+) untuk menambah stok, negatif (−) untuk
                                    mengurangi. Keterangan wajib diisi tiap baris.
                                </p>
                            )}
                        </div>

                        {/* Tabel Item */}
                        <div className="flex flex-col gap-3">
                            <Label>
                                Daftar Bahan Baku{' '}
                                <span className="text-destructive">*</span>
                            </Label>

                            {globalItemsError && (
                                <p className="text-sm text-destructive">{globalItemsError}</p>
                            )}

                            {/* Header kolom */}
                            <div className="hidden grid-cols-[1fr_120px_1fr_40px] gap-3 text-sm font-medium text-muted-foreground sm:grid">
                                <span>Bahan Baku</span>
                                <span>Qty</span>
                                <span>Keterangan</span>
                                <span />
                            </div>

                            {/* Baris item */}
                            <div className="flex flex-col gap-4">
                                {data.items.map((row, index) => {
                                    const selectedBahan = bahanBakuList.find(
                                        (b) => b.id === Number(row.bahan_baku_id),
                                    );
                                    const qtyNum = row.qty === '' ? null : Number(row.qty);
                                    const stokSekarang = selectedBahan?.stok ?? null;
                                    const stokSesudah =
                                        stokSekarang !== null && qtyNum !== null
                                            ? stokSekarang + qtyNum
                                            : null;
                                    const isNegative = stokSesudah !== null && stokSesudah < 0;
                                    const availableOptions = bahanBakuList.filter(
                                        (b) =>
                                            b.id === Number(row.bahan_baku_id) ||
                                            !usedIds.includes(b.id),
                                    );

                                    return (
                                        <div
                                            key={index}
                                            className="rounded-lg border border-sidebar-border/50 bg-muted/20 p-4 dark:border-sidebar-border/50"
                                        >
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_1fr_40px] sm:items-start">
                                                {/* Pilih Bahan Baku */}
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-medium text-muted-foreground sm:hidden">
                                                        Bahan Baku
                                                    </span>
                                                    <SearchableCombobox
                                                        items={availableOptions.map((b) => ({
                                                            value: b.id,
                                                            label: `${b.kode_bahan} — ${b.nama_bahan} (Stok: ${formatNumber(b.stok)} ${b.satuan})`,
                                                        }))}
                                                        value={
                                                            row.bahan_baku_id !== ''
                                                                ? Number(row.bahan_baku_id)
                                                                : ''
                                                        }
                                                        onValueChange={(v) =>
                                                            updateRow(
                                                                index,
                                                                'bahan_baku_id',
                                                                v !== '' ? (Number(v) as number) : '',
                                                            )
                                                        }
                                                        placeholder="Pilih bahan baku..."
                                                        searchPlaceholder="Cari bahan baku..."
                                                        emptyText="Tidak ada bahan baku ditemukan"
                                                    />
                                                    {rowError(index, 'bahan_baku_id') && (
                                                        <p className="text-xs text-destructive">
                                                            {rowError(index, 'bahan_baku_id')}
                                                        </p>
                                                    )}
                                                    {/* Preview stok */}
                                                    {selectedBahan && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span>
                                                                Stok: {formatNumber(selectedBahan.stok)}{' '}
                                                                {selectedBahan.satuan}
                                                            </span>
                                                            {stokSesudah !== null && (
                                                                <>
                                                                    <span>→</span>
                                                                    {isNegative ? (
                                                                        <TrendingDown className="size-3 text-destructive" />
                                                                    ) : (
                                                                        <TrendingUp className="size-3 text-green-600" />
                                                                    )}
                                                                    <span
                                                                        className={
                                                                            isNegative
                                                                                ? 'font-semibold text-destructive'
                                                                                : 'font-semibold text-green-600'
                                                                        }
                                                                    >
                                                                        {formatNumber(stokSesudah)}{' '}
                                                                        {selectedBahan.satuan}
                                                                    </span>
                                                                    {isNegative && (
                                                                        <span className="text-destructive">
                                                                            (stok tidak cukup)
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Qty */}
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-medium text-muted-foreground sm:hidden">
                                                        {isRestock ? 'Jumlah Penambahan Stok' : 'Jumlah Penyesuaian'}
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        step={isRestock ? '0.01' : 'any'}
                                                        placeholder={isRestock ? 'Contoh: 10' : 'Contoh: 5 atau -3'}
                                                        value={row.qty === '' ? '' : String(row.qty)}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                index,
                                                                'qty',
                                                                e.target.value === ''
                                                                    ? ''
                                                                    : Number(e.target.value),
                                                            )
                                                        }
                                                    />
                                                    {rowError(index, 'qty') && (
                                                        <p className="text-xs text-destructive">
                                                            {rowError(index, 'qty')}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Keterangan */}
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-medium text-muted-foreground sm:hidden">
                                                        Keterangan{!isRestock && ' *'}
                                                    </span>
                                                    <Textarea
                                                        placeholder={
                                                            !isRestock
                                                                ? 'Wajib: jelaskan alasan penyesuaian...'
                                                                : 'Catatan tambahan (opsional)...'
                                                        }
                                                        value={row.keterangan}
                                                        onChange={(e) =>
                                                            updateRow(index, 'keterangan', e.target.value)
                                                        }
                                                        rows={2}
                                                        className="resize-none"
                                                    />
                                                    {rowError(index, 'keterangan') && (
                                                        <p className="text-xs text-destructive">
                                                            {rowError(index, 'keterangan')}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Hapus baris */}
                                                <div className="flex items-start justify-end sm:pt-0.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => removeRow(index)}
                                                        disabled={data.items.length === 1}
                                                        title="Hapus baris"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tombol Tambah Baris */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-1 w-fit gap-2"
                                onClick={addRow}
                            >
                                <Plus className="size-4" />
                                Tambah Baris
                            </Button>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 border-t border-sidebar-border/50 pt-4">
                            <Link href={stokBahanBaku.index.url()}>
                                <Button type="button" variant="outline">
                                    Batal
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan Transaksi'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

StokBahanBakuCreate.layout = {
    breadcrumbs: [
        { title: 'Stok', href: '#' },
        { title: 'Bahan Baku', href: stokBahanBaku.index.url() },
        { title: 'Transaksi', href: stokBahanBaku.create.url() },
    ],
};
