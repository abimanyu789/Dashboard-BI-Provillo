<?php

namespace App\Services;

use App\Models\BahanBaku;
use App\Models\Produksi;
use App\Models\ProduksiPemakaianBahan;
use App\Services\Inventory\StockBahanBakuService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;

class ProduksiMaterialService
{
    private const STOCK_EPSILON = 0.00001;

    public function __construct(
        private readonly StockBahanBakuService $stockService,
    ) {}

    /**
     * @param  list<array{id: int, kebutuhan: float}>  $requirements
     */
    public function recordPlannedRequirements(
        Produksi $produksi,
        array $requirements,
        int $userId,
    ): void {
        foreach ($requirements as $requirement) {
            ProduksiPemakaianBahan::query()->firstOrCreate(
                [
                    'idempotency_key' => "planned:{$produksi->id}:{$requirement['id']}",
                ],
                [
                    'produksi_id' => $produksi->id,
                    'bahan_baku_id' => $requirement['id'],
                    'movement_type' => 'planned',
                    'qty' => $requirement['kebutuhan'],
                    'tanggal' => now()->toDateString(),
                    'keterangan' => 'Kebutuhan terencana berdasarkan BOM saat produksi dimulai.',
                    'created_by' => $userId,
                ],
            );
        }
    }

    /**
     * @param  array{
     *     bahan_baku_id: int,
     *     movement_type: 'issued'|'consumed'|'additional'|'returned'|'adjustment',
     *     qty: float|int|string,
     *     tanggal: string,
     *     keterangan?: string|null,
     *     idempotency_key: string
     * }  $data
     */
    public function recordMovement(Produksi $produksi, array $data, int $userId): ProduksiPemakaianBahan
    {
        return DB::transaction(function () use ($produksi, $data, $userId) {
            $existing = ProduksiPemakaianBahan::query()
                ->where('idempotency_key', $data['idempotency_key'])
                ->first();

            if ($existing !== null) {
                $matchesOriginal = (int) $existing->produksi_id === (int) $produksi->id
                    && (int) $existing->bahan_baku_id === (int) $data['bahan_baku_id']
                    && $existing->movement_type === $data['movement_type']
                    && abs((float) $existing->qty - (float) $data['qty']) <= self::STOCK_EPSILON;

                if (! $matchesOriginal) {
                    throw new \RuntimeException('Kunci idempotensi sudah digunakan untuk pergerakan yang berbeda.');
                }

                return $existing;
            }

            $lockedProduksi = Produksi::query()->lockForUpdate()->findOrFail($produksi->id);
            $movementType = $data['movement_type'];
            $qty = (float) $data['qty'];

            $this->assertMovementAllowed($lockedProduksi, $movementType, $qty, $data['keterangan'] ?? null);

            $bahanBaku = BahanBaku::query()
                ->lockForUpdate()
                ->findOrFail($data['bahan_baku_id']);

            if (in_array($movementType, ['consumed', 'returned'], true)) {
                $returnable = $this->returnableQuantity($lockedProduksi->id, $bahanBaku->id);

                if ($qty - $returnable > self::STOCK_EPSILON) {
                    throw new \RuntimeException(
                        "Jumlah {$movementType} melebihi bahan terbit yang belum digunakan. "
                        ."Maksimum: {$returnable}."
                    );
                }
            }

            $movement = ProduksiPemakaianBahan::query()->create([
                'produksi_id' => $lockedProduksi->id,
                'bahan_baku_id' => $bahanBaku->id,
                'movement_type' => $movementType,
                'qty' => $qty,
                'tanggal' => $data['tanggal'],
                'keterangan' => $data['keterangan'] ?? null,
                'created_by' => $userId,
                'idempotency_key' => $data['idempotency_key'],
            ]);

            $this->applyStockEffect($movement, $bahanBaku, $userId);

            return $movement->load(['bahanBaku', 'createdBy', 'stokHistory']);
        }, attempts: 3);
    }

    public function returnUnusedOnCancellation(Produksi $produksi, int $userId): void
    {
        foreach ($this->materialSummary($produksi) as $material) {
            if ($material['returnable'] <= self::STOCK_EPSILON) {
                continue;
            }

            $this->recordMovement($produksi, [
                'bahan_baku_id' => $material['id'],
                'movement_type' => 'returned',
                'qty' => $material['returnable'],
                'tanggal' => now()->toDateString(),
                'keterangan' => 'Pengembalian otomatis bahan terbit yang belum digunakan saat produksi dibatalkan.',
                'idempotency_key' => "cancel-return:{$produksi->id}:{$material['id']}",
            ], $userId);
        }
    }

