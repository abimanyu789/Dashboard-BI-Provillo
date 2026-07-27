<?php

namespace App\Http\Controllers;

use App\Http\Requests\PembayaranRequest;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Services\PembayaranService;
use Illuminate\Http\RedirectResponse;

class PembayaranController extends Controller
{
    public function __construct(
        private readonly PembayaranService $service
    ) {}

    /**
     * Simpan pembayaran baru untuk pesanan.
     * Auto-create entry arus_kas (pemasukan) via PembayaranService.
     * Auto promote pending→proses + evaluateCompletion.
     */
    public function store(PembayaranRequest $request, Pesanan $pesanan): RedirectResponse
    {
        try {
            $this->service->create($pesanan, $request->validated(), auth()->id());
        } catch (\RuntimeException $e) {
            return back()->withInput()->with('error', $e->getMessage());
        }

        return redirect()
            ->route('pesanan.show', $pesanan)
            ->with('success', 'Pembayaran berhasil dicatat dan masuk ke Arus Kas.');
    }

    /**
     * Hapus pembayaran beserta entry arus kas terkait.
     * Diblok jika pesanan sudah selesai (H5).
     */
    public function destroy(Pembayaran $pembayaran): RedirectResponse
    {
        $pesananId = $pembayaran->pesanan_id;

        try {
            $this->service->destroy($pembayaran);
        } catch (\RuntimeException $e) {
            return redirect()
                ->route('pesanan.show', $pesananId)
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('pesanan.show', $pesananId)
            ->with('success', 'Pembayaran berhasil dihapus.');
    }
}
