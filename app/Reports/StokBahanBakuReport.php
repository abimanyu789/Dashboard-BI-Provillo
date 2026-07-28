<?php

namespace App\Reports;

use App\Models\StokBahanBaku;
use App\Support\DomainLabels;
use Illuminate\Support\Collection;

class StokBahanBakuReport extends BaseReport
{
    public function title(): string
    {
        return 'Laporan Stok Bahan Baku';
    }

    public function filename(): string
    {
        return 'laporan-stok-bahan-baku';
    }

    public function bladeView(): string
    {
        return 'reports.stok-bahan-baku';
    }

    public function headings(): array
    {
        return [
            'Tanggal',
            'Bahan Baku',
            'Kode Bahan',
            'Satuan',
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

        return StokBahanBaku::with('bahanBaku')
            ->when($dari,   fn ($q) => $q->whereDate('created_at', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('created_at', '<=', $sampai))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (StokBahanBaku $s) => [
                'tanggal'          => $s->created_at?->format('d/m/Y'),
                'nama_bahan'       => $s->bahanBaku?->nama_bahan ?? '-',
                'kode_bahan'       => $s->bahanBaku?->kode_bahan ?? '-',
                'satuan'           => $s->bahanBaku?->satuan ?? '-',
                'jenis_transaksi'  => DomainLabels::stokBahanTransaksi($s->jenis_transaksi),
                'qty'              => (float) $s->qty,
                'stok_sebelum'     => (float) $s->stok_sebelum,
                'stok_sesudah'     => (float) $s->stok_sesudah,
                'keterangan'       => $s->keterangan,
            ]);
    }

    public function summary(array $filters): array
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        $query = StokBahanBaku::query()
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
