<?php

use App\Models\BahanBaku;
use App\Models\BomCategorie;
use App\Models\BomDetail;
use App\Models\DetailProduksi;
use App\Models\Karyawan;
use App\Models\Produk;
use App\Models\Produksi;
use App\Models\ProduksiItem;
use App\Models\ProduksiKaryawan;
use App\Models\StokProdukCacat;
use App\Models\StokProdukJadi;
use App\Models\User;
use App\Services\ProduksiMaterialService;
use App\Services\ProduksiService;
use Illuminate\Support\Str;

function createQcProduction(int $target = 10): array
{
    $user = User::factory()->create();
    $worker = Karyawan::query()->create([
        'nama_karyawan' => 'Tukang Uji',
        'jabatan' => 'Tukang',
        'status' => 'aktif',
    ]);
    $material = BahanBaku::query()->create([
        'kode_bahan' => 'QC-BB-'.Str::upper(Str::random(6)),
        'nama_bahan' => 'Bahan QC',
        'satuan' => 'meter',
        'stok' => 20,
    ]);
    $bom = BomCategorie::query()->create(['nama_bom' => 'QC BOM '.Str::random(6)]);
    BomDetail::query()->create([
        'bom_category_id' => $bom->id,
        'bahan_baku_id' => $material->id,
        'qty_per_pair' => 1,
    ]);
    $product = Produk::query()->create([
        'kode_produk' => 'QC-PR-'.Str::upper(Str::random(6)),
        'nama_produk' => 'Produk QC',
        'harga_jual' => 100000,
        'stok' => 0,
        'bom_category_id' => $bom->id,
    ]);
    $production = Produksi::query()->create([
        'created_by' => $user->id,
        'jenis_produksi' => 'restok',
        'qty_target' => $target,
        'qty_selesai' => 0,
        'status' => 'proses',
        'status_qc' => 'belum_dicek',
    ]);
    ProduksiItem::query()->create([
        'produksi_id' => $production->id,
        'produk_id' => $product->id,
        'qty_target' => $target,
    ]);
    ProduksiKaryawan::query()->create([
        'produksi_id' => $production->id,
        'karyawan_id' => $worker->id,
    ]);

    return compact('user', 'worker', 'product', 'production');
}

function qcProgressData(array $context, array $overrides = []): array
{
    return array_merge([
        'produk_id' => $context['product']->id,
        'karyawan_id' => $context['worker']->id,
        'qty' => 2,
        'qc_status' => 'lolos',
        'alasan_qc' => null,
        'disposisi_qc' => null,
        'rework_parent_id' => null,
        'catatan' => null,
        'idempotency_key' => (string) Str::uuid(),
    ], $overrides);
}

it('requires production progress to be attributed to an assigned worker', function () {
    $context = createQcProduction();
    $otherWorker = Karyawan::query()->create([
        'nama_karyawan' => 'Tukang Lain',
        'status' => 'aktif',
    ]);

    expect(fn () => app(ProduksiService::class)->inputProgress(
        $context['production'],
        qcProgressData($context, ['karyawan_id' => $otherWorker->id]),
        $context['user']->id,
    ))->toThrow(RuntimeException::class);

    expect(DetailProduksi::query()->count())->toBe(0);
});

it('adds passed QC quantity to normal finished stock exactly once', function () {
    $context = createQcProduction();
    $data = qcProgressData($context, ['qty' => 4]);
    $service = app(ProduksiService::class);

    $first = $service->inputProgress($context['production'], $data, $context['user']->id);
    $second = $service->inputProgress($context['production'], $data, $context['user']->id);

    expect($second->id)->toBe($first->id)
        ->and((int) $context['product']->fresh()->stok)->toBe(4)
        ->and(StokProdukJadi::query()->where('detail_produksi_id', $first->id)->count())->toBe(1)
        ->and($context['production']->fresh()->qty_selesai)->toBe(4);
});

it('TC_QC_001 and TC_MFG_013 stores failed QC with a reason and disposition without adding normal stock', function () {
    $context = createQcProduction();

    $detail = app(ProduksiService::class)->inputProgress(
        $context['production'],
        qcProgressData($context, [
            'qty' => 3,
            'qc_status' => 'tidak_lolos',
            'alasan_qc' => 'Jahitan tidak rapi',
            'disposisi_qc' => 'rework',
        ]),
        $context['user']->id,
    );

    expect($detail->qc_status)->toBe('tidak_lolos')
        ->and($detail->alasan_qc)->toBe('Jahitan tidak rapi')
        ->and($detail->disposisi_qc)->toBe('rework')
        ->and((int) $context['product']->fresh()->stok)->toBe(0)
        ->and(StokProdukJadi::query()->count())->toBe(0)
        ->and(app(ProduksiService::class)->wageBasis($context['production']))->toBe([]);
});

it('requires failed QC reason and disposition through the HTTP validation contract', function () {
    $context = createQcProduction();
    $this->actingAs($context['user'])
        ->patch(route('produksi.progress', $context['production']), [
            'produk_id' => $context['product']->id,
            'karyawan_id' => $context['worker']->id,
            'qty' => 1,
            'qc_status' => 'tidak_lolos',
            'idempotency_key' => (string) Str::uuid(),
        ])
        ->assertSessionHasErrors(['alasan_qc', 'disposisi_qc']);
});

