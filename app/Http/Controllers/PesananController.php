<?php

namespace App\Http\Controllers;

use App\Http\Requests\PesananRequest;
use App\Http\Requests\UpdateStatusPesananRequest;
use App\Models\Customer;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Services\PesananService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PesananController extends Controller
{
    public function __construct(
        private readonly PesananService $service
    ) {}

    /**
     * Daftar semua pesanan.
     */
    public function index(Request $request)
    {
        $search  = $request->input('search');
        $status  = $request->input('status');
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        $allowedSorts = ['nomor_pesanan', 'tanggal', 'total', 'status', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $pesanans = Pesanan::with('customer')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nomor_pesanan', 'like', "%{$search}%")
                        ->orWhereHas('customer', function ($q2) use ($search) {
                            $q2->where('nama_customer', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status && in_array($status, ['pending', 'proses', 'selesai', 'dibatalkan']), function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('pesanan/index', [
            'pesanans' => $pesanans,
            'filters'  => [
                'search'   => $search,
                'status'   => $status,
                'sort_by'  => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Form buat pesanan baru.
     */
    public function create()
    {
        return Inertia::render('pesanan/create', [
            'customers' => Customer::orderBy('nama_customer')->get(['id', 'nama_customer', 'jenis_customer']),
            'produks'   => Produk::orderBy('nama_produk')->get(['id', 'kode_produk', 'nama_produk', 'harga_jual', 'stok']),
        ]);
    }

    /**
     * Simpan pesanan baru.
     */
    public function store(PesananRequest $request)
    {
        $pesanan = $this->service->createWithDetails(
            $request->validated(),
            auth()->id()
        );

        return redirect()
            ->route('pesanan.show', $pesanan)
            ->with('success', "Pesanan {$pesanan->nomor_pesanan} berhasil dibuat.");
    }

    /**
     * Detail pesanan.
     */
    public function show(Pesanan $pesanan)
    {
        $pesanan->load(['customer', 'createdBy', 'detailPesanan.produk', 'pembayarans']);

        $totalDibayar = $pesanan->totalDibayar();
        $sisaTagihan = $pesanan->sisaTagihan();

        return Inertia::render('pesanan/show', [
            'pesanan' => array_merge($pesanan->toArray(), [
                'created_by_nama' => $pesanan->createdBy?->nama ?? $pesanan->createdBy?->name ?? 'Admin',
            ]),
            'statusTransisi' => $this->getStatusTransisi($pesanan->status),
            'ringkasanPembayaran' => [
                'total' => (float) $pesanan->total,
                'total_dibayar' => $totalDibayar,
                'sisa_tagihan' => $sisaTagihan,
                'status_pembayaran' => $pesanan->statusPembayaran(),
            ],
            'progressPengiriman' => $pesanan->progressPengiriman(),
        ]);
    }

    /**
     * Form edit pesanan — diblok jika locked atau sudah ada pengiriman (H9).
     */
    public function edit(Pesanan $pesanan)
    {
        if ($pesanan->isLocked()) {
            return redirect()
                ->route('pesanan.show', $pesanan)
                ->with('error', 'Pesanan yang sudah selesai/dibatalkan tidak dapat diedit.');
        }

        if ($pesanan->hasPengiriman()) {
            return redirect()
                ->route('pesanan.show', $pesanan)
                ->with('error', 'Pesanan yang sudah memiliki pengiriman tidak dapat diedit.');
        }

        $pesanan->load('detailPesanan.produk');

        return Inertia::render('pesanan/edit', [
            'pesanan'   => $pesanan,
            'customers' => Customer::orderBy('nama_customer')->get(['id', 'nama_customer', 'jenis_customer']),
            'produks'   => Produk::orderBy('nama_produk')->get(['id', 'kode_produk', 'nama_produk', 'harga_jual', 'stok']),
        ]);
    }

    /**
     * Update pesanan — diblok jika locked atau sudah ada pengiriman (H9).
     */
    public function update(PesananRequest $request, Pesanan $pesanan)
    {
        try {
            $this->service->updateWithDetails($pesanan, $request->validated());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()
            ->route('pesanan.show', $pesanan)
            ->with('success', 'Pesanan berhasil diperbarui.');
    }

    /**
     * Update status pesanan.
     */
    public function updateStatus(UpdateStatusPesananRequest $request, Pesanan $pesanan)
    {
        try {
            $this->service->updateStatus($pesanan, $request->validated('status'));
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Status pesanan berhasil diperbarui.');
    }

    /**
     * Hapus pesanan — hanya saat status pending/proses (BR-07).
     * Diblok jika sudah ada pengiriman (H10).
     */
    public function destroy(Pesanan $pesanan)
    {
        if ($pesanan->isLocked()) {
            return back()->with('error', 'Pesanan berstatus selesai atau dibatalkan tidak dapat dihapus.');
        }

        if ($pesanan->hasPengiriman()) {
            return back()->with('error', 'Pesanan yang sudah memiliki pengiriman tidak dapat dihapus.');
        }

        $nomor = $pesanan->nomor_pesanan;
        $pesanan->detailPesanan()->delete();
        $pesanan->delete();

        return redirect()
            ->route('pesanan.index')
            ->with('success', "Pesanan {$nomor} berhasil dihapus.");
    }

    /**
     * Generate invoice PDF — stream di tab baru (default) atau download (?download=1).
     */
    public function invoice(Request $request, Pesanan $pesanan)
    {
        $pesanan->load(['customer', 'createdBy', 'detailPesanan.produk']);

        $pdf = Pdf::loadView('pdf.invoice', [
            'pesanan'      => $pesanan,
            'nomorInvoice' => $pesanan->nomor_invoice,
        ])->setPaper('a4', 'portrait');

        $filename = "Invoice-{$pesanan->nomor_invoice}.pdf";

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    /**
     * Kembalikan daftar status yang bisa ditransisi dari status saat ini.
     * R1: 'selesai' tidak tersedia manual — hanya lewat auto-evaluate.
     */
    private function getStatusTransisi(string $status): array
    {
        return match ($status) {
            'pending' => ['proses', 'dibatalkan'],
            'proses'  => ['dibatalkan'],
            default   => [],
        };
    }
}
