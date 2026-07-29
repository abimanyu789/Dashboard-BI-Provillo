<?php

namespace App\Services;

use App\Models\BahanBaku;
use App\Models\DetailProduksi;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\Produksi;
use App\Models\ProduksiItem;
use App\Models\ProduksiKaryawan;
use App\Models\StokProdukCacat;
use App\Services\Inventory\StockProdukService;
use Illuminate\Support\Facades\DB;

class ProduksiService
{
    public function __construct(
        private readonly StockProdukService $stockProdukService,
        private readonly ProduksiMaterialService $materialService,
        private readonly PesananService $pesananService,
    ) {}

    // ─── Create ──────────────────────────────────────────────────────────────

    /**
     * Buat produksi baru.
     *
     * Mendukung dua jenis:
     *   - pesanan: target berasal dari detail_pesanan
     *   - restok:  target diinput manual oleh admin via $data['items']
     *
     * Business rules:
     * - BR-01: Status awal = draft
     * - BR-15: Produksi pesanan — satu pesanan hanya boleh satu produksi aktif
     *
     * @param  array  $data  Validated data dari ProduksiRequest
     *
     * @throws \RuntimeException
     */
    public function create(array $data, int $createdBy): Produksi
    {
        $jenis = $data['jenis_produksi'];

        if ($jenis === 'pesanan') {
            return $this->createDariPesanan($data, $createdBy);
        }

        return $this->createRestok($data, $createdBy);
    }

    private function createDariPesanan(array $data, int $createdBy): Produksi
    {
        $pesanan = Pesanan::with('detailPesanan')->findOrFail($data['pesanan_id']);

        // BR-15: Cek produksi aktif untuk pesanan ini
        if ($pesanan->produksi()->whereIn('status', ['draft', 'proses'])->exists()) {
            throw new \RuntimeException(
                "Pesanan {$pesanan->nomor_pesanan} sudah memiliki produksi aktif."
            );
        }

        return DB::transaction(function () use ($pesanan, $data, $createdBy) {
            $qtyTarget = $pesanan->detailPesanan->sum('qty');

            $produksi = Produksi::create([
                'pesanan_id' => $pesanan->id,
                'created_by' => $createdBy,
                'jenis_produksi' => 'pesanan',
                'deadline' => $data['deadline'] ?? null,
                'qty_target' => $qtyTarget,
                'qty_selesai' => 0,
                'status' => 'draft',
                'status_qc' => 'belum_dicek',
                'catatan' => $data['catatan'] ?? null,
            ]);

            // Populate produksi_item dari detail_pesanan
            foreach ($pesanan->detailPesanan as $detail) {
                ProduksiItem::create([
                    'produksi_id' => $produksi->id,
                    'produk_id' => $detail->produk_id,
                    'qty_target' => $detail->qty,
                ]);
            }

            // Simpan daftar karyawan
            $this->syncKaryawan($produksi, $data['karyawan_ids'] ?? []);

            // BR-PSN-13: aktivitas produksi untuk pesanan menaikkan pending → proses
            $this->pesananService->promoteToProsesIfPending($pesanan);

            return $produksi->fresh();
        });
    }

    private function createRestok(array $data, int $createdBy): Produksi
    {
        $items = $data['items'] ?? [];
        $qtyTarget = collect($items)->sum('qty_target');

        return DB::transaction(function () use ($data, $createdBy, $items, $qtyTarget) {
            $produksi = Produksi::create([
                'pesanan_id' => null,
                'created_by' => $createdBy,
                'jenis_produksi' => 'restok',
                'deadline' => $data['deadline'] ?? null,
                'qty_target' => $qtyTarget,
                'qty_selesai' => 0,
                'status' => 'draft',
                'status_qc' => 'belum_dicek',
                'catatan' => $data['catatan'] ?? null,
            ]);

            // Populate produksi_item dari input admin
            foreach ($items as $item) {
                ProduksiItem::create([
                    'produksi_id' => $produksi->id,
                    'produk_id' => $item['produk_id'],
                    'qty_target' => $item['qty_target'],
                ]);
            }

            // Simpan daftar karyawan
            $this->syncKaryawan($produksi, $data['karyawan_ids'] ?? []);

            return $produksi;
        });
    }

