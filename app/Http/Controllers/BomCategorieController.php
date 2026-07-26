<?php

namespace App\Http\Controllers;

use App\Http\Requests\BomCategorieRequest;
use App\Models\BahanBaku;
use App\Models\BomCategorie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Exports\BomExport;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class BomCategorieController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search  = $request->input('search');
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        // Whitelist kolom yang boleh di-sort
        $allowedSorts = ['nama_bom', 'keterangan', 'bom_details_count', 'produk_count', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $bomCategories = BomCategorie::query()
            ->withCount(['bomDetails', 'produk'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nama_bom', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%");
                });
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('bom-categorie/index', [
            'bomCategories' => $bomCategories,
            'filters'       => [
                'search'   => $search,
                'sort_by'  => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $bahanBakus = BahanBaku::select('id', 'kode_bahan', 'nama_bahan', 'satuan')
            ->orderBy('nama_bahan')
            ->get();

        return Inertia::render('bom-categorie/create', [
            'bahanBakus' => $bahanBakus,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(BomCategorieRequest $request)
    {
        DB::transaction(function () use ($request) {
            $bom = BomCategorie::create([
                'nama_bom'   => $request->nama_bom,
                'keterangan' => $request->keterangan,
            ]);

            foreach ($request->details as $detail) {
                $bom->bomDetails()->create([
                    'bahan_baku_id' => $detail['bahan_baku_id'],
                    'qty_per_pair'  => $detail['qty_per_pair'],
                ]);
            }
        });

        return redirect()
            ->route('bom-categorie.index')
            ->with('success', 'BOM berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(BomCategorie $bomCategorie)
    {
        $bomCategorie->load(['bomDetails.bahanBaku']);

        $bahanBakus = BahanBaku::select('id', 'kode_bahan', 'nama_bahan', 'satuan')
            ->orderBy('nama_bahan')
            ->get();

        return Inertia::render('bom-categorie/show', [
            'bomCategorie' => $bomCategorie,
            'bahanBakus'   => $bahanBakus,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(BomCategorie $bomCategorie)
    {
        return Inertia::render('bom-categorie/edit', [
            'bomCategorie' => $bomCategorie,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(BomCategorieRequest $request, BomCategorie $bomCategorie)
    {
        $bomCategorie->update($request->validated());

        return redirect()
            ->route('bom-categorie.index')
            ->with('success', 'BOM berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(BomCategorie $bomCategorie)
    {
        // Cek apakah BOM masih digunakan oleh produk
        $produkCount = $bomCategorie->produk()->count();

        if ($produkCount > 0) {
            return redirect()
                ->back()
                ->with('error', "BOM tidak dapat dihapus karena masih digunakan oleh {$produkCount} produk.");
        }

        try {
            DB::transaction(function () use ($bomCategorie) {
                // Hapus semua detail BOM dahulu (FK restrict ke bom_categorie)
                $bomCategorie->bomDetails()->delete();
                $bomCategorie->delete();
            });
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'BOM tidak dapat dihapus. Pastikan tidak ada data terkait yang masih aktif.');
        }

        return redirect()
            ->route('bom-categorie.index')
            ->with('success', 'BOM berhasil dihapus.');
    }

    /**
     * Export data ke Excel atau PDF.
     */
    public function export(Request $request)
    {
        if ($request->query('format') === 'pdf') {
            $items = BomCategorie::with(['produk', 'bomDetails.bahanBaku'])->orderBy('nama_bom')->get();
            $title = 'Laporan Data Bill of Materials (BOM)';
            $count = $items->count();
            $pdf = Pdf::loadView('exports.bom', compact('items', 'title', 'count'));
            return $pdf->download('bom.pdf');
        }

        return Excel::download(new BomExport, 'bom.xlsx');
    }
}
