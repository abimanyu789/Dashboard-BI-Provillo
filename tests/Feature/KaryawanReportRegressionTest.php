<?php

use App\Models\Karyawan;
use App\Models\User;
use App\Reports\KaryawanReport;
use Maatwebsite\Excel\Facades\Excel;

it('exports the worker wage basis through the existing report architecture', function () {
    Karyawan::query()->create([
        'nama_karyawan' => 'Karyawan Laporan',
        'jabatan' => 'Finishing',
        'status' => 'aktif',
    ]);

    $report = new KaryawanReport;

    expect($report->headings())->toContain('Output Lolos QC (Dasar Upah)', 'Output Gagal QC')
        ->and($report->export([]))->toHaveCount(1)
        ->and($report->export([])->first())->toMatchArray([
            'nama_karyawan' => 'Karyawan Laporan',
            'wage_basis_qty' => 0,
            'failed_qc_qty' => 0,
        ]);
});

it('preserves employee report PDF and Excel downloads', function () {
    $user = User::factory()->create();
    Karyawan::query()->create([
        'nama_karyawan' => 'Karyawan Export',
        'jabatan' => 'Finishing',
        'status' => 'aktif',
    ]);

    $this->actingAs($user)
        ->get(route('laporan.export', ['type' => 'karyawan', 'format' => 'pdf']))
        ->assertSuccessful()
        ->assertDownload('laporan-karyawan.pdf');

    Excel::fake();

    $this->actingAs($user)
        ->get(route('laporan.export', ['type' => 'karyawan', 'format' => 'excel']))
        ->assertSuccessful();

    Excel::assertDownloaded('laporan-karyawan.xlsx');
});
