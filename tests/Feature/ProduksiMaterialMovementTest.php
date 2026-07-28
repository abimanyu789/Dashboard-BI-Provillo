<?php

use App\Models\BahanBaku;
use App\Models\BomCategorie;
use App\Models\BomDetail;
use App\Models\Produk;
use App\Models\Produksi;
use App\Models\ProduksiItem;
use App\Models\ProduksiPemakaianBahan;
use App\Models\StokBahanBaku;
use App\Models\User;
use App\Services\ProduksiMaterialService;
use App\Services\ProduksiService;
use Illuminate\Support\Str;

function createMaterialProduction(float $stock = 10, float $qtyPerPair = 2, int $target = 5): array
{
    $user = User::factory()->create();
    $material = BahanBaku::query()->create([
        'kode_bahan' => 'BB-'.Str::upper(Str::random(8)),
        'nama_bahan' => 'Kulit Uji',
        'satuan' => 'meter',
        'stok' => $stock,
        'minimum_stok' => 0,
    ]);
    $bom = BomCategorie::query()->create(['nama_bom' => 'BOM '.Str::random(8)]);
    BomDetail::query()->create([
        'bom_category_id' => $bom->id,
        'bahan_baku_id' => $material->id,
        'qty_per_pair' => $qtyPerPair,
    ]);
    $product = Produk::query()->create([
        'kode_produk' => 'PR-'.Str::upper(Str::random(8)),
        'nama_produk' => 'Sepatu Uji',
        'harga_jual' => 100000,
        'stok' => 0,
        'minimum_stok' => 0,
        'bom_category_id' => $bom->id,
    ]);
    $production = Produksi::query()->create([
        'created_by' => $user->id,
        'jenis_produksi' => 'restok',
        'qty_target' => $target,
        'qty_selesai' => 0,
        'status' => 'draft',
        'status_qc' => 'belum_dicek',
    ]);
    ProduksiItem::query()->create([
        'produksi_id' => $production->id,
        'produk_id' => $product->id,
        'qty_target' => $target,
    ]);

    return compact('user', 'material', 'product', 'production');
}

it('TC_MFG_008 starts production with a valid BOM without deducting full planned stock', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction();

    app(ProduksiService::class)->mulaiProduksi($production, $user->id);

    expect($production->fresh()->status)->toBe('proses')
        ->and((float) $material->fresh()->stok)->toBe(10.0)
        ->and(ProduksiPemakaianBahan::query()->where([
            'produksi_id' => $production->id,
            'bahan_baku_id' => $material->id,
            'movement_type' => 'planned',
        ])->value('qty'))->toEqual(10.0)
        ->and(StokBahanBaku::query()->count())->toBe(0);
});

it('TC_MFG_010 starts production with insufficient stock and exposes its shortage', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction(stock: 3);

    app(ProduksiService::class)->mulaiProduksi($production, $user->id);
    $summary = app(ProduksiMaterialService::class)->materialSummary($production->fresh());

    expect($production->fresh()->status)->toBe('proses')
        ->and((float) $material->fresh()->stok)->toBe(3.0)
        ->and($summary)->toHaveCount(1)
        ->and($summary[0]['planned'])->toBe(10.0)
        ->and($summary[0]['shortage'])->toBe(10.0)
        ->and($summary[0]['status'])->toBe('shortage');
});

it('TC_MAT_001 records actual usage without deducting stock a second time on consumption', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction(stock: 20);
    $production = app(ProduksiService::class)->mulaiProduksi($production, $user->id);
    $service = app(ProduksiMaterialService::class);

    $movement = fn (string $type, float $qty) => $service->recordMovement($production, [
        'bahan_baku_id' => $material->id,
        'movement_type' => $type,
        'qty' => $qty,
        'tanggal' => now()->toDateString(),
        'keterangan' => "Uji {$type}",
        'idempotency_key' => (string) Str::uuid(),
    ], $user->id);

    $movement('issued', 6);
    expect((float) $material->fresh()->stok)->toBe(14.0);

    $movement('consumed', 4);
    expect((float) $material->fresh()->stok)->toBe(14.0);

    $movement('additional', 3);
    expect((float) $material->fresh()->stok)->toBe(11.0);

    $movement('returned', 2);
    expect((float) $material->fresh()->stok)->toBe(13.0)
        ->and(StokBahanBaku::query()->whereNotNull('produksi_pemakaian_bahan_id')->count())->toBe(3);
});