    private function syncKaryawan(Produksi $produksi, array $karyawanIds): void
    {
        foreach ($karyawanIds as $karyawanId) {
            ProduksiKaryawan::firstOrCreate([
                'produksi_id' => $produksi->id,
                'karyawan_id' => $karyawanId,
            ]);
        }
    }

    // ─── Mulai & Batalkan ────────────────────────────────────────────────────

    /**
     * Mulai produksi tanpa memotong seluruh kebutuhan BOM.
     * Kebutuhan BOM disimpan sebagai planned movement; bahan dikeluarkan terpisah.
     */
    public function mulaiProduksi(Produksi $produksi, int $userId): Produksi
    {
        if (! $produksi->isDraft()) {
            throw new \RuntimeException(
                "Produksi hanya bisa dimulai dari status draft. Status saat ini: {$produksi->status}."
            );
        }

        $produksi->loadMissing([
            'produksiItems.produk.bomCategorie.bomDetails.bahanBaku',
        ]);

        if (! $this->hasValidBom($produksi)) {
            throw new \RuntimeException(
                'Produksi tidak dapat dimulai karena setiap produk wajib memiliki BOM yang valid dan berisi bahan baku.'
            );
        }

        return DB::transaction(function () use ($produksi, $userId) {
            $lockedProduksi = Produksi::query()->lockForUpdate()->findOrFail($produksi->id);

            if (! $lockedProduksi->isDraft()) {
                throw new \RuntimeException('Produksi sudah dimulai atau tidak lagi berstatus Draft.');
            }

            $requirements = $this->hitungKebutuhanBahan($produksi);
            $this->materialService->recordPlannedRequirements($lockedProduksi, $requirements, $userId);
            $lockedProduksi->update(['status' => 'proses']);

            return $lockedProduksi->fresh();
        }, attempts: 3);
    }

    /**
     * Batalkan produksi dan kembalikan hanya bahan terbit yang belum digunakan.
     */
    public function batalkanProduksi(Produksi $produksi, int $userId): Produksi
    {
        if ($produksi->isSelesai() || $produksi->isDibatalkan()) {
            throw new \RuntimeException(
                "Produksi dengan status '{$produksi->status}' tidak dapat dibatalkan."
            );
        }

        return DB::transaction(function () use ($produksi, $userId) {
            $lockedProduksi = Produksi::query()->lockForUpdate()->findOrFail($produksi->id);

            if ($lockedProduksi->isProses()) {
                $this->materialService->returnUnusedOnCancellation($lockedProduksi, $userId);
            }

            $lockedProduksi->update(['status' => 'dibatalkan']);

            return $lockedProduksi->fresh();
        }, attempts: 3);
    }

    // ─── Progress & Selesai ──────────────────────────────────────────────────

