<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransaksiProdukRequest;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\StokProdukCacat;
use App\Models\StokProdukJadi;
use App\Services\Inventory\StockProdukService;
use App\Services\PesananService;
use App\Support\DomainLabels;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StokProdukJadiController extends Controller
{
    public function __construct(
        private readonly StockProdukService $service,
        private readonly PesananService $pesananService,
    ) {}

    /**
     * Daftar stok produk jadi + tab produk cacat / dimusnahkan.
     *
     * Tab:
     * - normal: riwayat stok produk normal (hanya qty lolos QC yang masuk stok normal)
     * - cacat: stok_produk_cacat disposisi jual_cacat (tidak digabung ke stok normal)
     * - dimusnahkan: riwayat disposisi dimusnahkan
     */
    public function index(Request $request)
    {
        $tab = $request->input('tab', 'normal');
        if (! in_array($tab, ['normal', 'cacat', 'dimusnahkan'], true)) {
            $tab = 'normal';
        }

        $search = $request->input('search');
        $produkId = $request->input('produk_id');
        $jenisTransaksi = $request->input('jenis_transaksi');
        $tanggalDari = $request->input('tanggal_dari');
        $tanggalSampai = $request->input('tanggal_sampai');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        $allowedSorts = ['created_at', 'qty', 'stok_sebelum', 'stok_sesudah', 'jenis_transaksi'];
        if (! in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $produkOptions = Produk::orderBy('nama_produk')
            ->get(['id', 'kode_produk', 'nama_produk']);

        $payload = [
            'tab' => $tab,
            'riwayat' => null,
            'produkCacat' => null,
            'riwayatDimusnahkan' => null,
            'produkOptions' => $produkOptions,
            'filters' => [
                'tab' => $tab,
                'search' => $search,
                'produk_id' => $produkId,
                'jenis_transaksi' => $jenisTransaksi,
                'tanggal_dari' => $tanggalDari,
                'tanggal_sampai' => $tanggalSampai,
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
            ],
            // Keputusan belum final: alur penjualan/pengeluaran produk cacat layak jual.
            'unresolvedNotes' => [
                'Penanganan penjualan/pengeluaran stok produk cacat layak jual belum disediakan di modul ini. Untuk cakupan saat ini, qty cacat dihitung dari catatan stok_produk_cacat (disposisi jual_cacat) dan tidak digabung ke stok normal.',
            ],
        ];

        if ($tab === 'normal') {
            $riwayat = StokProdukJadi::with(['produk', 'pesanan.customer', 'createdBy'])
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->whereHas('produk', function ($q2) use ($search) {
                            $q2->where(function ($q3) use ($search) {
                                $q3->where('kode_produk', 'like', "%{$search}%")
                                    ->orWhere('nama_produk', 'like', "%{$search}%");
                            });
                        })->orWhere('keterangan', 'like', "%{$search}%")
                            ->orWhereHas('pesanan', function ($q2) use ($search) {
                                $q2->where('nomor_pesanan', 'like', "%{$search}%");
                            });
                    });
                })
                ->when($produkId, function ($query, $id) {
                    $query->where('produk_id', $id);
                })
                ->when($jenisTransaksi, function ($query, $jenis) {
                    $query->where('jenis_transaksi', $jenis);
                })
                ->when($tanggalDari, function ($query, $tanggal) {
                    $query->whereDate('created_at', '>=', $tanggal);
                })
                ->when($tanggalSampai, function ($query, $tanggal) {
                    $query->whereDate('created_at', '<=', $tanggal);
                })
                ->orderBy($sortBy, $sortDir)
                ->paginate(15)
                ->withQueryString()
                ->through(fn (StokProdukJadi $item) => [
                    ...$item->toArray(),
                    'jenis_transaksi_label' => DomainLabels::stokProdukTransaksi($item->jenis_transaksi),
                    'dicatat_oleh' => $item->createdBy?->name,
                ]);

            $payload['riwayat'] = $riwayat;
        }

        if ($tab === 'cacat') {
            // Agregasi stok cacat layak jual per produk + baris detail.
            $rows = StokProdukCacat::query()
                ->with([
                    'produk',
                    'produksi',
                    'createdBy',
                    'detailProduksi.karyawan',
                    'detailProduksi.inspector',
                ])
                ->where('disposisi', 'jual_cacat')
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('alasan_qc', 'like', "%{$search}%")
                            ->orWhere('catatan', 'like', "%{$search}%")
                            ->orWhereHas('produk', function ($q2) use ($search) {
                                $q2->where('kode_produk', 'like', "%{$search}%")
                                    ->orWhere('nama_produk', 'like', "%{$search}%");
                            });
                    });
                })
                ->when($produkId, fn ($q, $id) => $q->where('produk_id', $id))
                ->when($tanggalDari, fn ($q, $t) => $q->whereDate('created_at', '>=', $t))
                ->when($tanggalSampai, fn ($q, $t) => $q->whereDate('created_at', '<=', $t))
                ->orderByDesc('created_at')
                ->paginate(15)
                ->withQueryString()
                ->through(function (StokProdukCacat $row) {
                    return [
                        'id' => $row->id,
                        'produk_id' => $row->produk_id,
                        'kode_produk' => $row->produk?->kode_produk,
                        'nama_produk' => $row->produk?->nama_produk,
                        'qty' => (int) $row->qty,
                        'alasan_qc' => $row->alasan_qc,
                        'catatan' => $row->catatan,
                        'produksi_id' => $row->produksi_id,
                        'karyawan' => $row->detailProduksi?->karyawan?->nama_karyawan,
                        'inspected_at' => $row->detailProduksi?->inspected_at
                            ?? $row->detailProduksi?->created_at,
                        'created_at' => $row->created_at,
                        'dicatat_oleh' => $row->createdBy?->name,
                        'disposisi' => $row->disposisi,
                        'disposisi_label' => DomainLabels::qcDisposition($row->disposisi),
                    ];
                });

            $payload['produkCacat'] = $rows;
        }

        if ($tab === 'dimusnahkan') {
            $rows = StokProdukCacat::query()
                ->with([
                    'produk',
                    'produksi',
                    'createdBy',
                    'detailProduksi',
                ])
                ->where('disposisi', 'dimusnahkan')
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('alasan_qc', 'like', "%{$search}%")
                            ->orWhere('catatan', 'like', "%{$search}%")
                            ->orWhereHas('produk', function ($q2) use ($search) {
                                $q2->where('kode_produk', 'like', "%{$search}%")
                                    ->orWhere('nama_produk', 'like', "%{$search}%");
                            });
                    });
                })
                ->when($produkId, fn ($q, $id) => $q->where('produk_id', $id))
                ->when($tanggalDari, fn ($q, $t) => $q->whereDate('created_at', '>=', $t))
                ->when($tanggalSampai, fn ($q, $t) => $q->whereDate('created_at', '<=', $t))
                ->orderByDesc('created_at')
                ->paginate(15)
                ->withQueryString()
                ->through(function (StokProdukCacat $row) {
                    return [
                        'id' => $row->id,
                        'produk_id' => $row->produk_id,
                        'kode_produk' => $row->produk?->kode_produk,
                        'nama_produk' => $row->produk?->nama_produk,
                        'qty' => (int) $row->qty,
                        'alasan_qc' => $row->alasan_qc,
                        'catatan' => $row->catatan,
                        'produksi_id' => $row->produksi_id,
                        'inspected_at' => $row->detailProduksi?->inspected_at
                            ?? $row->detailProduksi?->created_at,
                        'created_at' => $row->created_at,
                        'dicatat_oleh' => $row->createdBy?->name,
                        'disposisi' => $row->disposisi,
                        'disposisi_label' => DomainLabels::qcDisposition($row->disposisi),
                    ];
                });

            $payload['riwayatDimusnahkan'] = $rows;
        }

        return Inertia::render('stok-produk-jadi/index', $payload);
    }

    /**
     * Form tambah transaksi stok produk jadi (multi-item).
     */
    public function create(Request $request)
    {
        $produkList = Produk::orderBy('nama_produk')
            ->get(['id', 'kode_produk', 'nama_produk', 'stok']);

        // Pesanan aktif (belum locked) untuk dropdown pengiriman
        $pesananOptions = Pesanan::with('customer:id,nama_customer')
            ->whereIn('status', ['pending', 'proses'])
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get(['id', 'nomor_pesanan', 'tanggal', 'status', 'customer_id', 'total'])
            ->map(fn (Pesanan $p) => [
                'id'            => $p->id,
                'nomor_pesanan' => $p->nomor_pesanan,
                'tanggal'       => $p->tanggal?->format('Y-m-d'),
                'status'        => $p->status,
                'customer'      => $p->customer?->nama_customer,
                'total'         => $p->total,
            ]);

        $selectedId = $request->input('produk_id');
        $selectedPesananId = $request->input('pesanan_id');

        return Inertia::render('stok-produk-jadi/create', [
            'produkList'         => $produkList,
            'pesananOptions'     => $pesananOptions,
            'selectedId'         => $selectedId ? (int) $selectedId : null,
            'selectedPesananId'  => $selectedPesananId ? (int) $selectedPesananId : null,
        ]);
    }

    /**
     * Endpoint JSON: sisa pengiriman per produk untuk pesanan terpilih.
     * Dipakai form create stok produk jadi saat pilih pesanan.
     */
    public function sisaPengiriman(Pesanan $pesanan)
    {
        if ($pesanan->isLocked()) {
            return response()->json([
                'message' => "Pesanan berstatus '{$pesanan->status}' tidak bisa dikirim.",
                'items'   => [],
            ], 422);
        }

        return response()->json([
            'pesanan' => [
                'id'            => $pesanan->id,
                'nomor_pesanan' => $pesanan->nomor_pesanan,
                'status'        => $pesanan->status,
                'customer'      => $pesanan->customer?->nama_customer,
            ],
            'items' => $pesanan->sisaPengirimanItems(),
        ]);
    }

    /**
     * Proses transaksi stok produk jadi multi-item.
     * Semua item diproses dalam satu DB::transaction() — jika satu gagal, semua di-rollback.
     */
    public function store(TransaksiProdukRequest $request)
    {
        $jenis     = $request->validated('jenis_transaksi');
        $items     = $request->validated('items');
        $pesananId = $request->validated('pesanan_id');

        try {
            DB::transaction(function () use ($jenis, $items, $pesananId) {
                $pesanan = null;

                if ($jenis === 'pengiriman' && $pesananId) {
                    // Lock pesanan untuk cek sisa kirim + auto status (H14)
                    $pesanan = Pesanan::whereKey($pesananId)->lockForUpdate()->firstOrFail();

                    if ($pesanan->isLocked()) {
                        throw new \RuntimeException(
                            "Pesanan {$pesanan->nomor_pesanan} berstatus '{$pesanan->status}' dan tidak bisa dikirim."
                        );
                    }
                }

                foreach ($items as $item) {
                    $produk     = Produk::whereKey($item['produk_id'])->lockForUpdate()->firstOrFail();
                    $qty        = (int) $item['qty'];
                    $keterangan = $item['keterangan'] ?? null;

                    // Pengiriman selalu kurangi. Penyesuaian bisa + atau − tergantung sign qty.
                    if ($jenis === 'pengiriman' || $qty < 0) {
                        $keteranganFinal = $keterangan;
                        if ($jenis === 'pengiriman' && $pesanan && empty($keteranganFinal)) {
                            $keteranganFinal = "Pengiriman pesanan {$pesanan->nomor_pesanan}";
                        }

                        $this->service->reduceStock(
                            produk:     $produk,
                            qty:        abs($qty),
                            jenis:      $jenis,
                            keterangan: $keteranganFinal,
                            createdBy:  auth()->id(),
                            pesananId:  $jenis === 'pengiriman' ? $pesananId : null,
                        );
                    } else {
                        $this->service->addStock(
                            produk:     $produk,
                            qty:        abs($qty),
                            jenis:      $jenis,
                            keterangan: $keterangan,
                            createdBy:  auth()->id(),
                        );
                    }
                }

                // Auto promote pending→proses + evaluate selesai
                if ($jenis === 'pengiriman' && $pesanan) {
                    $this->pesananService->promoteToProsesIfPending($pesanan);
                    $this->pesananService->evaluateCompletion($pesanan);
                }
            });
        } catch (\RuntimeException $e) {
            return back()->withInput()->with('error', $e->getMessage());
        }

        $label = DomainLabels::stokProdukTransaksi($jenis);
        $itemCount = count($items);
        $suffix    = $itemCount > 1 ? " ({$itemCount} item)" : '';

        return redirect()
            ->route('stok-produk-jadi.index')
            ->with('success', "{$label} berhasil dicatat{$suffix}.");
    }

    /**
     * Detail satu transaksi stok produk jadi.
     */
    public function show(StokProdukJadi $stokProdukJadi)
    {
        $stokProdukJadi->load(['produk', 'pesanan.customer', 'createdBy']);

        return Inertia::render('stok-produk-jadi/show', [
            'transaksi' => [
                ...$stokProdukJadi->toArray(),
                'jenis_transaksi_label' => \App\Support\DomainLabels::stokProdukTransaksi(
                    $stokProdukJadi->jenis_transaksi,
                ),
                'dicatat_oleh' => $stokProdukJadi->createdBy?->name,
            ],
        ]);
    }
}
