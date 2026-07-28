@extends('layouts.pdf')

@section('content')
    <table>
        <thead>
            <tr>
                <th class="text-center" style="width: 4%;">No</th>
                <th style="width: 28%;">Nama Karyawan</th>
                <th style="width: 20%;">Jabatan</th>
                <th style="width: 16%;">No. HP</th>
                <th class="text-center" style="width: 14%;">Status</th>
                <th class="text-right" style="width: 12%;">Total Produksi</th>
                <th class="text-right" style="width: 16%;">Dasar Upah</th>
                <th class="text-right" style="width: 12%;">Gagal QC</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item['nama_karyawan'] }}</td>
                    <td>{{ $item['jabatan'] }}</td>
                    <td>{{ $item['no_hp'] }}</td>
                    <td class="text-center"><span class="badge">{{ $item['status'] }}</span></td>
                    <td class="text-right">{{ $item['total_produksi'] }}</td>
                    <td class="text-right">{{ $item['wage_basis_qty'] }} unit lolos</td>
                    <td class="text-right">{{ $item['failed_qc_qty'] }}</td>
                </tr>
            @endforeach
            @if($items->isEmpty())
                <tr><td colspan="8" class="text-center" style="padding:20px;">Tidak ada data karyawan.</td></tr>
            @endif
        </tbody>
    </table>
@endsection