    /**
     * @param  array{
     *     produk_id: int,
     *     karyawan_id: int,
     *     qty: int,
     *     qc_status: 'lolos'|'tidak_lolos',
     *     alasan_qc?: string|null,
     *     disposisi_qc?: 'rework'|'jual_cacat'|'dimusnahkan'|null,
     *     rework_parent_id?: int|null,
     *     catatan?: string|null,
     *     idempotency_key: string
     * }  $data
     */
    public function inputProgress(Produksi $produksi, array $data, int $userId): DetailProduksi
    {
        return DB::transaction(function () use ($produksi, $data, $userId) {
            $existing = DetailProduksi::query()
                ->where('idempotency_key', $data['idempotency_key'])
                ->first();

            if ($existing !== null) {
                $matchesOriginal = (int) $existing->produksi_id === (int) $produksi->id
                    && (int) $existing->produk_id === (int) $data['produk_id']
                    && (int) ($existing->karyawan_id ?? 0) === (int) $data['karyawan_id']
                    && (int) $existing->qty_selesai === (int) $data['qty']
                    && $existing->qc_status === $data['qc_status'];

                if (! $matchesOriginal) {
                    throw new \RuntimeException('Kunci idempotensi sudah digunakan untuk progress yang berbeda.');
                }

                return $existing;
            }

            $lockedProduksi = Produksi::query()->lockForUpdate()->findOrFail($produksi->id);

            if (! $lockedProduksi->isProses()) {
                throw new \RuntimeException('Progress hanya dapat diinput saat produksi berstatus Proses.');
            }

            $produksiItem = ProduksiItem::query()
                ->where('produksi_id', $lockedProduksi->id)
                ->where('produk_id', $data['produk_id'])
                ->lockForUpdate()
                ->first();

            if ($produksiItem === null) {
                throw new \RuntimeException('Produk yang dipilih tidak termasuk dalam produksi ini.');
            }

            $workerAssigned = ProduksiKaryawan::query()
                ->where('produksi_id', $lockedProduksi->id)
                ->where('karyawan_id', $data['karyawan_id'])
                ->exists();

            if (! $workerAssigned) {
                throw new \RuntimeException('Karyawan yang dipilih tidak termasuk dalam tim produksi ini.');
            }

            if (
                $data['qc_status'] === 'tidak_lolos'
                && (blank($data['alasan_qc'] ?? null) || blank($data['disposisi_qc'] ?? null))
            ) {
                throw new \RuntimeException('Progress tidak lolos QC wajib memiliki alasan dan disposisi.');
            }

            $reworkParent = $this->validateReworkParent($lockedProduksi, $data);

            if ($data['qc_status'] === 'lolos' && $reworkParent === null) {
                $qtyLolos = (int) DetailProduksi::query()
                    ->where('produksi_id', $lockedProduksi->id)
                    ->where('produk_id', $data['produk_id'])
                    ->where('qc_status', 'lolos')
                    ->sum('qty_selesai');

                if ($qtyLolos + $data['qty'] > $produksiItem->qty_target) {
                    throw new \RuntimeException(
                        "Jumlah progress ({$data['qty']}) akan melebihi target produk ini. "
                        .'Sisa target: '.($produksiItem->qty_target - $qtyLolos).' pcs.'
                    );
                }
            }

            $detail = DetailProduksi::query()->create([
                'produksi_id' => $lockedProduksi->id,
                'produk_id' => $data['produk_id'],
                'karyawan_id' => $data['karyawan_id'],
                'qty_selesai' => $data['qty'],
                'qc_status' => $data['qc_status'],
                'alasan_qc' => $data['qc_status'] === 'tidak_lolos' ? ($data['alasan_qc'] ?? null) : null,
                'disposisi_qc' => $data['qc_status'] === 'tidak_lolos' ? ($data['disposisi_qc'] ?? null) : null,
                'rework_parent_id' => $reworkParent?->id,
                'catatan' => $data['catatan'] ?? null,
                'inspected_by' => $userId,
                'inspected_at' => now(),
                'idempotency_key' => $data['idempotency_key'],
            ]);

            $produk = Produk::query()->lockForUpdate()->findOrFail($data['produk_id']);
            $keterangan = $this->labelProduksi($lockedProduksi);

            if ($detail->qc_status === 'lolos') {
                $this->stockProdukService->addStock(
                    produk: $produk,
                    qty: (int) $detail->qty_selesai,
                    jenis: 'produksi',
                    keterangan: "Progress Produksi {$keterangan} — {$produk->nama_produk}",
                    createdBy: $userId,
                    detailProduksiId: $detail->id,
                );
            } elseif (in_array($detail->disposisi_qc, ['jual_cacat', 'dimusnahkan'], true)) {
                StokProdukCacat::query()->firstOrCreate(
                    ['detail_produksi_id' => $detail->id],
                    [
                        'produksi_id' => $detail->produksi_id,
                        'produk_id' => $detail->produk_id,
                        'disposisi' => $detail->disposisi_qc,
                        'qty' => $detail->qty_selesai,
                        'alasan_qc' => $detail->alasan_qc,
                        'catatan' => $detail->catatan,
                        'created_by' => $userId,
                    ],
                );
            }

            $this->recalculateProgress($lockedProduksi);

            return $detail->load([
                'produk',
                'karyawan',
                'inspector',
                'reworkParent',
                'stokHistory',
                'defectLedger',
            ]);
        }, attempts: 3);
    }

