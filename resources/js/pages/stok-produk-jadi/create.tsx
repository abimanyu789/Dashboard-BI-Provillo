import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { stokProdukTransaksiLabel } from '@/lib/domain-labels';
import stokProdukJadi from '@/routes/stok-produk-jadi';
import pesananRoutes from '@/routes/pesanan';
import type {
    PengirimanFormData,
    PengirimanItemRow,
    SisaPengirimanItem,
    StokProdukJadiCreateProps,
    StokProdukOption,
} from '@/types';

const emptyRow = (): PengirimanItemRow => ({
    produk_id: '',
    qty: '',
    keterangan: '',
});

export default function StokProdukJadiCreate({
    produkList,
    pesananOptions,
    selectedId,
    selectedPesananId,
}: StokProdukJadiCreateProps) {
    const { data, setData, post, processing, errors } = useForm<PengirimanFormData>({
        jenis_transaksi: 'pengiriman',
        pesanan_id: selectedPesananId ?? '',
        items: [emptyRow()],
    });

    const [sisaItems, setSisaItems] = useState<SisaPengirimanItem[]>([]);
    const [loadingSisa, setLoadingSisa] = useState(false);
    const [sisaError, setSisaError] = useState<string | null>(null);

    const isPengiriman = data.jenis_transaksi === 'pengiriman';

    // Pre-fill baris pertama jika ada deep-link selectedId (hanya penyesuaian / tanpa pesanan)
    useEffect(() => {
        if (selectedId && !isPengiriman) {
            setData('items', [
                { produk_id: selectedId, qty: '', keterangan: '' },
            ]);
        }
    }, [selectedId]);

    // Load sisa pengiriman saat pilih pesanan
    useEffect(() => {
        if (!isPengiriman || !data.pesanan_id) {
            setSisaItems([]);
            setSisaError(null);
            return;
        }

        const controller = new AbortController();
        setLoadingSisa(true);
        setSisaError(null);

        fetch(pesananRoutes.sisaPengiriman.url(Number(data.pesanan_id)), {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
            credentials: 'same-origin',
        })
            .then(async (res) => {
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.message ?? 'Gagal memuat sisa pengiriman.');
                }
                return json as { items: SisaPengirimanItem[] };
            })
            .then((json) => {
                setSisaItems(json.items ?? []);
                // Auto-isi baris dari item yang masih punya sisa
                const rows: PengirimanItemRow[] =
                    (json.items ?? []).length > 0
                        ? json.items.map((item) => ({
                              produk_id: item.produk_id,
                              qty: '',
                              keterangan: '',
                          }))
                        : [emptyRow()];
                setData('items', rows);
            })
            .catch((err: Error) => {
                if (err.name === 'AbortError') return;
                setSisaError(err.message);
                setSisaItems([]);
                setData('items', [emptyRow()]);
            })
            .finally(() => setLoadingSisa(false));

        return () => controller.abort();
    }, [data.pesanan_id, isPengiriman]);

    const handleJenisChange = (v: 'pengiriman' | 'penyesuaian') => {
        setData((prev) => ({
            ...prev,
            jenis_transaksi: v,
            pesanan_id: v === 'pengiriman' ? prev.pesanan_id : '',
            items: [emptyRow()],
        }));
        if (v !== 'pengiriman') {
            setSisaItems([]);
            setSisaError(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(stokProdukJadi.store.url());
    };

    const addRow = () => {
        setData('items', [...data.items, emptyRow()]);
    };

    const removeRow = (index: number) => {
        if (data.items.length === 1) return;
        setData(
            'items',
            data.items.filter((_, i) => i !== index),
        );
    };

    const updateRow = <K extends keyof PengirimanItemRow>(
        index: number,
        field: K,
        value: PengirimanItemRow[K],
    ) => {
        const updated = data.items.map((row, i) =>
            i === index ? { ...row, [field]: value } : row,
        );
        setData('items', updated);
    };

    const usedIds = data.items
        .map((r) => (r.produk_id !== '' ? Number(r.produk_id) : null))
        .filter((id): id is number => id !== null);

    const rowError = (index: number, field: keyof PengirimanItemRow | 'pesanan_id'): string | undefined =>
        (errors as Record<string, string>)[
            field === 'pesanan_id' ? 'pesanan_id' : `items.${index}.${field}`
        ];

    const globalItemsError = (errors as Record<string, string>)['items'];

    const sisaMap = useMemo(() => {
        const map = new Map<number, SisaPengirimanItem>();
        sisaItems.forEach((item) => map.set(item.produk_id, item));
        return map;
    }, [sisaItems]);

    const produkSource: StokProdukOption[] = isPengiriman
        ? sisaItems.map((s) => ({
              id: s.produk_id,
              kode_produk: s.kode_produk ?? '',
              nama_produk: s.nama_produk ?? '',
              stok: s.stok_tersedia,
          }))
        : produkList;

    const pesananComboboxOptions = pesananOptions.map((p) => ({
        value: String(p.id),
        label: `${p.nomor_pesanan} — ${p.customer ?? '-'} (${p.status})`,
    }));

    return (
        <>
            <Head title="Transaksi Stok Produk Jadi" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                <div className="flex items-center gap-4">
                    <Link href={stokProdukJadi.index.url()}>
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="size-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Transaksi Stok Produk Jadi
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Catat pengiriman ke customer atau penyesuaian stok
                        </p>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-4xl">
                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-6 rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border"
                    >
                        {/* Jenis Transaksi */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="jenis_transaksi">
                                Jenis Transaksi <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.jenis_transaksi}
                                onValueChange={(v) =>
                                    handleJenisChange(v as 'pengiriman' | 'penyesuaian')
                                }
                            >
                                <SelectTrigger id="jenis_transaksi" className="w-full sm:w-72">
                                    <SelectValue placeholder="Pilih jenis..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pengiriman">Pengiriman Produk</SelectItem>
                                    <SelectItem value="penyesuaian">Penyesuaian Stok</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.jenis_transaksi && (
                                <p className="text-sm text-destructive">{errors.jenis_transaksi}</p>
                            )}
                        </div>

                        {/* Pilih Pesanan — hanya pengiriman */}
                        {isPengiriman && (
                            <div className="flex flex-col gap-2">
                                <Label>
                                    Pesanan <span className="text-destructive">*</span>
                                </Label>
                                <SearchableCombobox
                                    items={pesananComboboxOptions}
                                    value={data.pesanan_id !== '' ? String(data.pesanan_id) : ''}
                                    onValueChange={(v) =>
                                        setData('pesanan_id', v !== '' ? Number(String(v)) : '')
                                    }
                                    placeholder="Pilih pesanan..."
                                    searchPlaceholder="Cari nomor pesanan / customer..."
                                    emptyText="Tidak ada pesanan aktif."
                                />
                                {errors.pesanan_id && (
                                    <p className="text-sm text-destructive">{errors.pesanan_id}</p>
                                )}
                                {loadingSisa && (
                                    <p className="text-xs text-muted-foreground">
                                        Memuat sisa pengiriman...
                                    </p>
                                )}
                                {sisaError && (
                                    <p className="text-sm text-destructive">{sisaError}</p>
                                )}
                                {!loadingSisa && data.pesanan_id && sisaItems.length === 0 && !sisaError && (
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        Semua produk pesanan ini sudah terkirim penuh.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Items */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Label>
                                    Daftar Item <span className="text-destructive">*</span>
                                </Label>
                            </div>
                            {globalItemsError && (
                                <p className="text-sm text-destructive">{globalItemsError}</p>
                            )}

                            {data.items.map((row, index) => {
                                const sisa = row.produk_id !== '' ? sisaMap.get(Number(row.produk_id)) : undefined;
                                const selectedProduk = produkSource.find(
                                    (p) => p.id === Number(row.produk_id),
                                );
                                const stokSekarang = selectedProduk?.stok ?? 0;
                                const maxQty = isPengiriman
                                    ? Math.min(sisa?.qty_sisa ?? 0, stokSekarang)
                                    : undefined;

                                const availableOptions = produkSource
                                    .filter(
                                        (p) =>
                                            !usedIds.includes(p.id) ||
                                            p.id === Number(row.produk_id),
                                    )
                                    .map((p) => ({
                                        value: String(p.id),
                                        label: `${p.kode_produk} — ${p.nama_produk} (stok: ${p.stok})`,
                                    }));

                                return (
                                    <div
                                        key={index}
                                        className="flex flex-col gap-3 rounded-lg border border-sidebar-border/50 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Baris {index + 1}
                                            </span>
                                            {data.items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7 text-destructive"
                                                    onClick={() => removeRow(index)}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            {/* Produk */}
                                            <div className="flex flex-col gap-1 sm:col-span-1">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Produk
                                                </span>
                                                <SearchableCombobox
                                                    items={availableOptions}
                                                    value={
                                                        row.produk_id !== ''
                                                            ? String(row.produk_id)
                                                            : ''
                                                    }
                                                    onValueChange={(v) =>
                                                        updateRow(
                                                            index,
                                                            'produk_id',
                                                            v !== '' ? Number(String(v)) : '',
                                                        )
                                                    }
                                                    placeholder={
                                                        isPengiriman && !data.pesanan_id
                                                            ? 'Pilih pesanan dulu...'
                                                            : 'Pilih produk...'
                                                    }
                                                    searchPlaceholder="Cari produk..."
                                                    emptyText="Tidak ada produk."
                                                    disabled={isPengiriman && !data.pesanan_id}
                                                />
                                                {rowError(index, 'produk_id') && (
                                                    <p className="text-xs text-destructive">
                                                        {rowError(index, 'produk_id')}
                                                    </p>
                                                )}
                                                {isPengiriman && sisa && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Dipesan {sisa.qty_pesan} · Dikirim{' '}
                                                        {sisa.qty_dikirim} · Sisa {sisa.qty_sisa} ·
                                                        Stok {sisa.stok_tersedia}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Qty */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Qty{' '}
                                                    {isPengiriman
                                                        ? '(kirim)'
                                                        : '(+ tambah / − kurang)'}
                                                </span>
                                                <Input
                                                    type="number"
                                                    min={isPengiriman ? 1 : undefined}
                                                    max={maxQty}
                                                    step={1}
                                                    value={row.qty}
                                                    placeholder={
                                                        maxQty !== undefined
                                                            ? `Maks ${maxQty}`
                                                            : 'Jumlah'
                                                    }
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
                                                {isPengiriman && maxQty !== undefined && maxQty === 0 && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                                        Tidak ada sisa kirim / stok untuk produk ini.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Keterangan */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Keterangan
                                                    {!isPengiriman && (
                                                        <span className="text-destructive"> *</span>
                                                    )}
                                                </span>
                                                <Textarea
                                                    rows={1}
                                                    value={row.keterangan}
                                                    placeholder={
                                                        isPengiriman
                                                            ? 'Opsional...'
                                                            : 'Alasan penyesuaian...'
                                                    }
                                                    onChange={(e) =>
                                                        updateRow(index, 'keterangan', e.target.value)
                                                    }
                                                />
                                                {rowError(index, 'keterangan') && (
                                                    <p className="text-xs text-destructive">
                                                        {rowError(index, 'keterangan')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Tambah baris — untuk pengiriman, hanya jika masih ada produk sisa yang belum dipilih */}
                            {(!isPengiriman ||
                                sisaItems.some((s) => !usedIds.includes(s.produk_id))) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="self-start"
                                    onClick={addRow}
                                    disabled={isPengiriman && !data.pesanan_id}
                                >
                                    <Plus className="size-4" />
                                    Tambah Baris
                                </Button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 border-t border-sidebar-border/50 pt-4">
                            <Link href={stokProdukJadi.index.url()}>
                                <Button type="button" variant="outline">
                                    Batal
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={
                                    processing ||
                                    (isPengiriman && (!data.pesanan_id || sisaItems.length === 0))
                                }
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Transaksi'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