    /**
     * @return list<array{
     *     id: int,
     *     kode_bahan: string,
     *     nama_bahan: string,
     *     satuan: string,
     *     planned: float,
     *     available: float,
     *     issued: float,
     *     consumed: float,
     *     returned: float,
     *     shortage: float,
     *     returnable: float,
     *     status: 'sufficient'|'shortage'|'fulfilled'
     * }>
     */
    public function materialSummary(Produksi $produksi): array
    {
        $movements = ProduksiPemakaianBahan::query()
            ->with('bahanBaku')
            ->where('produksi_id', $produksi->id)
            ->get();

        $summary = $movements
            ->groupBy('bahan_baku_id')
            ->map(function (EloquentCollection $materialMovements): array {
                /** @var ProduksiPemakaianBahan $first */
                $first = $materialMovements->firstOrFail();
                $bahan = $first->bahanBaku;
                $planned = (float) $materialMovements->where('movement_type', 'planned')->sum('qty');
                $issued = (float) $materialMovements->whereIn('movement_type', ['issued', 'additional'])->sum('qty');
                $consumed = (float) $materialMovements->where('movement_type', 'consumed')->sum('qty');
                $returned = (float) $materialMovements->where('movement_type', 'returned')->sum('qty');
                $netIssued = max(0.0, $issued - $returned);
                $shortage = max(0.0, $planned - $netIssued);
                $available = (float) $bahan->getAttribute('stok');

                $status = match (true) {
                    $planned > 0 && $shortage <= self::STOCK_EPSILON => 'fulfilled',
                    $shortage > $available + self::STOCK_EPSILON => 'shortage',
                    default => 'sufficient',
                };

                return [
                    'id' => $first->bahan_baku_id,
                    'kode_bahan' => (string) $bahan->getAttribute('kode_bahan'),
                    'nama_bahan' => (string) $bahan->getAttribute('nama_bahan'),
                    'satuan' => (string) ($bahan->getAttribute('satuan') ?? ''),
                    'planned' => $planned,
                    'available' => $available,
                    'issued' => $issued,
                    'consumed' => $consumed,
                    'returned' => $returned,
                    'shortage' => $shortage,
                    'returnable' => max(0.0, $issued - $consumed - $returned),
                    'status' => $status,
                ];
            });

        return array_values($summary->all());
    }

    public function hasShortage(Produksi $produksi): bool
    {
        return collect($this->materialSummary($produksi))
            ->contains(fn (array $material): bool => $material['shortage'] > self::STOCK_EPSILON);
    }

    public function assertConsistent(Produksi $produksi): void
    {
        foreach ($this->materialSummary($produksi) as $material) {
            if ($material['consumed'] - ($material['issued'] - $material['returned']) > self::STOCK_EPSILON) {
                throw new \RuntimeException(
                    "Pergerakan bahan {$material['nama_bahan']} tidak konsisten: konsumsi melebihi bahan terbit bersih."
                );
            }

            if ($material['returnable'] > self::STOCK_EPSILON) {
                throw new \RuntimeException(
                    "Produksi belum dapat diselesaikan karena {$material['nama_bahan']} masih memiliki "
                    ."{$material['returnable']} {$material['satuan']} bahan terbit yang belum digunakan atau dikembalikan."
                );
            }
        }
    }

    private function assertMovementAllowed(
        Produksi $produksi,
        string $movementType,
        float $qty,
        ?string $keterangan,
    ): void {
        if (! $produksi->isProses()) {
            throw new \RuntimeException('Pergerakan bahan hanya dapat dicatat saat produksi berstatus Proses.');
        }

        if ($movementType === 'adjustment') {
            if (abs($qty) <= self::STOCK_EPSILON) {
                throw new \RuntimeException('Jumlah penyesuaian tidak boleh nol.');
            }

            if (blank($keterangan)) {
                throw new \RuntimeException('Alasan penyesuaian wajib diisi.');
            }

            return;
        }

        if ($qty <= self::STOCK_EPSILON) {
            throw new \RuntimeException('Jumlah pergerakan bahan harus lebih dari nol.');
        }
    }

    private function returnableQuantity(int $produksiId, int $bahanBakuId): float
    {
        $movements = ProduksiPemakaianBahan::query()
            ->where('produksi_id', $produksiId)
            ->where('bahan_baku_id', $bahanBakuId)
            ->lockForUpdate()
            ->get(['movement_type', 'qty']);

        $issued = (float) $movements->whereIn('movement_type', ['issued', 'additional'])->sum('qty');
        $consumed = (float) $movements->where('movement_type', 'consumed')->sum('qty');
        $returned = (float) $movements->where('movement_type', 'returned')->sum('qty');

        return max(0.0, $issued - $consumed - $returned);
    }

    private function applyStockEffect(
        ProduksiPemakaianBahan $movement,
        BahanBaku $bahanBaku,
        int $userId,
    ): void {
        if (in_array($movement->movement_type, ['issued', 'additional'], true)) {
            $this->stockService->reduceStock(
                bahanBaku: $bahanBaku,
                qty: (float) $movement->qty,
                jenis: 'produksi',
                keterangan: $movement->keterangan,
                createdBy: $userId,
                produksiPemakaianBahanId: $movement->id,
            );

            return;
        }

        if ($movement->movement_type === 'returned') {
            $this->stockService->addStock(
                bahanBaku: $bahanBaku,
                qty: (float) $movement->qty,
                jenis: 'rollback',
                keterangan: $movement->keterangan,
                createdBy: $userId,
                produksiPemakaianBahanId: $movement->id,
            );

            return;
        }

        if ($movement->movement_type !== 'adjustment') {
            return;
        }

        if ((float) $movement->qty > 0) {
            $this->stockService->addStock(
                bahanBaku: $bahanBaku,
                qty: (float) $movement->qty,
                jenis: 'penyesuaian',
                keterangan: $movement->keterangan,
                createdBy: $userId,
                produksiPemakaianBahanId: $movement->id,
            );

            return;
        }

        $this->stockService->reduceStock(
            bahanBaku: $bahanBaku,
            qty: abs((float) $movement->qty),
            jenis: 'penyesuaian',
            keterangan: $movement->keterangan,
            createdBy: $userId,
            produksiPemakaianBahanId: $movement->id,
        );
    }
}