    /**
     * @param  array{alasan_qc: string, disposisi_qc: string, catatan?: string|null}  $data
     */
    public function updateQcDisposition(
        Produksi $produksi,
        DetailProduksi $detail,
        array $data,
        int $userId,
    ): DetailProduksi {
        return DB::transaction(function () use ($produksi, $detail, $data, $userId) {
            $lockedDetail = DetailProduksi::query()->lockForUpdate()->findOrFail($detail->id);

            if ((int) $lockedDetail->produksi_id !== (int) $produksi->id) {
                throw new \RuntimeException('Progress QC tidak termasuk dalam produksi ini.');
            }

            if ($lockedDetail->qc_status !== 'tidak_lolos') {
                throw new \RuntimeException('Disposisi hanya dapat diperbarui untuk progress yang tidak lolos QC.');
            }

            if ($lockedDetail->disposisi_qc !== null && $lockedDetail->disposisi_qc !== $data['disposisi_qc']) {
                throw new \RuntimeException('Disposisi QC yang sudah diproses tidak dapat diganti.');
            }

            $lockedDetail->update([
                'alasan_qc' => $data['alasan_qc'],
                'disposisi_qc' => $data['disposisi_qc'],
                'catatan' => $data['catatan'] ?? $lockedDetail->catatan,
                'inspected_by' => $lockedDetail->inspected_by ?? $userId,
                'inspected_at' => $lockedDetail->inspected_at ?? now(),
            ]);

            if (in_array($lockedDetail->disposisi_qc, ['jual_cacat', 'dimusnahkan'], true)) {
                StokProdukCacat::query()->firstOrCreate(
                    ['detail_produksi_id' => $lockedDetail->id],
                    [
                        'produksi_id' => $lockedDetail->produksi_id,
                        'produk_id' => $lockedDetail->produk_id,
                        'disposisi' => $lockedDetail->disposisi_qc,
                        'qty' => $lockedDetail->qty_selesai,
                        'alasan_qc' => $lockedDetail->alasan_qc,
                        'catatan' => $lockedDetail->catatan,
                        'created_by' => $userId,
                    ],
                );
            }

            $this->recalculateProgress($produksi);

            return $lockedDetail->fresh([
                'produk',
                'karyawan',
                'inspector',
                'reworkResults',
                'defectLedger',
            ]);
        }, attempts: 3);
    }

    /**
     * Selesaikan produksi. Hanya ubah status → selesai.
     * Stok sudah bertambah bertahap saat setiap progress lolos QC.
     *
     * BR-17: qty lolos == qty_target sebelum bisa selesai.
     *
     * Semua blocker dikumpulkan dulu agar pesan error menampilkan checklist
     * lengkap (bukan hanya alasan pertama), mengurangi bolak-balik perbaiki-satu-per-satu.
     *
     * @throws \RuntimeException
     */
    public function selesaikanProduksi(Produksi $produksi): Produksi
    {
        if (! $produksi->isProses()) {
            throw new \RuntimeException('Produksi hanya dapat diselesaikan dari status Proses.');
        }

        return DB::transaction(function () use ($produksi) {
            $lockedProduksi = Produksi::query()->lockForUpdate()->findOrFail($produksi->id);
            $this->recalculateProgress($lockedProduksi);
            $lockedProduksi->refresh();

            $blockers = $this->completionBlockers($lockedProduksi);

            if ($blockers !== []) {
                throw new \RuntimeException(
                    "Produksi belum dapat diselesaikan. Selesaikan dulu:\n- "
                    .implode("\n- ", $blockers)
                );
            }

            $lockedProduksi->update(['status' => 'selesai']);

            return $lockedProduksi->fresh();
        }, attempts: 3);
    }