it('records sellable defective and destroyed dispositions outside normal stock', function (string $disposition) {
    $context = createQcProduction();
    $detail = app(ProduksiService::class)->inputProgress(
        $context['production'],
        qcProgressData($context, [
            'qty' => 2,
            'qc_status' => 'tidak_lolos',
            'alasan_qc' => 'Tidak sesuai pesanan customer',
            'disposisi_qc' => $disposition,
        ]),
        $context['user']->id,
    );

    expect((int) $context['product']->fresh()->stok)->toBe(0)
        ->and(StokProdukJadi::query()->count())->toBe(0)
        ->and(StokProdukCacat::query()->where([
            'detail_produksi_id' => $detail->id,
            'disposisi' => $disposition,
            'qty' => 2,
        ])->exists())->toBeTrue();
})->with(['jual_cacat', 'dimusnahkan']);

it('TC_RWK_001 traces a rework result to its failed parent and posts stock only when it passes', function () {
    $context = createQcProduction();
    $service = app(ProduksiService::class);
    $failed = $service->inputProgress(
        $context['production'],
        qcProgressData($context, [
            'qty' => 3,
            'qc_status' => 'tidak_lolos',
            'alasan_qc' => 'Pengeleman tidak rapi',
            'disposisi_qc' => 'rework',
        ]),
        $context['user']->id,
    );

    $data = qcProgressData($context, [
        'qty' => 3,
        'rework_parent_id' => $failed->id,
    ]);
    $passed = $service->inputProgress($context['production'], $data, $context['user']->id);
    $duplicate = $service->inputProgress($context['production'], $data, $context['user']->id);

    expect($passed->rework_parent_id)->toBe($failed->id)
        ->and($duplicate->id)->toBe($passed->id)
        ->and((int) $context['product']->fresh()->stok)->toBe(3)
        ->and(StokProdukJadi::query()->where('detail_produksi_id', $passed->id)->count())->toBe(1)
        ->and(app(ProduksiService::class)->wageBasis($context['production']))->toBe([
            [
                'karyawan_id' => $context['worker']->id,
                'nama' => $context['worker']->nama_karyawan,
                'qty_lolos' => 3,
            ],
        ]);
});

it('prevents production completion while an active rework quantity remains', function () {
    $context = createQcProduction(target: 2);
    $service = app(ProduksiService::class);
    $service->inputProgress(
        $context['production'],
        qcProgressData($context, [
            'qty' => 2,
            'qc_status' => 'tidak_lolos',
            'alasan_qc' => 'Jahitan tidak rapi',
            'disposisi_qc' => 'rework',
        ]),
        $context['user']->id,
    );
    $service->inputProgress(
        $context['production'],
        qcProgressData($context, ['qty' => 2]),
        $context['user']->id,
    );

    expect(fn () => $service->selesaikanProduksi($context['production']->fresh()))
        ->toThrow(RuntimeException::class, 'rework aktif');

    expect($context['production']->fresh()->status)->toBe('proses');
});

it('completes production after passed target and all issued material is consumed', function () {
    $context = createQcProduction(target: 2);
    $material = BahanBaku::query()->where('nama_bahan', 'Bahan QC')->latest('id')->firstOrFail();
    $materialService = app(ProduksiMaterialService::class);
    $productionService = app(ProduksiService::class);

    foreach ([['issued', 2], ['consumed', 2]] as [$type, $qty]) {
        $materialService->recordMovement($context['production'], [
            'bahan_baku_id' => $material->id,
            'movement_type' => $type,
            'qty' => $qty,
            'tanggal' => now()->toDateString(),
            'idempotency_key' => (string) Str::uuid(),
        ], $context['user']->id);
    }

    $productionService->inputProgress(
        $context['production'],
        qcProgressData($context, ['qty' => 2]),
        $context['user']->id,
    );

    $completed = $productionService->selesaikanProduksi($context['production']->fresh());

    expect($completed->status)->toBe('selesai')
        ->and($completed->qty_selesai)->toBe(2)
        ->and($materialService->materialSummary($completed)[0]['returnable'])->toBe(0.0);
});

it('TC_WAGE_001 calculates wage basis only from worker-attributed passed quantities', function () {
    $context = createQcProduction();
    $service = app(ProduksiService::class);
    $service->inputProgress(
        $context['production'],
        qcProgressData($context, ['qty' => 4]),
        $context['user']->id,
    );
    $service->inputProgress(
        $context['production'],
        qcProgressData($context, [
            'qty' => 3,
            'qc_status' => 'tidak_lolos',
            'alasan_qc' => 'Jahitan tidak rapi',
            'disposisi_qc' => 'dimusnahkan',
        ]),
        $context['user']->id,
    );
    DetailProduksi::query()->create([
        'produksi_id' => $context['production']->id,
        'produk_id' => $context['product']->id,
        'karyawan_id' => null,
        'qty_selesai' => 2,
        'qc_status' => 'lolos',
    ]);

    expect($service->wageBasis($context['production']))->toBe([
        [
            'karyawan_id' => $context['worker']->id,
            'nama' => $context['worker']->nama_karyawan,
            'qty_lolos' => 4,
        ],
    ]);
});
