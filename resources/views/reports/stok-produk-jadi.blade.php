@extends('layouts.pdf')

@section('content')
    <p style="margin: 0 0 12px 0; font-size: 11px; color: #555;">
        Laporan ini menampilkan mutasi persediaan produk normal saja.
        Catatan produk cacat layak jual dan riwayat pemusnahan tidak digabung ke
        stok normal dan tidak termasuk dalam laporan ini.
    </p>
    <table>
        <thead>
            <tr>
                <th class="text-center" style="width: 4%;">No</th>
                <th style="width: 12%;">Tanggal</th>
                <th style="width: 22%;">Produk</th>
                <th style="width: 14%;">Kode Produk</th>
                <th class="text-center" style="width: 12%;">Jenis</th>
                <th class="text-right" style="width: 8%;">Qty</th>
                <th class="text-right" style="width: 10%;">Sebelum</th>
                <th class="text-right" style="width: 10%;">Sesudah</th>
                <th style="width: 18%;">Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item['tanggal'] }}</td>
                    <td>{{ $item['nama_produk'] }}</td>
                    <td>{{ $item['kode_produk'] }}</td>
                    <td class="text-center"><span class="badge">{{ $item['jenis_transaksi'] }}</span></td>
                    <td class="text-right">{{ $item['qty'] }}</td>
                    <td class="text-right">{{ $item['stok_sebelum'] }}</td>
                    <td class="text-right">{{ $item['stok_sesudah'] }}</td>
                    <td>{{ $item['keterangan'] }}</td>
                </tr>
            @endforeach
            @if($items->isEmpty())
                <tr><td colspan="9" class="text-center" style="padding:20px;">Tidak ada data mutasi persediaan produk normal.</td></tr>
            @endif
        </tbody>
    </table>
@endsection
