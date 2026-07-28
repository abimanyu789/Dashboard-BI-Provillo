import { router } from '@inertiajs/react';
import { AlertTriangle, Play, XCircle } from 'lucide-react';
import { useState } from 'react';
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
import produksi from '@/routes/produksi';
import type { Produksi } from '@/types';

interface ProduksiActionDialogProps {
    produksi: Produksi;
    stokCukup: boolean;
}

export function ProduksiActionDialog({
    produksi: item,
    stokCukup,
}: ProduksiActionDialogProps) {
    const [loadingMulai, setLoadingMulai] = useState(false);
    const [loadingBatalkan, setLoadingBatalkan] = useState(false);

    const handleMulai = () => {
        setLoadingMulai(true);
        router.patch(
            produksi.mulai.url(item.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setLoadingMulai(false),
            },
        );
    };

    const handleBatalkan = () => {
        setLoadingBatalkan(true);
        router.patch(
            produksi.batalkan.url(item.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setLoadingBatalkan(false),
            },
        );
    };

    const isDraft = item.status === 'draft';
    const isProses = item.status === 'proses';

    return (
        <div className="flex items-center gap-2">
            {/* Produksi dapat dimulai meski stok rencana belum seluruhnya tersedia. */}
            {isDraft && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="default">
                            <Play className="mr-2 size-4" />
                            Mulai Produksi
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Mulai Produksi</DialogTitle>
                            <DialogDescription>
                                Kebutuhan BOM akan dicatat sebagai rencana. Stok
                                bahan baku belum berkurang sampai bahan
                                diterbitkan untuk produksi.
                                {!stokCukup && (
                                    <>
                                        <br />
                                        <br />
                                        <strong>
                                            Stok saat ini belum memenuhi seluruh
                                            rencana, tetapi produksi tetap dapat
                                            dimulai dan kekurangan akan
                                            ditampilkan.
                                        </strong>
                                    </>
                                )}
                                <br />
                                <br />
                                Lanjutkan?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Batal</Button>
                            </DialogClose>
                            <Button
                                onClick={handleMulai}
                                disabled={loadingMulai}
                            >
                                <Play className="mr-2 size-4" />
                                {loadingMulai
                                    ? 'Memproses...'
                                    : 'Ya, Mulai Produksi'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Tombol Batalkan Produksi — saat draft atau proses */}
            {(isDraft || isProses) && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <XCircle className="mr-2 size-4" />
                            Batalkan Produksi
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-destructive" />
                                Batalkan Produksi
                            </DialogTitle>
                            <DialogDescription>
                                {isProses ? (
                                    <>
                                        Produksi sedang berjalan. Hanya bahan
                                        yang sudah diterbitkan tetapi belum
                                        digunakan dan belum dikembalikan yang
                                        akan masuk kembali ke gudang. Bahan yang
                                        sudah digunakan tidak dikembalikan.
                                        <br />
                                        <br />
                                        Tindakan ini tidak dapat dibatalkan.
                                    </>
                                ) : (
                                    <>
                                        Produksi belum dimulai. Membatalkan akan
                                        mengubah status menjadi{' '}
                                        <strong>Dibatalkan</strong> tanpa
                                        perubahan stok.
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Kembali</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={handleBatalkan}
                                disabled={loadingBatalkan}
                            >
                                <XCircle className="mr-2 size-4" />
                                {loadingBatalkan
                                    ? 'Memproses...'
                                    : 'Ya, Batalkan Produksi'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