it('prevents stock from becoming negative and rolls back the material ledger', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction(stock: 2);
    $production = app(ProduksiService::class)->mulaiProduksi($production, $user->id);

    expect(fn () => app(ProduksiMaterialService::class)->recordMovement($production, [
        'bahan_baku_id' => $material->id,
        'movement_type' => 'issued',
        'qty' => 3,
        'tanggal' => now()->toDateString(),
        'keterangan' => null,
        'idempotency_key' => (string) Str::uuid(),
    ], $user->id))->toThrow(RuntimeException::class);

    expect((float) $material->fresh()->stok)->toBe(2.0)
        ->and(ProduksiPemakaianBahan::query()->where('movement_type', 'issued')->count())->toBe(0)
        ->and(StokBahanBaku::query()->count())->toBe(0);
});

it('rejects consumption and returns above the remaining unconsumed issued quantity', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction();
    $production = app(ProduksiService::class)->mulaiProduksi($production, $user->id);
    $service = app(ProduksiMaterialService::class);

    $service->recordMovement($production, [
        'bahan_baku_id' => $material->id,
        'movement_type' => 'issued',
        'qty' => 4,
        'tanggal' => now()->toDateString(),
        'idempotency_key' => (string) Str::uuid(),
    ], $user->id);

    expect(fn () => $service->recordMovement($production, [
        'bahan_baku_id' => $material->id,
        'movement_type' => 'consumed',
        'qty' => 5,
        'tanggal' => now()->toDateString(),
        'idempotency_key' => (string) Str::uuid(),
    ], $user->id))->toThrow(RuntimeException::class);

    expect(fn () => $service->recordMovement($production, [
        'bahan_baku_id' => $material->id,
        'movement_type' => 'returned',
        'qty' => 5,
        'tanggal' => now()->toDateString(),
        'idempotency_key' => (string) Str::uuid(),
    ], $user->id))->toThrow(RuntimeException::class);
});

it('TC_MAT_003 and TC_MFG_020 cancellation restores only issued material that remains unused', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction(stock: 20);
    $production = app(ProduksiService::class)->mulaiProduksi($production, $user->id);
    $service = app(ProduksiMaterialService::class);

    foreach ([['issued', 8], ['additional', 2], ['consumed', 6], ['returned', 1]] as [$type, $qty]) {
        $service->recordMovement($production, [
            'bahan_baku_id' => $material->id,
            'movement_type' => $type,
            'qty' => $qty,
            'tanggal' => now()->toDateString(),
            'idempotency_key' => (string) Str::uuid(),
        ], $user->id);
    }

    expect((float) $material->fresh()->stok)->toBe(11.0);

    app(ProduksiService::class)->batalkanProduksi($production, $user->id);

    expect($production->fresh()->status)->toBe('dibatalkan')
        ->and((float) $material->fresh()->stok)->toBe(14.0)
        ->and((float) ProduksiPemakaianBahan::query()
            ->where('idempotency_key', "cancel-return:{$production->id}:{$material->id}")
            ->value('qty'))->toBe(3.0);
});

it('TC_MFG_022 makes repeated material requests idempotent', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction();
    $production = app(ProduksiService::class)->mulaiProduksi($production, $user->id);
    $service = app(ProduksiMaterialService::class);
    $key = (string) Str::uuid();
    $data = [
        'bahan_baku_id' => $material->id,
        'movement_type' => 'issued',
        'qty' => 3,
        'tanggal' => now()->toDateString(),
        'idempotency_key' => $key,
    ];

    $first = $service->recordMovement($production, $data, $user->id);
    $second = $service->recordMovement($production, $data, $user->id);

    expect($second->id)->toBe($first->id)
        ->and((float) $material->fresh()->stok)->toBe(7.0)
        ->and(ProduksiPemakaianBahan::query()->where('idempotency_key', $key)->count())->toBe(1)
        ->and(StokBahanBaku::query()->where('produksi_pemakaian_bahan_id', $first->id)->count())->toBe(1);
});

it('requires a reason for adjustments and prevents negative adjusted stock', function () {
    ['user' => $user, 'material' => $material, 'production' => $production] = createMaterialProduction(stock: 2);
    $production = app(ProduksiService::class)->mulaiProduksi($production, $user->id);
    $service = app(ProduksiMaterialService::class);

    expect(fn () => $service->recordMovement($production, [
        'bahan_baku_id' => $material->id,
        'movement_type' => 'adjustment',
        'qty' => -1,
        'tanggal' => now()->toDateString(),
        'keterangan' => null,
        'idempotency_key' => (string) Str::uuid(),
    ], $user->id))->toThrow(RuntimeException::class);

    expect(fn () => $service->recordMovement($production, [
        'bahan_baku_id' => $material->id,
        'movement_type' => 'adjustment',
        'qty' => -3,
        'tanggal' => now()->toDateString(),
        'keterangan' => 'Koreksi hasil opname',
        'idempotency_key' => (string) Str::uuid(),
    ], $user->id))->toThrow(RuntimeException::class);

    expect((float) $material->fresh()->stok)->toBe(2.0);
});
