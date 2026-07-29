<?php

namespace App\Services;

use App\Models\BahanBaku;
use App\Models\Produksi;
use App\Models\ProduksiPemakaianBahan;
use App\Services\Inventory\StockBahanBakuService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\UniqueConstraintViolationException;
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
    /**
     * Pengeluaran bahan massal untuk rencana BOM yang masih tersisa.
     *
     * Hanya item dengan qty > 0 yang dicatat sebagai issued.
     * Seluruh batch memakai 1 transaksi luar; gagal satu = rollback semua.
     *
     * @param  array{
     *     tanggal: string,
     *     keterangan?: string|null,
     *     request_key: string,
     *     items: list<array{
     *         bahan_baku_id: int,
     *         qty: float|int|string,
     *         idempotency_key: string
     *     }>
     * }  $data
     * @return list<ProduksiPemakaianBahan>
     */
    public function recordBulkIssue(Produksi $produksi, array $data, int $userId): array
    {
        return DB::transaction(function () use ($produksi, $data, $userId) {
            $lockedProduksi = Produksi::query()->lockForUpdate()->findOrFail($produksi->id);

            if (! $lockedProduksi->isProses()) {
                throw new \RuntimeException(
                    'Pengeluaran bahan massal hanya dapat dilakukan saat produksi berstatus Sedang Diproduksi.'
                );
            }

            $items = collect($data['items'] ?? [])
                ->map(fn (array $item): array => [
                    'bahan_baku_id' => (int) $item['bahan_baku_id'],
                    'qty' => (float) $item['qty'],
                    'idempotency_key' => (string) $item['idempotency_key'],
                ])
                ->filter(fn (array $item): bool => $item['qty'] > self::STOCK_EPSILON)
                ->values();

            if ($items->isEmpty()) {
                throw new \RuntimeException(
                    'Tidak ada bahan dengan jumlah pengeluaran lebih dari nol.'
                );
            }

            $bahanIds = $items->pluck('bahan_baku_id')->unique()->values()->all();

            // Kunci semua bahan yang terdampak secara deterministik agar anti deadlock.
            $lockedBahans = BahanBaku::query()
                ->whereIn('id', $bahanIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($lockedBahans->count() !== count($bahanIds)) {
                throw new \RuntimeException('Sebagian bahan baku tidak ditemukan.');
            }

            $summaryById = collect($this->materialSummary($lockedProduksi))
                ->keyBy('id');

            $movements = [];

            // request_key = korelasi batch di klien (anti double-submit FE).
            // Idempotensi authoritative per baris memakai items.*.idempotency_key
            // agar retry/replay aman tanpa mengulang potongan stok.
            foreach ($items as $item) {
                $bahanId = $item['bahan_baku_id'];
                $qty = $item['qty'];
                $idempotencyKey = $item['idempotency_key'];

                // Cek replay dulu: validasi sisa rencana/stok hanya untuk item baru.
                // Tanpa ini, retry setelah sukses (kunci sama) ditolak karena shortage sudah 0.
                $existing = ProduksiPemakaianBahan::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing !== null) {
                    $matchesOriginal = (int) $existing->produksi_id === (int) $lockedProduksi->id
                        && (int) $existing->bahan_baku_id === $bahanId
                        && $existing->movement_type === 'issued'
                        && abs((float) $existing->qty - $qty) <= self::STOCK_EPSILON;

                    if (! $matchesOriginal) {
                        throw new \RuntimeException(
                            'Kunci idempotensi sudah digunakan untuk pergerakan yang berbeda.'
                        );
                    }

                    $movements[] = $existing->load(['bahanBaku', 'createdBy', 'stokHistory']);

                    continue;
                }

                $summary = $summaryById->get($bahanId);
                $planned = (float) ($summary['planned'] ?? 0);
                $netIssued = max(
                    0.0,
                    (float) ($summary['issued'] ?? 0) - (float) ($summary['returned'] ?? 0),
                );
                $remainingPlanned = max(0.0, $planned - $netIssued);
                $available = (float) $lockedBahans->get($bahanId)?->getAttribute('stok');

                if ($qty - $available > self::STOCK_EPSILON) {
                    $nama = (string) $lockedBahans->get($bahanId)?->getAttribute('nama_bahan');

                    throw new \RuntimeException(
                        "Stok {$nama} tidak mencukupi untuk pengeluaran massal. "
                        ."Tersedia: {$available}, diminta: {$qty}."
                    );
                }

                // Saran default: min(sisa rencana, stok). User boleh isi di bawah sisa rencana,
                // tetapi tidak boleh melebihi sisa rencana pada jalur bulk issue (bukan additional).
                if ($planned > self::STOCK_EPSILON && $qty - $remainingPlanned > self::STOCK_EPSILON) {
                    $nama = (string) $lockedBahans->get($bahanId)?->getAttribute('nama_bahan');

                    throw new \RuntimeException(
                        "Jumlah pengeluaran {$nama} melebihi sisa rencana. "
                        ."Maksimum: {$remainingPlanned}. Gunakan form manual untuk bahan tambahan."
                    );
                }

                $keterangan = filled($data['keterangan'] ?? null)
                    ? (string) $data['keterangan']
                    : 'Pengeluaran bahan massal untuk produksi #'.$lockedProduksi->id;

                $movements[] = $this->recordMovement($lockedProduksi, [
                    'bahan_baku_id' => $bahanId,
                    'movement_type' => 'issued',
                    'qty' => $qty,
                    'tanggal' => $data['tanggal'],
                    'keterangan' => $keterangan,
                    'idempotency_key' => $idempotencyKey,
                ], $userId);
            }

            return $movements;
        }, attempts: 3);
    }

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

            // Batas qty mengikat ke materialSummary (sumber sisa rencana = field shortage).
            // issued ≠ additional: kelebihan di luar rencana wajib dicatat sebagai additional.
            if (in_array($movementType, ['issued', 'additional', 'consumed', 'returned'], true)) {
                $summaryRow = collect($this->materialSummary($lockedProduksi))
                    ->firstWhere('id', $bahanBaku->id);

                $available = (float) ($summaryRow['available'] ?? (float) $bahanBaku->getAttribute('stok'));
                $remainingPlanned = (float) ($summaryRow['shortage'] ?? 0.0);
                $returnable = (float) ($summaryRow['returnable']
                    ?? $this->returnableQuantity($lockedProduksi->id, $bahanBaku->id));

                if ($movementType === 'issued') {
                    if ($remainingPlanned <= self::STOCK_EPSILON) {
                        throw new \RuntimeException(
                            'Kebutuhan bahan berdasarkan rencana sudah terpenuhi. '
                            .'Gunakan Bahan Tambahan Dikeluarkan apabila benar-benar membutuhkan bahan melebihi rencana.'
                        );
                    }

                    $maxIssued = min($remainingPlanned, max(0.0, $available));

                    if ($qty - $maxIssued > self::STOCK_EPSILON) {
                        throw new \RuntimeException(
                            'Jumlah Bahan Dikeluarkan melebihi sisa kebutuhan rencana atau stok gudang. '
                            ."Maksimum: {$maxIssued} (sisa rencana {$remainingPlanned}, stok gudang {$available}). "
                            .'Gunakan Bahan Tambahan Dikeluarkan untuk kelebihan di luar rencana.'
                        );
                    }
                }

                if ($movementType === 'additional' && $qty - max(0.0, $available) > self::STOCK_EPSILON) {
                    throw new \RuntimeException(
                        "Stok {$bahanBaku->nama_bahan} tidak mencukupi. "
                        ."Tersedia: {$available}, diminta: {$qty}."
                    );
                }

                if (in_array($movementType, ['consumed', 'returned'], true)
                    && $qty - $returnable > self::STOCK_EPSILON
                ) {
                    $label = $movementType === 'consumed'
                        ? 'Bahan Terpakai'
                        : 'Bahan Dikembalikan';

                    throw new \RuntimeException(
                        "Jumlah {$label} melebihi bahan yang masih dapat diproses. "
                        ."Maksimum: {$returnable}."
                    );
                }
            }

            try {
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
            } catch (UniqueConstraintViolationException $e) {
                // Race concurrent dengan kunci yang sama: anggap replay aman bila payload cocok.
                $raced = ProduksiPemakaianBahan::query()
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();

                if ($raced === null) {
                    throw $e;
                }

                $matchesOriginal = (int) $raced->produksi_id === (int) $produksi->id
                    && (int) $raced->bahan_baku_id === (int) $data['bahan_baku_id']
                    && $raced->movement_type === $data['movement_type']
                    && abs((float) $raced->qty - (float) $data['qty']) <= self::STOCK_EPSILON;

                if (! $matchesOriginal) {
                    throw new \RuntimeException(
                        'Kunci idempotensi sudah digunakan untuk pergerakan yang berbeda.'
                    );
                }

                return $raced->load(['bahanBaku', 'createdBy', 'stokHistory']);
            }

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
                'keterangan' => 'Pengembalian otomatis bahan yang telah dikeluarkan tetapi belum digunakan saat produksi dibatalkan.',
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

    /**
     * Alasan terkait bahan yang menghalangi penyelesaian produksi.
     * Semua item dikumpulkan agar checklist menampilkan seluruh bahan bermasalah.
     *
     * Catatan: sisa rencana (shortage) memblokir selesai, tetapi deviasi konsumsi
     * aktual terhadap BOM di luar rencana TIDAK diblokir di sini (toleransi belum
     * ditetapkan — lihat final-interview-unresolved-decisions).
     *
     * @return list<string>
     */
    public function completionMaterialBlockers(Produksi $produksi): array
    {
        $blockers = [];

        foreach ($this->materialSummary($produksi) as $material) {
            $nama = $material['nama_bahan'];
            $satuan = $material['satuan'] !== '' ? ' '.$material['satuan'] : '';

            if ($material['consumed'] - ($material['issued'] - $material['returned']) > self::STOCK_EPSILON) {
                $blockers[] = "Pergerakan bahan {$nama} tidak konsisten: konsumsi melebihi bahan yang dikeluarkan (bersih).";
            }

            if ($material['returnable'] > self::STOCK_EPSILON) {
                $qty = $this->formatQty($material['returnable']);
                $blockers[] = "{$nama} masih memiliki {$qty}{$satuan} bahan yang dikeluarkan tetapi belum digunakan atau dikembalikan.";
            }

            if ($material['shortage'] > self::STOCK_EPSILON) {
                $qty = $this->formatQty($material['shortage']);
                $blockers[] = "Rencana bahan {$nama} belum terpenuhi (sisa {$qty}{$satuan}).";
            }
        }

        return $blockers;
    }

    public function assertConsistent(Produksi $produksi): void
    {
        $blockers = $this->completionMaterialBlockers($produksi);

        if ($blockers !== []) {
            throw new \RuntimeException($blockers[0]);
        }
    }

    private function formatQty(float $qty): string
    {
        $formatted = rtrim(rtrim(number_format($qty, 5, '.', ''), '0'), '.');

        return $formatted === '' ? '0' : $formatted;
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
