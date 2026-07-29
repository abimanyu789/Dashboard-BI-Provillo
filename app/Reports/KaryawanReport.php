<?php

namespace App\Reports;

use App\Models\DetailProduksi;
use App\Models\Karyawan;
use App\Support\DomainLabels;
use Illuminate\Support\Collection;

class KaryawanReport extends BaseReport
{
    public function title(): string
    {
        return 'Laporan Data Karyawan';
    }

    public function filename(): string
    {
        return 'laporan-karyawan';
    }

    public function bladeView(): string
    {
        return 'reports.karyawan';
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return [
            'Nama Karyawan',
            'Jabatan',
            'No. HP',
            'Status',
            'Total Produksi',
            'Output Lolos QC (Dasar Upah)',
            'Output Gagal QC',
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array{
     *     nama_karyawan: string,
     *     jabatan: string,
     *     no_hp: string,
     *     status: string,
     *     total_produksi: int<0, max>,
     *     wage_basis_qty: int,
     *     failed_qc_qty: int
     * }>
     */
    public function export(array $filters): Collection
    {
        return Karyawan::query()
            ->withCount('produksis')
            ->withSum([
                'productionProgress as wage_basis_qty' => fn ($query) => $query
                    ->where('qc_status', 'lolos'),
            ], 'qty_selesai')
            ->withSum([
                'productionProgress as failed_qc_qty' => fn ($query) => $query
                    ->where('qc_status', 'tidak_lolos'),
            ], 'qty_selesai')
            ->orderBy('nama_karyawan')
            ->get()
            ->map(fn (Karyawan $k) => [
                'nama_karyawan' => $k->nama_karyawan,
                'jabatan' => $k->jabatan ?? '-',
                'no_hp' => $k->no_hp ?? '-',
                'status' => DomainLabels::statusKaryawan($k->status),
                'total_produksi' => $k->produksis_count,
                'wage_basis_qty' => (int) ($k->wage_basis_qty ?? 0),
                'failed_qc_qty' => (int) ($k->failed_qc_qty ?? 0),
            ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array{label: string, value: int|string, color: string}>
     */
    public function summary(array $filters): array
    {
        $total = Karyawan::count();
        $aktif = Karyawan::where('status', 'aktif')->count();
        $nonAktif = $total - $aktif;
        $wageBasis = (int) DetailProduksi::query()
            ->whereNotNull('karyawan_id')
            ->where('qc_status', 'lolos')
            ->sum('qty_selesai');

        return [
            ['label' => 'Total Karyawan', 'value' => $total, 'color' => 'blue'],
            ['label' => 'Aktif', 'value' => $aktif, 'color' => 'emerald'],
            ['label' => 'Non-Aktif', 'value' => $nonAktif, 'color' => 'gray'],
            ['label' => 'Dasar Perhitungan Upah', 'value' => $wageBasis.' unit lolos QC', 'color' => 'purple'],
        ];
    }
}