    /**
     * Daftar alasan (Bahasa Indonesia) yang masih menghalangi penyelesaian produksi.
     *
     * @return list<string>
     */
    public function completionBlockers(Produksi $produksi): array
    {
        $blockers = [];

        if ($produksi->qty_selesai < $produksi->qty_target) {
            $blockers[] = 'Jumlah lolos QC belum mencapai target ('
                ."{$produksi->qty_selesai} / {$produksi->qty_target} pcs).";
        }

        $failedWithoutDisposition = DetailProduksi::query()
            ->where('produksi_id', $produksi->id)
            ->where('qc_status', 'tidak_lolos')
            ->whereNull('disposisi_qc')
            ->exists();

        if ($failedWithoutDisposition) {
            $blockers[] = 'Masih ada hasil Tidak Lolos Pemeriksaan tanpa disposisi.';
        }

        if ($this->activeReworkQuantity($produksi) > 0) {
            $blockers[] = 'Masih ada antrean Perbaikan Ulang (rework) aktif.';
        }

        foreach ($this->materialService->completionMaterialBlockers($produksi) as $materialBlocker) {
            $blockers[] = $materialBlocker;
        }

        $negativeStockExists = BahanBaku::query()->where('stok', '<', 0)->exists()
            || Produk::query()->where('stok', '<', 0)->exists();

        if ($negativeStockExists) {
            $blockers[] = 'Ditemukan stok negatif (bahan baku atau produk jadi). Perbaiki stok terlebih dahulu.';
        }

        return $blockers;
    }

    // ─── Kalkulasi ───────────────────────────────────────────────────────────

    /**
     * Hitung kebutuhan bahan baku dari BOM semua produk di produksi_item.
     * Berlaku untuk Produksi Pesanan maupun Produksi Restok.
     *
     * BR-03: Kebutuhan dihitung dari BOM seluruh produk pada produksi_item.
     *
     * @return list<array{
     *     id: int,
     *     kode_bahan: string,
     *     nama_bahan: string,
     *     satuan: string,
     *     kebutuhan: float,
     *     stok_tersedia: float,
     *     cukup: bool
     * }>
     */
    public function hitungKebutuhanBahan(Produksi $produksi): array
    {
        $produksi->loadMissing([
            'produksiItems.produk.bomCategorie.bomDetails.bahanBaku',
        ]);

        $kebutuhan = [];

        foreach ($produksi->produksiItems as $item) {
            $produk = $item->produk;

            if (! $produk || ! $produk->bomCategorie) {
                continue;
            }

            $qtyProduk = $item->qty_target;

            foreach ($produk->bomCategorie->bomDetails as $bomDetail) {
                $bahanBaku = $bomDetail->bahanBaku;
                if (! $bahanBaku) {
                    continue;
                }

                $id = $bahanBaku->id;
                $kebutuhanQty = (float) $bomDetail->qty_per_pair * $qtyProduk;

                if (isset($kebutuhan[$id])) {
                    $kebutuhan[$id]['kebutuhan'] += $kebutuhanQty;
                } else {
                    $kebutuhan[$id] = [
                        'id' => $id,
                        'kode_bahan' => $bahanBaku->kode_bahan,
                        'nama_bahan' => $bahanBaku->nama_bahan,
                        'satuan' => $bahanBaku->satuan ?? '',
                        'kebutuhan' => $kebutuhanQty,
                        'stok_tersedia' => (float) $bahanBaku->stok,
                        'cukup' => true,
                    ];
                }
            }
        }

        foreach ($kebutuhan as $id => $item) {
            $kebutuhan[$id]['cukup'] = $item['stok_tersedia'] >= $item['kebutuhan'];
        }

        return array_values($kebutuhan);
    }

    public function cekKecukupanStok(Produksi $produksi): bool
    {
        $kebutuhan = $this->hitungKebutuhanBahan($produksi);

        // Header status must match baris Kebutuhan Bahan Baku.
        // Jangan campur dengan hasValidBom() — BOM invalid ditangani terpisah.
        if ($kebutuhan === []) {
            return false;
        }

        return collect($kebutuhan)->every(
            fn (array $bahan): bool => (bool) ($bahan['cukup'] ?? false),
        );
    }

