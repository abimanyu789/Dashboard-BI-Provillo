<?php

namespace App\Http\Controllers;

use App\Http\Requests\ArusKasRequest;
use App\Models\ArusKas;
use App\Services\ArusKasService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArusKasController extends Controller
{
    public function __construct(
        private readonly ArusKasService $service
    ) {}

    /**
     * Index: daftar semua transaksi arus kas + stat cards saldo.
     */
    public function index(Request $request): Response
    {
        $search      = $request->input('search');
        $jenis       = $request->input('jenis');
        $dari        = $request->input('dari');
        $sampai      = $request->input('sampai');
        $sortBy      = $request->input('sort_by', 'tanggal');
        $sortDir     = $request->input('sort_dir', 'desc');

        $allowedSorts = ['tanggal', 'nominal', 'jenis', 'kategori', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'tanggal';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $transaksis = ArusKas::with(['pembayaran.pesanan', 'createdBy'])
            ->when($search, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('keterangan', 'like', "%{$search}%")
                        ->orWhere('kategori', 'like', "%{$search}%");
                });
            })
            ->when($jenis && in_array($jenis, ['pemasukan', 'pengeluaran']), function ($q) use ($jenis) {
                $q->where('jenis', $jenis);
            })
            ->when($dari, function ($q, $dari) {
                $q->whereDate('tanggal', '>=', $dari);
            })
            ->when($sampai, function ($q, $sampai) {
                $q->whereDate('tanggal', '<=', $sampai);
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate(15)
            ->withQueryString();

        // Saldo dihitung dari query ter-filter (periode)
        $ringkasan = $this->service->hitungRingkasan($dari, $sampai);
        // Saldo total keseluruhan
        $saldoTotal = $this->service->hitungSaldo();

        return Inertia::render('arus-kas/index', [
            'transaksis' => $transaksis,
            'ringkasan'  => $ringkasan,
            'saldoTotal' => $saldoTotal,
            'filters'    => [
                'search'   => $search,
                'jenis'    => $jenis,
                'dari'     => $dari,
                'sampai'   => $sampai,
                'sort_by'  => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Form create transaksi manual.
     */
    public function create(): Response
    {
        return Inertia::render('arus-kas/create');
    }

    /**
     * Simpan transaksi manual baru.
     */
    public function store(ArusKasRequest $request): RedirectResponse
    {
        $this->service->create($request->validated(), auth()->id());

        return redirect()
            ->route('arus-kas.index')
            ->with('success', 'Transaksi berhasil dicatat.');
    }

    /**
     * Detail satu transaksi.
     */
    public function show(ArusKas $arusKas): Response
    {
        $arusKas->load(['pembayaran.pesanan.customer', 'createdBy']);

        return Inertia::render('arus-kas/show', [
            'transaksi' => $arusKas,
        ]);
    }

    /**
     * Form edit transaksi manual.
     * Transaksi dari pembayaran tidak bisa diedit dari sini.
     */
    public function edit(ArusKas $arusKas): Response|RedirectResponse
    {
        if ($arusKas->dariPembayaran()) {
            return redirect()
                ->route('arus-kas.show', $arusKas)
                ->with('error', 'Transaksi dari pembayaran pesanan hanya bisa diubah melalui Detail Pesanan.');
        }

        return Inertia::render('arus-kas/edit', [
            'transaksi' => $arusKas,
        ]);
    }

    /**
     * Update transaksi manual.
     */
    public function update(ArusKasRequest $request, ArusKas $arusKas): RedirectResponse
    {
        try {
            $this->service->update($arusKas, $request->validated());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()
            ->route('arus-kas.index')
            ->with('success', 'Transaksi berhasil diperbarui.');
    }

    /**
     * Hapus transaksi manual.
     */
    public function destroy(ArusKas $arusKas): RedirectResponse
    {
        try {
            $this->service->destroy($arusKas);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()
            ->route('arus-kas.index')
            ->with('success', 'Transaksi berhasil dihapus.');
    }
}
