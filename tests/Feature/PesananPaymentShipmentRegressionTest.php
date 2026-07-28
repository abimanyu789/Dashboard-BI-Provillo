<?php

use App\Models\ArusKas;
use App\Models\Customer;
use App\Models\DetailPesanan;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\StokProdukJadi;
use App\Models\User;
use App\Services\PembayaranService;
use Illuminate\Support\Str;

function createOrderRegressionContext(int $orderedQty = 10, float $total = 1000000): array
{
    $user = User::factory()->create();
    $customer = Customer::query()->create([
        'nama_customer' => 'Customer Regresi',
        'jenis_customer' => 'b2b',
        'no_hp' => '08'.random_int(100000000, 999999999),
    ]);
    $product = Produk::query()->create([
        'kode_produk' => 'REG-'.Str::upper(Str::random(6)),
        'nama_produk' => 'Produk Regresi',
        'harga_jual' => $total / $orderedQty,
        'stok' => 20,
        'minimum_stok' => 0,
    ]);
    $order = Pesanan::query()->create([
        'customer_id' => $customer->id,
        'created_by' => $user->id,
        'tanggal' => now()->toDateString(),
        'status' => 'pending',
        'jenis_pembayaran' => 'bertahap',
        'subtotal' => $total,
        'diskon' => 0,
        'ongkir' => 0,
        'total' => $total,
    ]);
    DetailPesanan::query()->create([
        'pesanan_id' => $order->id,
        'produk_id' => $product->id,
        'qty' => $orderedQty,
        'harga' => $total / $orderedQty,
        'subtotal' => $total,
    ]);

    return compact('user', 'customer', 'product', 'order');
}

it('records multiple payments, derives partial status, and creates matching cash flow', function () {
    $context = createOrderRegressionContext();
    $service = app(PembayaranService::class);

    $first = $service->create($context['order'], [
        'tanggal' => now()->toDateString(),
        'jenis_pembayaran' => 'dp',
        'nominal' => 250000,
        'metode' => 'transfer',
        'keterangan' => 'DP pertama',
    ], $context['user']->id);
    $second = $service->create($context['order']->fresh(), [
        'tanggal' => now()->toDateString(),
        'jenis_pembayaran' => 'termin',
        'nominal' => 250000,
        'metode' => 'transfer',
        'keterangan' => 'Termin kedua',
    ], $context['user']->id);

    expect(Pembayaran::query()->where('pesanan_id', $context['order']->id)->count())->toBe(2)
        ->and($context['order']->fresh()->statusPembayaran())->toBe('sebagian')
        ->and((float) $context['order']->fresh()->sisaTagihan())->toBe(500000.0)
        ->and(ArusKas::query()->whereIn('pembayaran_id', [$first->id, $second->id])->count())->toBe(2)
        ->and((float) ArusKas::query()->where('pembayaran_id', $first->id)->value('nominal'))->toBe(250000.0);
});

it('prevents overpayment without creating payment or cash-flow rows', function () {
    $context = createOrderRegressionContext(total: 500000);

    expect(fn () => app(PembayaranService::class)->create($context['order'], [
        'tanggal' => now()->toDateString(),
        'jenis_pembayaran' => 'pelunasan',
        'nominal' => 500001,
        'metode' => 'tunai',
    ], $context['user']->id))->toThrow(RuntimeException::class, 'melebihi sisa tagihan');

    expect(Pembayaran::query()->count())->toBe(0)
        ->and(ArusKas::query()->count())->toBe(0);
});

it('TC_SHP_001 keeps partial delivery functional and calculates the remaining shipment', function () {
    $context = createOrderRegressionContext(orderedQty: 10);

    $this->actingAs($context['user'])
        ->post(route('stok-produk-jadi.store'), [
            'jenis_transaksi' => 'pengiriman',
            'pesanan_id' => $context['order']->id,
            'items' => [[
                'produk_id' => $context['product']->id,
                'qty' => 4,
                'keterangan' => 'Pengiriman parsial',
            ]],
        ])
        ->assertSessionHasNoErrors();

    $progress = $context['order']->fresh()->progressPengiriman();

    expect(StokProdukJadi::query()->where([
        'pesanan_id' => $context['order']->id,
        'produk_id' => $context['product']->id,
        'jenis_transaksi' => 'pengiriman',
    ])->value('qty'))->toBe(4)
        ->and((int) $context['product']->fresh()->stok)->toBe(16)
        ->and($progress['overall']['qty_dikirim'])->toBe(4)
        ->and($progress['overall']['qty_sisa'])->toBe(6)
        ->and($context['order']->fresh()->isFullyShipped())->toBeFalse()
        ->and($context['order']->fresh()->status)->toBe('proses');
});

it('completes an order only after it is fully paid and fully shipped', function () {
    $context = createOrderRegressionContext(orderedQty: 2, total: 200000);
    app(PembayaranService::class)->create($context['order'], [
        'tanggal' => now()->toDateString(),
        'jenis_pembayaran' => 'pelunasan',
        'nominal' => 200000,
        'metode' => 'transfer',
    ], $context['user']->id);

    expect($context['order']->fresh()->status)->toBe('proses');

    $this->actingAs($context['user'])
        ->post(route('stok-produk-jadi.store'), [
            'jenis_transaksi' => 'pengiriman',
            'pesanan_id' => $context['order']->id,
            'items' => [[
                'produk_id' => $context['product']->id,
                'qty' => 2,
            ]],
        ])
        ->assertSessionHasNoErrors();

    expect($context['order']->fresh()->status)->toBe('selesai')
        ->and($context['order']->fresh()->statusPembayaran())->toBe('lunas')
        ->and($context['order']->fresh()->isFullyShipped())->toBeTrue();
});