    public function hasValidBom(Produksi $produksi): bool
    {
        $produksi->loadMissing([
            'produksiItems.produk.bomCategorie.bomDetails.bahanBaku',
        ]);

        if ($produksi->produksiItems->isEmpty()) {
            return false;
        }

        foreach ($produksi->produksiItems as $item) {
            if (
                ! $item->produk
                || ! $item->produk->bom_category_id
                || ! $item->produk->bomCategorie
                || $item->produk->bomCategorie->bomDetails->isEmpty()
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Hitung progress per produk dari histori detail_produksi.
     * Return: array indexed by produk_id → ['lolos' => int, 'tidak_lolos' => int, 'target' => int]
     */
    public function hitungProgressPerProduk(Produksi $produksi): array
    {
        $produksi->loadMissing('produksiItems');

        $result = [];

        foreach ($produksi->produksiItems as $item) {
            $lolos = DetailProduksi::where('produksi_id', $produksi->id)
                ->where('produk_id', $item->produk_id)
                ->where('qc_status', 'lolos')
                ->sum('qty_selesai');

            $tidakLolos = DetailProduksi::where('produksi_id', $produksi->id)
                ->where('produk_id', $item->produk_id)
                ->where('qc_status', 'tidak_lolos')
                ->sum('qty_selesai');

            $result[$item->produk_id] = [
                'lolos' => (int) $lolos,
                'tidak_lolos' => (int) $tidakLolos,
                'target' => $item->qty_target,
                'selesai' => $lolos >= $item->qty_target,
            ];
        }

        return $result;
    }

    // ─── Summary Cards ───────────────────────────────────────────────────────

    /**
     * Hitung summary cards untuk halaman index Produksi.
     * Data dihitung dari histori detail_produksi (lolos QC saja untuk qty).
     */
    public function hitungSummary(): array
    {
        $today = now()->toDateString();

        $batchHariIni = Produksi::whereDate('created_at', $today)->count();
        $qtySelesaiHariIni = DetailProduksi::whereDate('created_at', $today)
            ->where('qc_status', 'lolos')
            ->sum('qty_selesai');

        // Karyawan paling produktif: dari produksi_karyawan + detail_produksi lolos (30 hari)
        // Karena detail_produksi tidak punya karyawan_id lagi, kita hitung dari produksi_karyawan
        // yang terlibat pada produksi yang punya progress lolos QC
        $karyawanData = $this->hitungKaryawanProduktif();

        $qtyTargetAktif = Produksi::where('status', 'proses')->sum('qty_target');
        $qtySelesaiAktif = Produksi::where('status', 'proses')->sum('qty_selesai');
        $efisiensi = $qtyTargetAktif > 0
            ? round(($qtySelesaiAktif / $qtyTargetAktif) * 100)
            : 0;

        return [
            'batch_hari_ini' => $batchHariIni,
            'qty_selesai_hari_ini' => (int) $qtySelesaiHariIni,
            'karyawan_produktif' => $karyawanData,
            'efisiensi' => [
                'qty_selesai' => (int) $qtySelesaiAktif,
                'qty_target' => (int) $qtyTargetAktif,
                'persentase' => $efisiensi,
            ],
        ];
    }

    /**
     * @return array{nama: string, total_qty: int, kontribusi: int|float}|null
     */
    private function hitungKaryawanProduktif(): ?array
    {
        $top = DB::table('detail_produksi')
            ->join('karyawan', 'detail_produksi.karyawan_id', '=', 'karyawan.id')
            ->whereNotNull('detail_produksi.karyawan_id')
            ->where('detail_produksi.qc_status', 'lolos')
            ->where('detail_produksi.created_at', '>=', now()->subDays(30))
            ->selectRaw(
                'karyawan.id, karyawan.nama_karyawan, SUM(detail_produksi.qty_selesai) as total_qty'
            )
            ->groupBy('karyawan.id', 'karyawan.nama_karyawan')
            ->orderByDesc('total_qty')
            ->first();

        if ($top === null) {
            return null;
        }

        $total = (int) DetailProduksi::query()
            ->whereNotNull('karyawan_id')
            ->where('qc_status', 'lolos')
            ->where('created_at', '>=', now()->subDays(30))
            ->sum('qty_selesai');

        return [
            'nama' => $top->nama_karyawan,
            'total_qty' => (int) $top->total_qty,
            'kontribusi' => $total > 0 ? round(((int) $top->total_qty / $total) * 100) : 0,
        ];
    }

    /**
     * @return list<array{karyawan_id: int, nama: string, qty_lolos: int}>
     */
    public function wageBasis(Produksi $produksi): array
    {
        return array_values(DB::table('detail_produksi')
            ->join('karyawan', 'detail_produksi.karyawan_id', '=', 'karyawan.id')
            ->where('detail_produksi.produksi_id', $produksi->id)
            ->whereNotNull('detail_produksi.karyawan_id')
            ->where('detail_produksi.qc_status', 'lolos')
            ->selectRaw(
                'karyawan.id as karyawan_id, karyawan.nama_karyawan as nama, '
                .'SUM(detail_produksi.qty_selesai) as qty_lolos'
            )
            ->groupBy('karyawan.id', 'karyawan.nama_karyawan')
            ->orderByDesc('qty_lolos')
            ->get()
            ->map(fn (object $row): array => [
                'karyawan_id' => (int) $row->karyawan_id,
                'nama' => (string) $row->nama,
                'qty_lolos' => (int) $row->qty_lolos,
            ])
            ->all());
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    /**
     * @param  array{
     *     produk_id: int,
     *     karyawan_id: int,
     *     qty: int,
     *     qc_status: 'lolos'|'tidak_lolos',
     *     alasan_qc?: string|null,
     *     disposisi_qc?: 'rework'|'jual_cacat'|'dimusnahkan'|null,
     *     rework_parent_id?: int|null,
     *     catatan?: string|null,
     *     idempotency_key: string
     * }  $data
     */
    private function validateReworkParent(Produksi $produksi, array $data): ?DetailProduksi
    {
        $parentId = $data['rework_parent_id'] ?? null;

        if ($parentId === null) {
            return null;
        }

        $parent = DetailProduksi::query()->lockForUpdate()->find($parentId);

        if (! $parent instanceof DetailProduksi) {
            throw new \RuntimeException('Data asal rework tidak ditemukan.');
        }

        if (
            (int) $parent->produksi_id !== (int) $produksi->id
            || (int) $parent->produk_id !== (int) $data['produk_id']
            || $parent->qc_status !== 'tidak_lolos'
            || $parent->disposisi_qc !== 'rework'
        ) {
            throw new \RuntimeException('Data asal rework tidak valid untuk produksi dan produk yang dipilih.');
        }

        $processed = (int) DetailProduksi::query()
            ->where('rework_parent_id', $parent->id)
            ->sum('qty_selesai');

        if ($processed + (int) $data['qty'] > (int) $parent->qty_selesai) {
            throw new \RuntimeException(
                'Jumlah hasil rework melebihi sisa rework aktif. Sisa: '
                .max(0, (int) $parent->qty_selesai - $processed).' pcs.'
            );
        }

        return $parent;
    }

    private function activeReworkQuantity(Produksi $produksi): int
    {
        $parents = DetailProduksi::query()
            ->where('produksi_id', $produksi->id)
            ->where('qc_status', 'tidak_lolos')
            ->where('disposisi_qc', 'rework')
            ->withSum('reworkResults as processed_rework_qty', 'qty_selesai')
            ->get();

        return $parents->sum(
            fn (DetailProduksi $detail): int => max(
                0,
                (int) $detail->qty_selesai - (int) ($detail->processed_rework_qty ?? 0),
            )
        );
    }

    private function recalculateProgress(Produksi $produksi): void
    {
        $qtySelesai = (int) DetailProduksi::query()
            ->where('produksi_id', $produksi->id)
            ->where('qc_status', 'lolos')
            ->sum('qty_selesai');

        $adaTidakLolos = DetailProduksi::query()
            ->where('produksi_id', $produksi->id)
            ->where('qc_status', 'tidak_lolos')
            ->exists();

        $produksi->update([
            'qty_selesai' => $qtySelesai,
            'status_qc' => $adaTidakLolos ? 'tidak_lolos' : ($qtySelesai > 0 ? 'lolos' : 'belum_dicek'),
        ]);
    }

    private function labelProduksi(Produksi $produksi): string
    {
        if ($produksi->isPesanan() && $produksi->pesanan) {
            return $produksi->pesanan->nomor_pesanan;
        }

        return "RESTOK-{$produksi->id}";
    }
}
