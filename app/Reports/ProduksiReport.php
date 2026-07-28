<?php

namespace App\Reports;

use App\Models\Produksi;
use App\Support\DomainLabels;
use Illuminate\Support\Collection;

class ProduksiReport extends BaseReport
{
    public function title(): string
    {
        return 'Laporan Produksi';
    }

    public function filename(): string
    {
        return 'laporan-produksi';
    }

    public function bladeView(): string
    {
        return 'reports.produksi';
    }

    public function headings(): array
    {
        return [
            'ID Produksi',
            'No. Pesanan',
            'Jenis',
            'Deadline',
            'Qty Target',
            'Qty Selesai',
            'Status',
            'Status QC',
        ];
    }

    public function export(array $filters): Collection
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        return Produksi::with('pesanan')
            ->when($dari,   fn ($q) => $q->whereDate('deadline', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('deadline', '<=', $sampai))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Produksi $p) => [
                'id'             => $p->id,
                'nomor_pesanan'  => $p->pesanan?->nomor_pesanan ?? 'Mandiri',
                'jenis_produksi' => $p->jenis_produksi,
                'deadline'       => $p->deadline?->format('d/m/Y'),
                'qty_target'     => $p->qty_target,
                'qty_selesai'    => $p->qty_selesai,
                'status'         => DomainLabels::produksiStatus($p->status),
                'status_qc'      => $p->status_qc ? DomainLabels::qcStatus($p->status_qc) : '-',
            ]);
    }

    public function summary(array $filters): array
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        $query = Produksi::query()
            ->when($dari,   fn ($q) => $q->whereDate('deadline', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('deadline', '<=', $sampai));

        $total      = $query->count();
        $selesai    = (clone $query)->where('status', 'selesai')->count();
        $proses     = (clone $query)->where('status', 'proses')->count();
        $draft      = (clone $query)->where('status', 'draft')->count();
        $totalUnit  = (clone $query)->sum('qty_selesai');

        return [
            ['label' => 'Total Produksi',  'value' => $total,      'color' => 'blue'],
            ['label' => 'Selesai',         'value' => $selesai,    'color' => 'emerald'],
            ['label' => 'Sedang Diproduksi', 'value' => $proses,     'color' => 'indigo'],
            ['label' => 'Belum Dimulai',   'value' => $draft,      'color' => 'gray'],
            ['label' => 'Total Unit Jadi', 'value' => $totalUnit.' unit', 'color' => 'purple'],
        ];
    }
}
