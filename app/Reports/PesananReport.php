<?php

namespace App\Reports;

use App\Models\Pesanan;
use App\Support\DomainLabels;
use Illuminate\Support\Collection;

class PesananReport extends BaseReport
{
    public function title(): string
    {
        return 'Laporan Pesanan';
    }

    public function filename(): string
    {
        return 'laporan-pesanan';
    }

    public function bladeView(): string
    {
        return 'reports.pesanan';
    }

    public function headings(): array
    {
        return [
            'No. Pesanan',
            'Tanggal',
            'Customer',
            'Status',
            'Jenis Pembayaran',
            'Subtotal',
            'Diskon',
            'Ongkir',
            'Total',
        ];
    }

    public function export(array $filters): Collection
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        return Pesanan::with('customer')
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai))
            ->orderByDesc('tanggal')
            ->get()
            ->map(fn (Pesanan $p) => [
                'nomor_pesanan' => $p->nomor_pesanan,
                'tanggal' => $p->tanggal?->format('d/m/Y'),
                'customer' => $p->customer?->nama_customer ?? '-',
                'status' => DomainLabels::pesananStatus($p->status),
                'jenis_pembayaran' => $p->jenis_pembayaran
                    ? DomainLabels::jenisPembayaranPesanan($p->jenis_pembayaran)
                    : '-',
                'subtotal' => (float) $p->subtotal,
                'diskon' => (float) $p->diskon,
                'ongkir' => (float) $p->ongkir,
                'total' => (float) $p->total,
            ]);
    }

    public function summary(array $filters): array
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        $query = Pesanan::query()
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai));

        $total = $query->count();
        $totalNilai = (clone $query)->sum('total');
        $selesai = (clone $query)->where('status', 'selesai')->count();
        $pending = (clone $query)->where('status', 'pending')->count();
        $dibatalkan = (clone $query)->where('status', 'dibatalkan')->count();

        return [
            ['label' => 'Total Pesanan',   'value' => $total,                          'color' => 'blue'],
            ['label' => 'Total Nilai',      'value' => $this->formatRupiah($totalNilai), 'color' => 'green'],
            ['label' => 'Selesai',          'value' => $selesai,                        'color' => 'emerald'],
            ['label' => 'Menunggu',         'value' => $pending,                        'color' => 'amber'],
            ['label' => 'Dibatalkan',       'value' => $dibatalkan,                     'color' => 'red'],
        ];
    }
}
