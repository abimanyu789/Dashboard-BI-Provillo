<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkMaterialIssueRequest;
use App\Http\Requests\InputProgressRequest;
use App\Http\Requests\MaterialMovementRequest;
use App\Http\Requests\ProduksiRequest;
use App\Http\Requests\UpdateQcDispositionRequest;
use App\Models\DetailProduksi;
use App\Models\Karyawan;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\Produksi;
use App\Services\ProduksiMaterialService;
use App\Services\ProduksiService;
use App\Support\DomainLabels;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProduksiController extends Controller
{
    public function __construct(
        private readonly ProduksiService $service,
        private readonly ProduksiMaterialService $materialService,
    ) {}

    /**
     * Daftar semua produksi.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        $allowedSorts = ['created_at', 'deadline', 'qty_target', 'qty_selesai', 'status'];
        if (! in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $produksis = Produksi::with('pesanan.customer')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('pesanan', function ($q2) use ($search) {
                        $q2->where('nomor_pesanan', 'like', "%{$search}%")
                            ->orWhereHas('customer', function ($q3) use ($search) {
                                $q3->where('nama_customer', 'like', "%{$search}%");
                            });
                    });
                });
            })
            ->when($status && in_array($status, ['draft', 'proses', 'selesai', 'dibatalkan']), function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('produksi/index', [
            'produksis' => $produksis,
            'summary' => $this->service->hitungSummary(),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Form create produksi — kirim data sesuai jenis yang dipilih.
     */
    public function create(Request $request)
    {
        // Pesanan valid: status pending/proses, belum punya produksi aktif
        $pesananValid = Pesanan::with('customer')
            ->whereIn('status', ['pending', 'proses'])
            ->whereDoesntHave('produksi', function ($q) {
                $q->whereIn('status', ['draft', 'proses']);
            })
            ->orderByDesc('created_at')
            ->get(['id', 'nomor_pesanan', 'status', 'customer_id', 'tanggal', 'total']);

        // Semua produk yang punya BOM (untuk Produksi Restok)
        $produkList = Produk::whereNotNull('bom_category_id')
            ->orderBy('nama_produk')
            ->get(['id', 'kode_produk', 'nama_produk', 'stok']);

        // Karyawan aktif untuk dipilih sebagai tim
        $karyawanList = Karyawan::where('status', 'aktif')
            ->orderBy('nama_karyawan')
            ->get(['id', 'nama_karyawan', 'jabatan']);

        // Jika ada pre-select pesanan_id, hitung kebutuhan bahan
        $selectedPesananId = $request->integer('pesanan_id') ?: null;
        $kebutuhanBahan = [];
        $selectedPesanan = null;

        if ($selectedPesananId) {
            // Buat Produksi dummy sementara untuk hitungKebutuhanBahan
            $tempProduksi = new Produksi(['pesanan_id' => $selectedPesananId]);
            $selectedPesanan = Pesanan::with([
                'customer',
                'detailPesanan.produk.bomCategorie.bomDetails.bahanBaku',
            ])->find($selectedPesananId);

            if ($selectedPesanan) {
                // Load produksiItems dari detail_pesanan sementara
                $tempItems = $selectedPesanan->detailPesanan->map(fn ($d) => (object) [
                    'produk_id' => $d->produk_id,
                    'qty_target' => $d->qty,
                    'produk' => $d->produk,
                ]);

                // Hitung kebutuhan manual (tanpa save ke DB)
                $kebutuhanBahan = $this->hitungKebutuhanBahanDariItems($tempItems);
            }
        }

        return Inertia::render('produksi/create', [
            'pesananValid' => $pesananValid,
            'produkList' => $produkList,
            'karyawanList' => $karyawanList,
            'selectedPesanan' => $selectedPesanan,
            'kebutuhanBahan' => $kebutuhanBahan,
        ]);
    }

    /**
     * Simpan produksi baru.
     */
    public function store(ProduksiRequest $request)
    {
        try {
            $produksi = $this->service->create(
                $request->validated(),
                auth()->id()
            );
        } catch (\RuntimeException $e) {
            return back()->withInput()->with('error', $e->getMessage());
        }

        $label = $produksi->jenis_produksi === 'pesanan'
            ? "pesanan {$produksi->pesanan?->nomor_pesanan}"
            : 'restok';

        return redirect()
            ->route('produksi.show', $produksi)
            ->with('success', "Produksi {$label} berhasil dibuat.");
    }

    /**
     * Detail produksi — kebutuhan bahan, progress per produk, karyawan terlibat.
     */
    public function show(Produksi $produksi)
    {
        $produksi->load([
            'pesanan.customer',
            'produksiItems.produk',
            'produksiKaryawans.karyawan',
            'createdBy',
            'detailProduksi' => fn ($query) => $query
                ->with([
                    'produk',
                    'karyawan',
                    'inspector',
                    'reworkResults.karyawan',
                    'defectLedger',
                ])
                ->orderBy('created_at')
                ->orderBy('id'),
            'materialMovements' => fn ($query) => $query
                ->with(['bahanBaku', 'createdBy', 'stokHistory'])
                ->orderBy('tanggal')
                ->orderBy('created_at')
                ->orderBy('id'),
            'defectLedgers',
        ]);

        $kebutuhanBahan = $this->service->hitungKebutuhanBahan($produksi);
        $stokCukup = $this->service->cekKecukupanStok($produksi);
        $progressPerProduk = $this->service->hitungProgressPerProduk($produksi);
        $materialSummary = $produksi->materialMovements->isNotEmpty()
            ? $this->materialService->materialSummary($produksi)
            : collect($kebutuhanBahan)->map(fn (array $material): array => [
                'id' => $material['id'],
                'kode_bahan' => $material['kode_bahan'],
                'nama_bahan' => $material['nama_bahan'],
                'satuan' => $material['satuan'],
                'planned' => (float) $material['kebutuhan'],
                'available' => (float) $material['stok_tersedia'],
                'issued' => 0.0,
                'consumed' => 0.0,
                'returned' => 0.0,
                'shortage' => (float) $material['kebutuhan'],
                'returnable' => 0.0,
                'status' => $material['cukup'] ? 'sufficient' : 'shortage',
            ])->values()->all();

        $failedProgress = $produksi->detailProduksi
            ->where('qc_status', 'tidak_lolos');
        $activeRework = $failedProgress
            ->where('disposisi_qc', 'rework')
            ->map(function (DetailProduksi $detail): array {
                $processed = (int) $detail->reworkResults->sum('qty_selesai');

                return [
                    'id' => $detail->id,
                    'produk_id' => $detail->produk_id,
                    'produk' => $detail->produk,
                    'karyawan' => $detail->karyawan,
                    'qty_gagal' => (int) $detail->qty_selesai,
                    'qty_diproses' => $processed,
                    'qty_aktif' => max(0, (int) $detail->qty_selesai - $processed),
                    'alasan_qc' => $detail->alasan_qc,
                    'created_at' => $detail->created_at,
                ];
            })
            ->filter(fn (array $item): bool => $item['qty_aktif'] > 0)
            ->values();

        $qcSummary = [
            'lolos' => (int) $produksi->detailProduksi->where('qc_status', 'lolos')->sum('qty_selesai'),
            'tidak_lolos' => (int) $failedProgress->sum('qty_selesai'),
            'jual_cacat' => (int) $produksi->defectLedgers->where('disposisi', 'jual_cacat')->sum('qty'),
            'dimusnahkan' => (int) $produksi->defectLedgers->where('disposisi', 'dimusnahkan')->sum('qty'),
            'rework_aktif' => (int) $activeRework->sum('qty_aktif'),
        ];

        // Daftar produk yang masih perlu progress (qty lolos < target)
        $produkBelumSelesai = $produksi->produksiItems
            ->filter(fn ($item) => ($progressPerProduk[$item->produk_id]['lolos'] ?? 0) < $item->qty_target)
            ->map(fn ($item) => [
                'id' => $item->produk->id,
                'kode_produk' => $item->produk->kode_produk,
                'nama_produk' => $item->produk->nama_produk,
                'qty_target' => $item->qty_target,
                'qty_lolos' => $progressPerProduk[$item->produk_id]['lolos'] ?? 0,
                'sisa' => $item->qty_target - ($progressPerProduk[$item->produk_id]['lolos'] ?? 0),
            ])
            ->values();

        // Blocker penyelesaian dari service yang sama dengan guard backend.
        // Draft/selesai/batal tidak perlu checklist aksi Selesai.
        $completionBlockers = $produksi->isProses()
            ? $this->service->completionBlockers($produksi)
            : [];

        return Inertia::render('produksi/show', [
            'produksi' => $produksi,
            'kebutuhanBahan' => $kebutuhanBahan,
            'stokCukup' => $stokCukup,
            'progressPerProduk' => $progressPerProduk,
            'produkBelumSelesai' => $produkBelumSelesai,
            'materialSummary' => $materialSummary,
            'completionBlockers' => $completionBlockers,
            // Hanya bahan pada rencana BOM produksi ini — cegah issue bahan di luar kebutuhan.
            'materialOptions' => collect($materialSummary)
                ->map(fn (array $material): array => [
                    'id' => $material['id'],
                    'kode_bahan' => $material['kode_bahan'],
                    'nama_bahan' => $material['nama_bahan'],
                    'satuan' => $material['satuan'],
                    'stok' => $material['available'],
                ])
                ->values()
                ->all(),
            'activeRework' => $activeRework,
            'qcSummary' => $qcSummary,
            'wageBasis' => $this->service->wageBasis($produksi),
        ]);
    }

    /**
     * Mulai produksi — catat rencana kebutuhan BOM, ubah status draft → proses.
     * Stok bahan baku belum berkurang sampai bahan dikeluarkan (issued/additional).
     */
    public function mulai(Produksi $produksi)
    {
        try {
            $this->service->mulaiProduksi($produksi, auth()->id());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            'Produksi berhasil dimulai. Kebutuhan bahan sudah dihitung, tetapi stok belum dikurangi. Keluarkan bahan dari gudang untuk mencatat perubahan stok.',
        );
    }

    /**
     * Batalkan produksi.
     */
    public function batalkan(Produksi $produksi)
    {
        try {
            $this->service->batalkanProduksi($produksi, auth()->id());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Produksi berhasil dibatalkan.');
    }

    /**
     * Input progress produksi — pilih produk, qty, qc_status.
     */
    public function progress(InputProgressRequest $request, Produksi $produksi)
    {
        try {
            $this->service->inputProgress(
                produksi: $produksi,
                data: $request->validated(),
                userId: auth()->id(),
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $msg = $request->validated('qc_status') === 'lolos'
            ? 'Progress berhasil dicatat. Stok produk jadi bertambah.'
            : 'Progress dicatat sebagai tidak lolos QC. Stok tidak berubah.';

        return back()->with('success', $msg);
    }

    public function materialMovement(MaterialMovementRequest $request, Produksi $produksi)
    {
        try {
            $movement = $this->materialService->recordMovement(
                $produksi,
                $request->validated(),
                auth()->id(),
            )->load(['bahanBaku', 'stokHistory']);
        } catch (\RuntimeException|\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        $movementLabel = DomainLabels::materialMovement($movement->movement_type);
        $namaBahan = $movement->bahanBaku?->nama_bahan ?? 'Bahan';
        $qty = number_format((float) $movement->qty, 2, ',', '.');

        if ($movement->stokHistory !== null) {
            $sebelum = number_format((float) $movement->stokHistory->stok_sebelum, 2, ',', '.');
            $sesudah = number_format((float) $movement->stokHistory->stok_sesudah, 2, ',', '.');

            return back()->with(
                'success',
                "{$movementLabel}: {$namaBahan} qty {$qty}. Stok {$sebelum} → {$sesudah}. Produksi #{$produksi->id}.",
            );
        }

        $note = match ($movement->movement_type) {
            'consumed' => 'Menandai bahan sebagai terpakai tidak mengurangi stok kembali.',
            'planned' => 'Rencana kebutuhan tidak mengubah stok.',
            default => 'Tidak ada perubahan stok gudang.',
        };

        return back()->with(
            'success',
            "{$movementLabel}: {$namaBahan} qty {$qty}. {$note} Produksi #{$produksi->id}.",
        );
    }

    /**
     * Pengeluaran bahan massal dari gudang untuk produksi aktif.
     */
    public function bulkMaterialIssue(BulkMaterialIssueRequest $request, Produksi $produksi)
    {
        try {
            $movements = $this->materialService->recordBulkIssue(
                $produksi,
                $request->validated(),
                auth()->id(),
            );
        } catch (\RuntimeException|\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        $count = count($movements);
        $totalQty = collect($movements)->sum(fn ($m) => (float) $m->qty);
        $totalQtyLabel = number_format($totalQty, 2, ',', '.');

        return back()->with(
            'success',
            "Berhasil mengeluarkan {$count} bahan untuk Produksi #{$produksi->id} (total qty {$totalQtyLabel}). Riwayat stok bahan baku telah diperbarui.",
        );
    }

    public function updateQcDisposition(
        UpdateQcDispositionRequest $request,
        Produksi $produksi,
        DetailProduksi $detailProduksi,
    ) {
        try {
            $this->service->updateQcDisposition(
                $produksi,
                $detailProduksi,
                $request->validated(),
                auth()->id(),
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Disposisi kegagalan QC berhasil dicatat.');
    }

    /**
     * Selesaikan produksi.
     */
    public function selesai(Produksi $produksi)
    {
        try {
            $this->service->selesaikanProduksi($produksi);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Produksi berhasil diselesaikan.');
    }

    // ─── Helper privat ───────────────────────────────────────────────────────

    /**
     * Hitung kebutuhan bahan dari collection items sementara (sebelum disimpan ke DB).
     * Digunakan untuk preview di form create.
     */
    private function hitungKebutuhanBahanDariItems($items): array
    {
        $kebutuhan = [];

        foreach ($items as $item) {
            $produk = $item->produk;

            if (! $produk || ! $produk->bomCategorie) {
                continue;
            }

            foreach ($produk->bomCategorie->bomDetails as $bomDetail) {
                $bahanBaku = $bomDetail->bahanBaku;
                if (! $bahanBaku) {
                    continue;
                }

                $id = $bahanBaku->id;
                $kebutuhanQty = (float) $bomDetail->qty_per_pair * $item->qty_target;

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
}
