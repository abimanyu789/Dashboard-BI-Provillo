import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import produk from '@/routes/produk';
import { stokProdukTransaksiLabel } from '@/lib/domain-labels';
import stokProdukJadi from '@/routes/stok-produk-jadi';
import type { JenisTransaksiProduk, StokProdukJadiShowProps } from '@/types';

export default function StokProdukJadiShow({
    transaksi,
}: StokProdukJadiShowProps) {
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const jenisBadge = (jenis: JenisTransaksiProduk) => {
        const map: Record<
            JenisTransaksiProduk,
            {
                label: string;
                variant: 'default' | 'secondary' | 'destructive' | 'outline';
            }
        > = {
            produksi: {
                label: stokProdukTransaksiLabel('produksi'),
                variant: 'default',
            },
            pengiriman: {
                label: stokProdukTransaksiLabel('pengiriman'),
                variant: 'secondary',
            },
            rollback: {
                label: stokProdukTransaksiLabel('rollback'),
                variant: 'outline',
            },
            penyesuaian: {
                label: stokProdukTransaksiLabel('penyesuaian'),
                variant: 'outline',
            },
        };
        const config = map[jenis] ?? {
            label: jenis,
            variant: 'outline' as const,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // Arah perubahan stok ditentukan dari perbandingan stok_sebelum vs stok_sesudah
    // bukan hanya dari jenis_transaksi, agar penyesuaian negatif juga tampil benar
    const isPengurangan =
        Number(transaksi.stok_sebelum) > Number(transaksi.stok_sesudah);
    const qtyDisplay = isPengurangan
        ? `-${transaksi.qty}`
        : `+${transaksi.qty}`;
    const qtyColor = isPengurangan
        ? 'text-destructive'
        : 'text-green-600 dark:text-green-400';

    const item = transaksi.produk;

    return (
        <>
            <Head title={`Detail Transaksi Stok Produk #${transaksi.id}`} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={stokProdukJadi.index.url()}>
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="size-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Detail Transaksi Stok Produk
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            ID Transaksi #{transaksi.id}
                        </p>
                    </div>
                </div>

                {/* Detail Card */}
                <div className="mx-auto w-full max-w-2xl">
                    <div className="rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                        {/* Produk Section */}
                        <div className="border-b px-6 py-4">
                            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Produk
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-y">
                            <div className="px-6 py-4">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Nama Produk
                                </p>
                                <p className="mt-1 font-semibold">
                                    {item?.nama_produk ?? '-'}
                                </p>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Kode Produk
                                </p>
                                <p className="mt-1 font-mono font-semibold">
                                    {item ? (
                                        <Link
                                            href={produk.show.url(item.id)}
                                            className="text-primary underline-offset-4 hover:underline"
                                        >
                                            {item.kode_produk}
                                        </Link>
                                    ) : (
                                        '-'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Transaksi Section */}
                        <div className="border-t border-b px-6 py-4">
                            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Detail Transaksi
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-y">
                            <div className="px-6 py-4">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Jenis Transaksi
                                </p>
                                <p className="mt-1">
                                    {jenisBadge(transaksi.jenis_transaksi)}
                                </p>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Tanggal
                                </p>
                                <p className="mt-1 text-sm">
                                    {formatDate(transaksi.created_at)}
                                </p>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Qty (pcs)
                                </p>
                                <p
                                    className={`mt-1 font-mono text-lg font-bold ${qtyColor}`}
                                >
                                    {qtyDisplay}
                                </p>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Keterangan
                                </p>
                                <p className="mt-1 text-sm">
                                    {transaksi.keterangan ?? (
                                        <span className="text-muted-foreground">
                                            -
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Perubahan Stok Section */}
                        <div className="border-t border-b px-6 py-4">
                            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Perubahan Stok
                            </h2>
                        </div>
                        <div className="grid grid-cols-3 divide-x">
                            <div className="px-6 py-4 text-center">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Stok Sebelum
                                </p>
                                <p className="mt-1 font-mono text-xl font-semibold text-muted-foreground">
                                    {transaksi.stok_sebelum}
                                </p>
                            </div>
                            <div className="px-6 py-4 text-center">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Perubahan
                                </p>
                                <p
                                    className={`mt-1 font-mono text-xl font-bold ${qtyColor}`}
                                >
                                    {qtyDisplay}
                                </p>
                            </div>
                            <div className="px-6 py-4 text-center">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Stok Sesudah
                                </p>
                                <p className="mt-1 font-mono text-xl font-semibold">
                                    {transaksi.stok_sesudah}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

StokProdukJadiShow.layout = {
    breadcrumbs: [
        { title: 'Stok', href: '#' },
        { title: 'Produk Jadi', href: stokProdukJadi.index.url() },
        { title: 'Detail', href: '#' },
    ],
};
