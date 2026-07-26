<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransaksiProdukRequest;
use App\Models\Produk;
use App\Models\StokProdukJadi;
use App\Services\Inventory\StockProdukService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StokProdukJadiController extends Controller
{
    public function __construct(
        private readonly StockProdukService $service
    ) {}

    /**
     * Daftar riwayat seluruh transaksi stok produk jadi.
     */
    public function index(Request $request)
    {
        $search         = $request->input('search');
        $produkId       = $request->input('produk_id');
        $jenisTransaksi = $request->input('jenis_transaksi');
        $tanggalDari    = $request->input('tanggal_dari');
        $tanggalSampai  = $request->input('tanggal_sampai');
        $sortBy         = $request->input('sort_by', 'created_at');
        $sortDir        = $request->input('sort_dir', 'desc');

        $allowedSorts = ['created_at', 'qty', 'stok_sebelum', 'stok_sesudah', 'jenis_transaksi'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $riwayat = StokProdukJadi::with('produk')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('produk', function ($q2) use ($search) {
                        $q2->where(function ($q3) use ($search) {
                            $q3->where('kode_produk', 'like', "%{$search}%")
                              ->orWhere('nama_produk', 'like', "%{$search}%");
                        });
                    })->orWhere('keterangan', 'like', "%{$search}%");
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
            ->withQueryString();

        $produkOptions = Produk::orderBy('nama_produk')
            ->get(['id', 'kode_produk', 'nama_produk']);

        return Inertia::render('stok-produk-jadi/index', [
            'riwayat'       => $riwayat,
            'produkOptions' => $produkOptions,
            'filters'       => [
                'search'          => $search,
                'produk_id'       => $produkId,
                'jenis_transaksi' => $jenisTransaksi,
                'tanggal_dari'    => $tanggalDari,
                'tanggal_sampai'  => $tanggalSampai,
                'sort_by'         => $sortBy,
                'sort_dir'        => $sortDir,
            ],
        ]);
    }

    /**
     * Form tambah transaksi stok produk jadi (multi-item).
     */
    public function create(Request $request)
    {
        $produkList = Produk::orderBy('nama_produk')
            ->get(['id', 'kode_produk', 'nama_produk', 'stok']);

        // Pre-select jika ada query param (deep link dari halaman lain)
        $selectedId = $request->input('produk_id');

        return Inertia::render('stok-produk-jadi/create', [
            'produkList' => $produkList,
            'selectedId' => $selectedId ? (int) $selectedId : null,
        ]);
    }

    /**
     * Proses transaksi stok produk jadi multi-item.
     * Semua item diproses dalam satu DB::transaction() — jika satu gagal, semua di-rollback.
     */
    public function store(TransaksiProdukRequest $request)
    {
        $jenis = $request->validated('jenis_transaksi');
        $items = $request->validated('items');

        try {
            DB::transaction(function () use ($jenis, $items) {
                foreach ($items as $item) {
                    $produk     = Produk::findOrFail($item['produk_id']);
                    $qty        = (int) $item['qty'];
                    $keterangan = $item['keterangan'] ?? null;

                    // Pengiriman selalu kurangi. Penyesuaian bisa + atau − tergantung sign qty.
                    if ($jenis === 'pengiriman' || $qty < 0) {
                        $this->service->reduceStock(
                            produk:     $produk,
                            qty:        abs($qty),
                            jenis:      $jenis,
                            keterangan: $keterangan,
                            createdBy:  auth()->id(),
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
            });
        } catch (\RuntimeException $e) {
            return back()->withInput()->with('error', $e->getMessage());
        }

        $label     = $jenis === 'pengiriman' ? 'Pengiriman' : 'Penyesuaian stok';
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
        $stokProdukJadi->load('produk');

        return Inertia::render('stok-produk-jadi/show', [
            'transaksi' => $stokProdukJadi,
        ]);
    }
}
