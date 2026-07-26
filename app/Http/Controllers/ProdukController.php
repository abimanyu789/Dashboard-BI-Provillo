<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProdukRequest;
use App\Models\BomCategorie;
use App\Models\Produk;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Exports\ProdukExport;
use App\Exports\ProdukTemplateExport;
use App\Imports\ProdukImport;
use App\Services\ProdukService;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class ProdukController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search  = $request->input('search');
        $bom     = $request->input('bom'); // 'ada' | 'tidak'
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        // Whitelist kolom yang boleh di-sort
        $allowedSorts = ['kode_produk', 'nama_produk', 'ukuran', 'warna', 'harga_jual', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $produks = Produk::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('kode_produk', 'like', "%{$search}%")
                        ->orWhere('nama_produk', 'like', "%{$search}%")
                        ->orWhere('warna', 'like', "%{$search}%");
                });
            })
            ->when($bom === 'ada', function ($query) {
                $query->whereNotNull('bom_category_id');
            })
            ->when($bom === 'tidak', function ($query) {
                $query->whereNull('bom_category_id');
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('produk/index', [
            'produks' => $produks,
            'filters' => [
                'search'   => $search,
                'bom'      => $bom,
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
        $bomCategories = BomCategorie::select('id', 'nama_bom')
            ->orderBy('nama_bom')
            ->get();

        return Inertia::render('produk/create', [
            'bomCategories' => $bomCategories,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ProdukRequest $request, ProdukService $service)
    {
        $service->store($request->validated());

        return redirect()
            ->route('produk.index')
            ->with('success', 'Produk berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Produk $produk)
    {
        $produk->load([
            'bomCategorie.bomDetails.bahanBaku',
            'stokHistory' => fn ($q) => $q->orderByDesc('created_at')->limit(5),
        ]);

        return Inertia::render('produk/show', [
            'produk' => $produk,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Produk $produk)
    {
        $bomCategories = BomCategorie::select('id', 'nama_bom')
            ->orderBy('nama_bom')
            ->get();

        return Inertia::render('produk/edit', [
            'produk'        => $produk,
            'bomCategories' => $bomCategories,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(ProdukRequest $request, Produk $produk)
    {
        $produk->update($request->validated());

        return redirect()
            ->route('produk.index')
            ->with('success', 'Produk berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Produk $produk)
    {
        // Validasi: produk tidak bisa dihapus jika sudah dipakai di pesanan (BR Produk)
        if ($produk->detailPesanans()->exists()) {
            return back()->with('error', 'Produk tidak dapat dihapus karena sudah digunakan dalam pesanan.');
        }

        $produk->delete();

        return redirect()
            ->route('produk.index')
            ->with('success', 'Produk berhasil dihapus.');
    }

    /**
     * Export data ke Excel atau PDF.
     */
    public function export(Request $request)
    {
        if ($request->query('format') === 'pdf') {
            $items = Produk::orderBy('kode_produk')->get();
            $title = 'Laporan Data Produk';
            $count = $items->count();
            $pdf = Pdf::loadView('exports.produk', compact('items', 'title', 'count'));
            return $pdf->download('produk.pdf');
        }

        return Excel::download(new ProdukExport, 'produk.xlsx');
    }

    /**
     * Download template import Excel.
     */
    public function template()
    {
        return Excel::download(new ProdukTemplateExport, 'template_import_produk.xlsx');
    }

    /**
     * Import data dari Excel.
     */
    public function import(Request $request, ProdukService $service)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv', 'max:2048'],
        ], [
            'file.required' => 'File Excel harus diunggah.',
            'file.mimes' => 'Format file harus berupa .xlsx atau .csv.',
            'file.max' => 'Ukuran file maksimal adalah 2MB.',
        ]);

        try {
            $import = new ProdukImport($service);
            DB::transaction(function () use ($request, $import) {
                Excel::import($import, $request->file('file'));
            });

            $added = $import->getAddedCount();
            return redirect()->back()->with('success', "Import berhasil. Data berhasil diproses: {$added} data berhasil ditambahkan, 0 data dilewati, 0 data gagal.");
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = $e->failures();
            $errorMessages = [];
            
            foreach ($failures as $failure) {
                $row = $failure->row();
                $errors = implode(', ', $failure->errors());
                $errorMessages[] = "Baris {$row}: {$errors}";
            }

            return redirect()->back()->withErrors(['error' => 'Import gagal. ' . implode(' | ', $errorMessages)]);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan sistem: ' . $e->getMessage()]);
        }
    }
}
