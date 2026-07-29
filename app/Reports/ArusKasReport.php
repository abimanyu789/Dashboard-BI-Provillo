<?php

namespace App\Reports;

use App\Models\ArusKas;
use App\Support\DomainLabels;
use Illuminate\Support\Collection;

class ArusKasReport extends BaseReport
{
    public function title(): string
    {
        return 'Laporan Arus Kas';
    }

    public function filename(): string
    {
        return 'laporan-arus-kas';
    }

    public function bladeView(): string
    {
        return 'reports.arus-kas';
    }

    public function headings(): array
    {
        return [
            'Tanggal',
            'Jenis',
            'Kategori',
            'Keterangan',
            'Metode',
            'Nominal',
        ];
    }

    public function export(array $filters): Collection
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        return ArusKas::query()
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai))
            ->orderByDesc('tanggal')
            ->get()
            ->map(fn (ArusKas $a) => [
                'tanggal' => $a->tanggal?->format('d/m/Y'),
                'jenis' => DomainLabels::jenisArusKas($a->jenis),
                'kategori' => $a->kategori,
                'keterangan' => $a->keterangan,
                'metode_pembayaran' => $a->metode_pembayaran,
                'nominal' => (float) $a->nominal,
            ]);
    }

    public function summary(array $filters): array
    {
        [$dari, $sampai] = $this->parseDateFilters($filters);

        $pemasukan = ArusKas::where('jenis', 'pemasukan')
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai))
            ->sum('nominal');

        $pengeluaran = ArusKas::where('jenis', 'pengeluaran')
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai))
            ->sum('nominal');

        $saldo = $pemasukan - $pengeluaran;

        return [
            ['label' => 'Total Pemasukan',   'value' => $this->formatRupiah($pemasukan),   'color' => 'emerald'],
            ['label' => 'Total Pengeluaran', 'value' => $this->formatRupiah($pengeluaran), 'color' => 'red'],
            ['label' => 'Saldo',             'value' => $this->formatRupiah($saldo),        'color' => $saldo >= 0 ? 'blue' : 'red'],
        ];
    }
}
