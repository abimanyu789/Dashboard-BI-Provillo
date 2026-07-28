<?php

namespace App\Reports;

use App\Models\StokProdukJadi;
use Illuminate\Support\Collection;

class StokProdukJadiReport extends BaseReport
{
    public function title(): string
    {
        return 'Laporan Stok Produk Jadi';
    }

    public function filename(): string
    {
        return 'laporan-stok-produk-jadi';
    }

    public function bladeView(): string
    {
        return 'reports.stok-produk-jadi';
    }

    public function headings(): array
    {
        return [
            'Tanggal',
            'Produk',
            'Kode Produk',
            'Jenis Transaksi',
            'Qty',
            'Stok Sebelum',
            'Stok Sesudah',
            'Keterangan',
        ];
    }

    public function export(array $filters): Collection
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        return StokProdukJadi::with('produk')
            ->when($dari,   fn ($q) => $q->whereDate('created_at', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('created_at', '<=', $sampai))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (StokProdukJadi $s) => [
                'tanggal'         => $s->created_at?->format('d/m/Y'),
                'nama_produk'     => $s->produk?->nama_produk ?? '-',
                'kode_produk'     => $s->produk?->kode_produk ?? '-',
                'jenis_transaksi'  => DomainLabels::stokProdukTransaksi($s->jenis_transaksi),
                'qty'             => (int) $s->qty,
                'stok_sebelum'    => (int) $s->stok_sebelum,
                'stok_sesudah'    => (int) $s->stok_sesudah,
                'keterangan'      => $s->keterangan,
            ]);
    }

    public function summary(array $filters): array
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        $query = StokProdukJadi::query()
            ->when($dari,   fn ($q) => $q->whereDate('created_at', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('created_at', '<=', $sampai));

        $masuk  = (clone $query)->where('jenis_transaksi', 'masuk')->sum('qty');
        $keluar = (clone $query)->where('jenis_transaksi', 'keluar')->sum('qty');
        $total  = (clone $query)->count();

        return [
            ['label' => 'Total Transaksi', 'value' => $total,  'color' => 'blue'],
            ['label' => 'Total Masuk',     'value' => $masuk,  'color' => 'emerald'],
            ['label' => 'Total Keluar',    'value' => $keluar, 'color' => 'red'],
        ];
    }
}
