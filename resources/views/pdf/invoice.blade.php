<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Invoice {{ $nomorInvoice }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11px;
            color: #1a1a1a;
            background: #ffffff;
            line-height: 1.5;
        }

        /* ── Layout ──────────────────────────────────────────── */
        .page {
            padding: 32px 40px;
        }

        /* ── Header ──────────────────────────────────────────── */
        .header {
            width: 100%;
            margin-bottom: 28px;
            border-bottom: 2px solid #1a1a1a;
            padding-bottom: 16px;
        }

        .header-inner {
            width: 100%;
        }

        .brand-col {
            display: inline-block;
            width: 55%;
            vertical-align: top;
        }

        .invoice-col {
            display: inline-block;
            width: 44%;
            vertical-align: top;
            text-align: right;
        }

        .brand-name {
            font-size: 26px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #1a1a1a;
            text-transform: uppercase;
        }

        .brand-tagline {
            font-size: 9px;
            color: #666666;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .brand-address {
            margin-top: 6px;
            font-size: 9.5px;
            color: #555555;
            line-height: 1.6;
        }

        .invoice-label {
            font-size: 22px;
            font-weight: bold;
            color: #1a1a1a;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .invoice-number {
            font-size: 11px;
            color: #333333;
            margin-top: 4px;
            font-weight: bold;
        }

        .invoice-meta {
            font-size: 9.5px;
            color: #666666;
            margin-top: 3px;
        }

        /* ── Status Badge ────────────────────────────────────── */
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
        }

        .status-pending    { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
        .status-proses     { background: #dbeafe; color: #1e3a8a; border: 1px solid #93c5fd; }
        .status-selesai    { background: #dcfce7; color: #14532d; border: 1px solid #86efac; }
        .status-dibatalkan { background: #fee2e2; color: #7f1d1d; border: 1px solid #fca5a5; }

        /* ── Info Section ────────────────────────────────────── */
        .info-section {
            width: 100%;
            margin-bottom: 24px;
        }

        .info-col-left {
            display: inline-block;
            width: 48%;
            vertical-align: top;
        }

        .info-col-right {
            display: inline-block;
            width: 48%;
            vertical-align: top;
            text-align: right;
        }

        .section-title {
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #888888;
            margin-bottom: 6px;
            border-bottom: 1px solid #e5e5e5;
            padding-bottom: 3px;
        }

        .info-label {
            font-size: 9px;
            color: #888888;
            display: inline-block;
            width: 90px;
        }

        .info-value {
            font-size: 9.5px;
            color: #1a1a1a;
        }

        .info-row {
            margin-bottom: 3px;
        }

        .customer-name {
            font-size: 12px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 4px;
        }

        /* ── Table ───────────────────────────────────────────── */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }

        .items-table thead tr {
            background-color: #1a1a1a;
            color: #ffffff;
        }

        .items-table thead th {
            padding: 7px 10px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        .items-table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        .items-table tbody tr:nth-child(odd) {
            background-color: #ffffff;
        }

        .items-table tbody td {
            padding: 7px 10px;
            font-size: 10px;
            border-bottom: 1px solid #eeeeee;
            vertical-align: top;
        }

        .td-no     { width: 4%; text-align: center; color: #888888; }
        .td-produk { width: 42%; }
        .td-qty    { width: 8%;  text-align: center; }
        .td-harga  { width: 20%; text-align: right; }
        .td-subtot { width: 22%; text-align: right; font-weight: bold; }

        .produk-nama { font-weight: bold; color: #1a1a1a; }
        .produk-kode { font-size: 8.5px; color: #999999; margin-top: 1px; }

        /* ── Summary ─────────────────────────────────────────── */
        .summary-wrapper {
            width: 100%;
            margin-top: 0;
        }

        .summary-table {
            width: 280px;
            float: right;
            border-collapse: collapse;
        }

        .summary-table td {
            padding: 5px 10px;
            font-size: 10px;
        }

        .summary-label {
            color: #555555;
            text-align: left;
        }

        .summary-value {
            text-align: right;
            color: #1a1a1a;
        }

        .summary-separator td {
            border-top: 1px solid #dddddd;
            padding-top: 6px;
        }

        .summary-total td {
            background-color: #1a1a1a;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            padding: 8px 10px;
        }

        .summary-total .summary-value {
            color: #ffffff;
        }

        .diskon-value {
            color: #dc2626;
        }

        /* ── Notes ───────────────────────────────────────────── */
        .notes-section {
            clear: both;
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e5e5e5;
        }

        .notes-title {
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #888888;
            margin-bottom: 4px;
        }

        .notes-text {
            font-size: 9.5px;
            color: #555555;
            line-height: 1.6;
        }

        /* ── Footer ──────────────────────────────────────────── */
        .footer {
            margin-top: 32px;
            padding-top: 12px;
            border-top: 2px solid #1a1a1a;
            text-align: center;
        }

        .footer-text {
            font-size: 9px;
            color: #888888;
            letter-spacing: 0.5px;
        }

        .footer-brand {
            font-size: 10px;
            font-weight: bold;
            color: #1a1a1a;
            margin-top: 3px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .clearfix::after {
            content: "";
            display: table;
            clear: both;
        }
    </style>
</head>
<body>
<div class="page">

    {{-- ── Header ─────────────────────────────────────────── --}}
    <div class="header">
        <div class="header-inner">
            <div class="brand-col">
                <div class="brand-name">PROVILLO</div>
                <div class="brand-tagline">Sepatu Berkualitas dari Mojokerto</div>
                <div class="brand-address">
                    Jl. Raya Mojokerto, Mojokerto, Jawa Timur 61321<br>
                    Telp: (0321) 123-456 &nbsp;|&nbsp; Email: info@provillo.id
                </div>
            </div>
            <div class="invoice-col">
                <div class="invoice-label">Invoice</div>
                <div class="invoice-number">{{ $nomorInvoice }}</div>
                <div class="invoice-meta">
                    No. Pesanan: {{ $pesanan->nomor_pesanan }}<br>
                    Tanggal: {{ \Carbon\Carbon::parse($pesanan->tanggal)->isoFormat('D MMMM YYYY') }}
                </div>
                <span class="status-badge status-{{ $pesanan->status }}">
                    {{ ucfirst($pesanan->status) }}
                </span>
            </div>
        </div>
    </div>

    {{-- ── Info Customer & Invoice ─────────────────────────── --}}
    <div class="info-section">
        <div class="info-col-left">
            <div class="section-title">Tagihan Kepada</div>
            <div class="customer-name">{{ $pesanan->customer->nama_customer }}</div>
            @if($pesanan->customer->no_hp)
                <div class="info-row">
                    <span class="info-label">No. HP</span>
                    <span class="info-value">{{ $pesanan->customer->no_hp }}</span>
                </div>
            @endif
            @if($pesanan->customer->alamat)
                <div class="info-row">
                    <span class="info-label">Alamat</span>
                    <span class="info-value">{{ $pesanan->customer->alamat }}</span>
                </div>
            @endif
            <!--<div class="info-row">
                <span class="info-label">Jenis</span>
                <span class="info-value">{{ strtoupper($pesanan->customer->jenis_customer) }}</span>
            </div>-->
        </div>
        <div class="info-col-right">
            <div class="section-title">Detail Invoice</div>
            <div class="info-row">
                <span class="info-label">No. Invoice</span>
                <span class="info-value">{{ $nomorInvoice }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">No. Pesanan</span>
                <span class="info-value">{{ $pesanan->nomor_pesanan }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tanggal</span>
                <span class="info-value">{{ \Carbon\Carbon::parse($pesanan->tanggal)->isoFormat('D MMMM YYYY') }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Dibuat oleh</span>
                <span class="info-value">{{ $pesanan->createdBy->nama ?? '-' }}</span>
            </div>
        </div>
    </div>

    {{-- ── Tabel Item ───────────────────────────────────────── --}}
    <table class="items-table">
        <thead>
            <tr>
                <th class="td-no">No</th>
                <th class="td-produk" style="text-align:left;">Produk</th>
                <th class="td-qty">Qty</th>
                <th class="td-harga">Harga Satuan</th>
                <th class="td-subtot">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach($pesanan->detailPesanan as $i => $detail)
            <tr>
                <td class="td-no">{{ $i + 1 }}</td>
                <td class="td-produk">
                    <div class="produk-nama">{{ $detail->produk->nama_produk }}</div>
                    <div class="produk-kode">{{ $detail->produk->kode_produk }}</div>
                </td>
                <td class="td-qty">{{ $detail->qty }}</td>
                <td class="td-harga">
                    Rp {{ number_format($detail->harga, 0, ',', '.') }}
                </td>
                <td class="td-subtot">
                    Rp {{ number_format($detail->subtotal, 0, ',', '.') }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- ── Summary ──────────────────────────────────────────── --}}
    <div class="summary-wrapper clearfix">
        <table class="summary-table">
            <tr>
                <td class="summary-label">Subtotal</td>
                <td class="summary-value">Rp {{ number_format($pesanan->subtotal, 0, ',', '.') }}</td>
            </tr>
            @if((float)$pesanan->diskon > 0)
            <tr>
                <td class="summary-label">Diskon</td>
                <td class="summary-value diskon-value">- Rp {{ number_format($pesanan->diskon, 0, ',', '.') }}</td>
            </tr>
            @endif
            @if((float)$pesanan->ongkir > 0)
            <tr>
                <td class="summary-label">Ongkos Kirim</td>
                <td class="summary-value">Rp {{ number_format($pesanan->ongkir, 0, ',', '.') }}</td>
            </tr>
            @endif
            <tr class="summary-separator">
                <td colspan="2"></td>
            </tr>
            <tr class="summary-total">
                <td class="summary-label">Total</td>
                <td class="summary-value">Rp {{ number_format($pesanan->total, 0, ',', '.') }}</td>
            </tr>
        </table>
    </div>

    {{-- ── Catatan ──────────────────────────────────────────── --}}
    @if($pesanan->keterangan)
    <div class="notes-section">
        <div class="notes-title">Catatan</div>
        <div class="notes-text">{{ $pesanan->keterangan }}</div>
    </div>
    @endif

    {{-- ── Footer ──────────────────────────────────────────── --}}
    <div class="footer">
        <div class="footer-text">Terima kasih atas kepercayaan Anda kepada Provillo.</div>
        <div class="footer-text" style="margin-top:2px;">
            Dokumen ini dicetak secara otomatis oleh sistem — {{ \Carbon\Carbon::now()->isoFormat('D MMMM YYYY, HH:mm') }} WIB
        </div>
        <div class="footer-brand">PROVILLO</div>
    </div>

</div>
</body>
</html>
