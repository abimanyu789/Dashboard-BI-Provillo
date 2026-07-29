import { Link } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
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
import { jenisPembayaranPesananLabel } from '@/lib/domain-labels';
import type {
    CustomerOption,
    PesananFormData,
    PesananItemFormData,
    PesananProdukOption,
} from '@/types';

interface PesananFormProps {
    data: PesananFormData;
    setData: <K extends keyof PesananFormData>(
        key: K,
        value: PesananFormData[K],
    ) => void;
    errors: Partial<Record<string, string>>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    cancelHref: string;
    submitLabel?: string;
    mode: 'create' | 'edit';
    customers: CustomerOption[];
    produks: PesananProdukOption[];
}

export function PesananForm({
    data,
    setData,
    errors,
    processing,
    onSubmit,
    cancelHref,
    submitLabel,
    mode,
    customers,
    produks,
}: PesananFormProps) {
    const defaultLabel =
        mode === 'create' ? 'Simpan Pesanan' : 'Simpan Perubahan';

    // ─── Kalkulasi real-time ──────────────────────────────────────────────────

    const subtotal = data.items.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const harga = Number(item.harga) || 0;
        return sum + qty * harga;
    }, 0);

    const nilaiDiskon = (() => {
        const d = Number(data.diskon) || 0;
        if (d <= 0) return 0;
        return data.tipe_diskon === 'persen'
            ? Math.round(subtotal * (d / 100))
            : d;
    })();

    const total = Math.max(
        0,
        subtotal - nilaiDiskon + (Number(data.ongkir) || 0),
    );

    // ─── Item helpers ─────────────────────────────────────────────────────────

    const addItem = () => {
        setData('items', [
            ...data.items,
            { produk_id: '', qty: '', harga: '' },
        ]);
    };

    const removeItem = (idx: number) => {
        setData(
            'items',
            data.items.filter((_, i) => i !== idx),
        );
    };

    const updateItem = (
        idx: number,
        field: keyof PesananItemFormData,
        value: string | number,
    ) => {
        const updated = data.items.map((item, i) =>
            i === idx ? { ...item, [field]: value } : item,
        ) as PesananItemFormData[];
        setData('items', updated);
    };

    // Auto-fill harga dari harga_jual produk — satu operasi untuk hindari stale closure
    const handleProdukChange = (idx: number, produkId: number) => {
        const produk = produks.find((p) => p.id === produkId);
        const harga = produk?.harga_jual ? Number(produk.harga_jual) : '';

        const updated = data.items.map((item, i) =>
            i === idx ? { ...item, produk_id: produkId, harga } : item,
        ) as PesananItemFormData[];
        setData('items', updated);
    };

    const formatRupiah = (value: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {/* ─── Header Info ─────────────────────────────────────────── */}
            <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                <h2 className="mb-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Informasi Pesanan
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Customer */}
                    <div className="space-y-2">
                        <Label htmlFor="customer_id">
                            Customer <span className="text-red-500">*</span>
                        </Label>
                        <SearchableCombobox
                            items={customers.map((c) => ({
                                value: c.id,
                                label: `${c.nama_customer} (${c.jenis_customer.toUpperCase()})`,
                            }))}
                            value={data.customer_id !== '' ? Number(data.customer_id) : ''}
                            onValueChange={(v) => setData('customer_id', Number(v))}
                            placeholder="Pilih customer..."
                            className={errors.customer_id ? 'border-red-500' : ''}
                        />
                        {errors.customer_id && (
                            <p className="text-sm text-red-500">
                                {errors.customer_id}
                            </p>
                        )}
                    </div>

                    {/* Tanggal */}
                    <div className="space-y-2">
                        <Label htmlFor="tanggal">
                            Tanggal Pesanan{' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="tanggal"
                            type="date"
                            value={data.tanggal}
                            onChange={(e) => setData('tanggal', e.target.value)}
                            className={errors.tanggal ? 'border-red-500' : ''}
                        />
                        {errors.tanggal && (
                            <p className="text-sm text-red-500">
                                {errors.tanggal}
                            </p>
                        )}
                    </div>

                    {/* Jenis Pembayaran */}
                    <div className="space-y-2">
                        <Label htmlFor="jenis_pembayaran">
                            Jenis Pembayaran
                        </Label>
                        <Select
                            value={data.jenis_pembayaran || 'none'}
                            onValueChange={(v) =>
                                setData(
                                    'jenis_pembayaran',
                                    v === 'none'
                                        ? ''
                                        : (v as import('@/types').JenisPembayaranPesanan),
                                )
                            }
                        >
                            <SelectTrigger id="jenis_pembayaran">
                                <SelectValue placeholder="Pilih jenis pembayaran..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    Belum ditentukan
                                </SelectItem>
                                <SelectItem value="dp">
                                    {jenisPembayaranPesananLabel('dp')}
                                </SelectItem>
                                <SelectItem value="lunas">
                                    {jenisPembayaranPesananLabel('lunas')}
                                </SelectItem>
                                <SelectItem value="bertahap">
                                    {jenisPembayaranPesananLabel('bertahap')}
                                </SelectItem>
                                <SelectItem value="cod">
                                    {jenisPembayaranPesananLabel('cod')}
                                </SelectItem>
                                <SelectItem value="termin">
                                    {jenisPembayaranPesananLabel('termin')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.jenis_pembayaran && (
                            <p className="text-sm text-red-500">
                                {errors.jenis_pembayaran}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Item Produk ─────────────────────────────────────────── */}
            <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        Item Produk
                    </h2>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                    >
                        <Plus className="mr-1 size-3.5" />
                        Tambah Produk
                    </Button>
                </div>

                {errors.items && (
                    <p className="mb-3 text-sm text-red-500">{errors.items}</p>
                )}

                <div className="space-y-3">
                    {data.items.map((item, idx) => {
                        const itemSubtotal =
                            (Number(item.qty) || 0) * (Number(item.harga) || 0);
                        const produkError = errors[`items.${idx}.produk_id`];
                        const qtyError = errors[`items.${idx}.qty`];
                        const hargaError = errors[`items.${idx}.harga`];

                        return (
                            <div
                                key={idx}
                                className="grid grid-cols-[1fr_100px_140px_120px_40px] items-end gap-2"
                            >
                                {/* Produk */}
                                <div className="space-y-1">
                                    {idx === 0 && (
                                        <Label className="text-xs text-muted-foreground">
                                            Produk
                                        </Label>
                                    )}
                                    <SearchableCombobox
                                        items={produks.map((p) => ({
                                            value: p.id,
                                            label: `${p.kode_produk} — ${p.nama_produk}`,
                                        }))}
                                        value={item.produk_id !== '' ? Number(item.produk_id) : ''}
                                        onValueChange={(v) => handleProdukChange(idx, Number(v))}
                                        placeholder="Pilih produk..."
                                        className={produkError ? 'border-red-500' : ''}
                                    />
                                    {produkError && (
                                        <p className="text-xs text-red-500">
                                            {produkError}
                                        </p>
                                    )}
                                </div>

                                {/* Qty */}
                                <div className="space-y-1">
                                    {idx === 0 && (
                                        <Label className="text-xs text-muted-foreground">
                                            Qty
                                        </Label>
                                    )}
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="0"
                                        value={item.qty}
                                        onChange={(e) =>
                                            updateItem(
                                                idx,
                                                'qty',
                                                e.target.value === ''
                                                    ? ''
                                                    : Number(e.target.value),
                                            )
                                        }
                                        className={
                                            qtyError ? 'border-red-500' : ''
                                        }
                                    />
                                    {qtyError && (
                                        <p className="text-xs text-red-500">
                                            {qtyError}
                                        </p>
                                    )}
                                </div>

                                {/* Harga */}
                                <div className="space-y-1">
                                    {idx === 0 && (
                                        <Label className="text-xs text-muted-foreground">
                                            Harga (Rp)
                                        </Label>
                                    )}
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={item.harga}
                                        onChange={(e) =>
                                            updateItem(
                                                idx,
                                                'harga',
                                                e.target.value === ''
                                                    ? ''
                                                    : Number(e.target.value),
                                            )
                                        }
                                        className={
                                            hargaError ? 'border-red-500' : ''
                                        }
                                    />
                                    {hargaError && (
                                        <p className="text-xs text-red-500">
                                            {hargaError}
                                        </p>
                                    )}
                                </div>

                                {/* Subtotal per item */}
                                <div className="space-y-1">
                                    {idx === 0 && (
                                        <Label className="text-xs text-muted-foreground">
                                            Subtotal
                                        </Label>
                                    )}
                                    <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 font-mono text-sm text-muted-foreground">
                                        {formatRupiah(itemSubtotal)}
                                    </div>
                                </div>

                                {/* Hapus baris */}
                                <div className={idx === 0 ? 'pt-5' : ''}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                                        onClick={() => removeItem(idx)}
                                        disabled={data.items.length === 1}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Diskon, Ongkir, Total ───────────────────────────────── */}
            <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                <h2 className="mb-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Ringkasan Pembayaran
                </h2>

                <div className="space-y-4">
                    {/* Subtotal (read-only) */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono font-medium">
                            {formatRupiah(subtotal)}
                        </span>
                    </div>

                    {/* Diskon */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">Diskon</Label>
                            {/* Toggle tipe diskon */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() =>
                                    setData(
                                        'tipe_diskon',
                                        data.tipe_diskon === 'persen'
                                            ? 'nominal'
                                            : 'persen',
                                    )
                                }
                            >
                                {data.tipe_diskon === 'persen' ? '%' : 'Rp'}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                {data.tipe_diskon === 'persen'
                                    ? 'Persen dari subtotal'
                                    : 'Nominal rupiah'}
                            </span>
                        </div>
                        <Input
                            type="number"
                            min="0"
                            max={
                                data.tipe_diskon === 'persen' ? 100 : undefined
                            }
                            step={data.tipe_diskon === 'persen' ? '0.01' : '1'}
                            placeholder={
                                data.tipe_diskon === 'persen'
                                    ? 'Contoh: 10 (= 10%)'
                                    : 'Contoh: 50000'
                            }
                            value={data.diskon}
                            onChange={(e) =>
                                setData(
                                    'diskon',
                                    e.target.value === ''
                                        ? ''
                                        : Number(e.target.value),
                                )
                            }
                            className={errors.diskon ? 'border-red-500' : ''}
                        />
                        {nilaiDiskon > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Nilai diskon: {formatRupiah(nilaiDiskon)}
                            </p>
                        )}
                        {errors.diskon && (
                            <p className="text-sm text-red-500">
                                {errors.diskon}
                            </p>
                        )}
                    </div>

                    {/* Ongkir */}
                    <div className="space-y-2">
                        <Label htmlFor="ongkir" className="text-sm">
                            Ongkos Kirim
                        </Label>
                        <Input
                            id="ongkir"
                            type="number"
                            min="0"
                            placeholder="0 (gratis)"
                            value={data.ongkir}
                            onChange={(e) =>
                                setData(
                                    'ongkir',
                                    e.target.value === ''
                                        ? ''
                                        : Number(e.target.value),
                                )
                            }
                            className={errors.ongkir ? 'border-red-500' : ''}
                        />
                        {errors.ongkir && (
                            <p className="text-sm text-red-500">
                                {errors.ongkir}
                            </p>
                        )}
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                        <span className="font-semibold">Total</span>
                        <span className="font-mono text-xl font-bold">
                            {formatRupiah(total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Keterangan ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
                <div className="space-y-2">
                    <Label htmlFor="keterangan">Keterangan</Label>
                    <Textarea
                        id="keterangan"
                        placeholder="Catatan pesanan (opsional)..."
                        value={data.keterangan}
                        onChange={(e) => setData('keterangan', e.target.value)}
                        rows={3}
                    />
                    {errors.keterangan && (
                        <p className="text-sm text-red-500">
                            {errors.keterangan}
                        </p>
                    )}
                </div>
            </div>

            {/* ─── Actions ─────────────────────────────────────────────── */}
            <div className="flex justify-end gap-3">
                <Link href={cancelHref}>
                    <Button type="button" variant="outline">
                        Batal
                    </Button>
                </Link>
                <Button type="submit" disabled={processing}>
                    {processing
                        ? 'Menyimpan...'
                        : (submitLabel ?? defaultLabel)}
                </Button>
            </div>
        </form>
    );
}
