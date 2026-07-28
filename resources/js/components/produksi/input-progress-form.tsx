import { useForm } from '@inertiajs/react';
import { CheckCircle, XCircle } from 'lucide-react';
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
import produksi from '@/routes/produksi';
import type {
    ActiveRework,
    InputProgressFormData,
    Produksi,
    ProdukBelumSelesai,
} from '@/types';

interface InputProgressFormProps {
    produksi: Produksi;
    produkBelumSelesai: ProdukBelumSelesai[];
    activeRework: ActiveRework[];
}

export function InputProgressForm({
    produksi: item,
    produkBelumSelesai,
    activeRework,
}: InputProgressFormProps) {
    const { data, setData, patch, processing, errors, reset } =
        useForm<InputProgressFormData>({
            produk_id: '',
            karyawan_id: '',
            qty: '',
            qc_status: 'lolos',
            alasan_qc: '',
            disposisi_qc: '',
            rework_parent_id: '',
            catatan: '',
            idempotency_key: crypto.randomUUID(),
        });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        patch(produksi.progress.url(item.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setData('idempotency_key', crypto.randomUUID());
            },
        });
    };

    const selectedProduk = produkBelumSelesai.find(
        (product) => product.id === Number(data.produk_id),
    );
    const selectedRework = activeRework.find(
        (rework) => rework.id === Number(data.rework_parent_id),
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <Label>Hasil rework (opsional)</Label>
                <SearchableCombobox
                    items={activeRework.map((rework) => ({
                        value: rework.id,
                        label: `${rework.produk?.nama_produk ?? 'Produk'} — sisa ${rework.qty_aktif} pcs`,
                    }))}
                    value={data.rework_parent_id}
                    onValueChange={(value) => {
                        const parent = activeRework.find(
                            (rework) => rework.id === Number(value),
                        );
                        setData((current) => ({
                            ...current,
                            rework_parent_id: Number(value),
                            produk_id: parent?.produk_id ?? current.produk_id,
                            qty: '',
                        }));
                    }}
                    placeholder="Progress baru / pilih rework..."
                />
            </div>

            <div className="space-y-1.5">
                <Label>
                    Produk <span className="text-destructive">*</span>
                </Label>
                <SearchableCombobox
                    items={
                        selectedRework
                            ? [
                                  {
                                      value: selectedRework.produk_id,
                                      label:
                                          selectedRework.produk?.nama_produk ??
                                          `Produk #${selectedRework.produk_id}`,
                                  },
                              ]
                            : produkBelumSelesai.map((product) => ({
                                  value: product.id,
                                  label: `${product.kode_produk} — ${product.nama_produk} (sisa: ${product.sisa} pcs)`,
                              }))
                    }
                    value={data.produk_id}
                    onValueChange={(value) =>
                        setData('produk_id', Number(value))
                    }
                    placeholder="Pilih produk..."
                    disabled={data.rework_parent_id !== ''}
                />
                {errors.produk_id && (
                    <p className="text-sm text-destructive">
                        {errors.produk_id}
                    </p>
                )}
            </div>

            <div className="space-y-1.5">
                <Label>
                    Karyawan pelaksana{' '}
                    <span className="text-destructive">*</span>
                </Label>
                <SearchableCombobox
                    items={(item.produksi_karyawans ?? []).map((team) => ({
                        value: team.karyawan_id,
                        label: `${team.karyawan?.nama_karyawan ?? '-'}${team.karyawan?.jabatan ? ` — ${team.karyawan.jabatan}` : ''}`,
                    }))}
                    value={data.karyawan_id}
                    onValueChange={(value) =>
                        setData('karyawan_id', Number(value))
                    }
                    placeholder="Pilih karyawan..."
                />
                {errors.karyawan_id && (
                    <p className="text-sm text-destructive">
                        {errors.karyawan_id}
                    </p>
                )}
            </div>

            {(selectedProduk || selectedRework) && (
                <div className="rounded-lg bg-muted/50 px-4 py-2.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            {selectedRework ? 'Sisa rework' : 'Sisa target'}
                        </span>
                        <span className="font-medium text-primary">
                            {selectedRework?.qty_aktif ?? selectedProduk?.sisa}{' '}
                            pcs
                        </span>
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                <Label htmlFor="qty">
                    Jumlah Progress (pcs){' '}
                    <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="qty"
                    type="number"
                    min="1"
                    max={selectedRework?.qty_aktif ?? selectedProduk?.sisa}
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
                    <p className="text-sm text-destructive">{errors.qty}</p>
                )}
            </div>

            <div className="space-y-1.5">
                <Label>
                    Hasil QC <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            setData((current) => ({
                                ...current,
                                qc_status: 'lolos',
                                alasan_qc: '',
                                disposisi_qc: '',
                            }))
                        }
                        className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            data.qc_status === 'lolos'
                                ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400'
                                : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted/50'
                        }`}
                    >
                        <CheckCircle className="size-4" /> Lolos QC
                    </button>
                    <button
                        type="button"
                        onClick={() => setData('qc_status', 'tidak_lolos')}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            data.qc_status === 'tidak_lolos'
                                ? 'border-destructive bg-destructive/10 text-destructive'
                                : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted/50'
                        }`}
                    >
                        <XCircle className="size-4" /> Tidak Lolos
                    </button>
                </div>
            </div>

            {data.qc_status === 'tidak_lolos' && (
                <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="alasan_qc">Alasan kegagalan QC</Label>
                        <Textarea
                            id="alasan_qc"
                            value={data.alasan_qc}
                            onChange={(event) =>
                                setData('alasan_qc', event.target.value)
                            }
                            placeholder="Contoh: jahitan tidak rapi, pengeleman tidak rapi, atau tidak sesuai pesanan..."
                        />
                        {errors.alasan_qc && (
                            <p className="text-sm text-destructive">
                                {errors.alasan_qc}
                            </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label>Disposisi QC</Label>
                        <Select
                            value={data.disposisi_qc}
                            onValueChange={(value) =>
                                setData(
                                    'disposisi_qc',
                                    value as InputProgressFormData['disposisi_qc'],
                                )
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih disposisi..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rework">Rework</SelectItem>
                                <SelectItem value="jual_cacat">
                                    Jual cacat
                                </SelectItem>
                                <SelectItem value="dimusnahkan">
                                    Dimusnahkan
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.disposisi_qc && (
                            <p className="text-sm text-destructive">
                                {errors.disposisi_qc}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                <Label htmlFor="catatan_progress">Catatan</Label>
                <Textarea
                    id="catatan_progress"
                    value={data.catatan}
                    onChange={(event) => setData('catatan', event.target.value)}
                />
            </div>

            <Button
                type="submit"
                disabled={
                    processing ||
                    (produkBelumSelesai.length === 0 &&
                        activeRework.length === 0)
                }
                className="w-full"
            >
                {processing ? 'Menyimpan...' : 'Catat Progress & QC'}
            </Button>
        </form>
    );
}
