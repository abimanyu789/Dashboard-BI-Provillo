<?php

use App\Http\Controllers\ArusKasController;
use App\Http\Controllers\BahanBakuController;
use App\Http\Controllers\BomCategorieController;
use App\Http\Controllers\BomDetailController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\KaryawanController;
use App\Http\Controllers\PembayaranController;
use App\Http\Controllers\PesananController;
use App\Http\Controllers\ProdukController;
use App\Http\Controllers\ProduksiController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StokBahanBakuController;
use App\Http\Controllers\StokProdukJadiController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Master Data - Bahan Baku
    Route::get('bahan-baku/export', [BahanBakuController::class, 'export'])->name('bahan-baku.export');
    Route::post('bahan-baku/import', [BahanBakuController::class, 'import'])->name('bahan-baku.import');
    Route::get('bahan-baku/template', [BahanBakuController::class, 'template'])->name('bahan-baku.template');
    Route::resource('bahan-baku', BahanBakuController::class);

    // Master Data - Produk
    Route::get('produk/export', [ProdukController::class, 'export'])->name('produk.export');
    Route::post('produk/import', [ProdukController::class, 'import'])->name('produk.import');
    Route::get('produk/template', [ProdukController::class, 'template'])->name('produk.template');
    Route::resource('produk', ProdukController::class);

    // Master Data - Karyawan
    Route::get('karyawan/export', [KaryawanController::class, 'export'])->name('karyawan.export');
    Route::post('karyawan/import', [KaryawanController::class, 'import'])->name('karyawan.import');
    Route::get('karyawan/template', [KaryawanController::class, 'template'])->name('karyawan.template');
    Route::resource('karyawan', KaryawanController::class);

    // Master Data - Customer
    Route::get('customer/export', [CustomerController::class, 'export'])->name('customer.export');
    Route::post('customer/import', [CustomerController::class, 'import'])->name('customer.import');
    Route::get('customer/template', [CustomerController::class, 'template'])->name('customer.template');
    Route::resource('customer', CustomerController::class);

    // BOM Category
    Route::get('bom-categorie/export', [BomCategorieController::class, 'export'])->name('bom-categorie.export');
    Route::resource('bom-categorie', BomCategorieController::class);

    // BOM Detail (inline operations — no separate pages)
    Route::post(
        'bom-categorie/{bom_categorie}/bom-detail',
        [BomDetailController::class, 'store']
    )->name('bom-detail.store');

    Route::put(
        'bom-detail/{bom_detail}',
        [BomDetailController::class, 'update']
    )->name('bom-detail.update');

    Route::delete(
        'bom-detail/{bom_detail}',
        [BomDetailController::class, 'destroy']
    )->name('bom-detail.destroy');

    // Inventory - Stok Bahan Baku
    Route::resource('stok-bahan-baku', StokBahanBakuController::class)
        ->only(['index', 'create', 'store', 'show']);

    // Inventory - Stok Produk Jadi
    Route::resource('stok-produk-jadi', StokProdukJadiController::class)
        ->only(['index', 'create', 'store', 'show']);

    // Pesanan
    Route::resource('pesanan', PesananController::class);
    Route::patch('pesanan/{pesanan}/status', [PesananController::class, 'updateStatus'])
        ->name('pesanan.update-status');
    Route::get('pesanan/{pesanan}/invoice', [PesananController::class, 'invoice'])
        ->name('pesanan.invoice');
    Route::get('pesanan/{pesanan}/sisa-pengiriman', [StokProdukJadiController::class, 'sisaPengiriman'])
        ->name('pesanan.sisa-pengiriman');

    // Pembayaran (inline dari detail pesanan)
    Route::post('pesanan/{pesanan}/pembayaran', [PembayaranController::class, 'store'])
        ->name('pembayaran.store');
    Route::delete('pembayaran/{pembayaran}', [PembayaranController::class, 'destroy'])
        ->name('pembayaran.destroy');

    // Produksi
    Route::resource('produksi', ProduksiController::class)
        ->only(['index', 'create', 'store', 'show']);
    Route::patch('produksi/{produksi}/mulai', [ProduksiController::class, 'mulai'])
        ->name('produksi.mulai');
    Route::patch('produksi/{produksi}/batalkan', [ProduksiController::class, 'batalkan'])
        ->name('produksi.batalkan');
    Route::patch('produksi/{produksi}/progress', [ProduksiController::class, 'progress'])
        ->name('produksi.progress');
    Route::post('produksi/{produksi}/material-movements', [ProduksiController::class, 'materialMovement'])
        ->name('produksi.material-movements.store');
    Route::patch(
        'produksi/{produksi}/qc/{detailProduksi}/disposition',
        [ProduksiController::class, 'updateQcDisposition'],
    )->name('produksi.qc.disposition.update');
    Route::patch('produksi/{produksi}/selesai', [ProduksiController::class, 'selesai'])
        ->name('produksi.selesai');

    // Arus Kas
    Route::resource('arus-kas', ArusKasController::class)
        ->parameters(['arus-kas' => 'arusKas']);

    // Pusat Laporan
    Route::prefix('laporan')->name('laporan.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::get('types', [ReportController::class, 'types'])->name('types');
        Route::post('preview', [ReportController::class, 'preview'])->name('preview');
        Route::get('export', [ReportController::class, 'export'])->name('export');
    });
});

require __DIR__.'/settings.php';
