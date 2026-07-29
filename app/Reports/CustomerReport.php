<?php

namespace App\Reports;

use App\Models\Customer;
use App\Support\DomainLabels;
use Illuminate\Support\Collection;

class CustomerReport extends BaseReport
{
    public function title(): string
    {
        return 'Laporan Data Customer';
    }

    public function filename(): string
    {
        return 'laporan-customer';
    }

    public function bladeView(): string
    {
        return 'reports.customer';
    }

    public function headings(): array
    {
        return [
            'Nama Customer',
            'Jenis Customer',
            'No. HP',
            'Alamat',
            'Total Pesanan',
        ];
    }

    public function export(array $filters): Collection
    {
        return Customer::withCount('pesanans')
            ->orderBy('nama_customer')
            ->get()
            ->map(fn (Customer $c) => [
                'nama_customer' => $c->nama_customer,
                'jenis_customer' => $c->jenis_customer
                    ? DomainLabels::jenisCustomer($c->jenis_customer)
                    : '-',
                'no_hp' => $c->no_hp ?? '-',
                'alamat' => $c->alamat ?? '-',
                'total_pesanan' => $c->pesanans_count,
            ]);
    }

    public function summary(array $filters): array
    {
        $total = Customer::count();
        $aktif = Customer::whereHas('pesanans')->count();

        return [
            ['label' => 'Total Customer',   'value' => $total, 'color' => 'blue'],
            ['label' => 'Pernah Memesan',   'value' => $aktif, 'color' => 'emerald'],
            ['label' => 'Belum Ada Pesanan', 'value' => $total - $aktif, 'color' => 'gray'],
        ];
    }
}
