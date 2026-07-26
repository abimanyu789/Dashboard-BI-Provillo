<?php

namespace App\Http\Controllers;

use App\Http\Requests\BahanBakuRequest;
use App\Models\BahanBaku;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Exports\BahanBakuExport;
use App\Exports\BahanBakuTemplateExport;
use App\Imports\BahanBakuImport;
use App\Services\BahanBakuService;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class BahanBakuController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search  = $request->input('search');
        $satuan  = $request->input('satuan');
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        // Whitelist kolom yang boleh di-sort
        $allowedSorts = ['kode_bahan', 'nama_bahan', 'satuan', 'minimum_stok', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        $bahanBakus = BahanBaku::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('kode_bahan', 'like', "%{$search}%")
                        ->orWhere('nama_bahan', 'like', "%{$search}%")
                        ->orWhere('satuan', 'like', "%{$search}%");
                });
            })
            ->when($satuan, function ($query, $satuan) {
                $query->where('satuan', $satuan);
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('bahan-baku/index', [
            'bahanBakus'    => $bahanBakus,
            'filters'       => [
                'search'   => $search,
                'satuan'   => $satuan,
                'sort_by'  => $sortBy,
                'sort_dir' => $sortDir,
            ],
            'satuanOptions' => $this->getSatuanOptions(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('bahan-baku/create', [
            'satuanOptions' => $this->getSatuanOptions(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(BahanBakuRequest $request)
    {
        BahanBaku::create($request->validated());

        return redirect()
            ->route('bahan-baku.index')
            ->with('success', 'Bahan baku berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(BahanBaku $bahanBaku)
    {
        return Inertia::render('bahan-baku/show', [
            'bahanBaku' => $bahanBaku,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(BahanBaku $bahanBaku)
    {
        return Inertia::render('bahan-baku/edit', [
            'bahanBaku' => $bahanBaku,
            'satuanOptions' => $this->getSatuanOptions(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(BahanBakuRequest $request, BahanBaku $bahanBaku)
    {
        $bahanBaku->update($request->validated());

        return redirect()
            ->route('bahan-baku.index')
            ->with('success', 'Bahan baku berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(BahanBaku $bahanBaku)
    {
        // TODO: Check if bahan baku is used in BOM (will be implemented in Module 5)
        // For now, allow deletion

        $bahanBaku->delete();

        return redirect()
            ->route('bahan-baku.index')
            ->with('success', 'Bahan baku berhasil dihapus.');
    }

    /**
     * Get satuan options for dropdown.
     */
    private function getSatuanOptions(): array
    {
        return array_map(
            fn(string $satuan) => ['value' => $satuan, 'label' => ucfirst($satuan)],
            BahanBaku::SATUAN_OPTIONS
        );
    }

    /**
     * Export data ke Excel atau PDF.
     */
    public function export(Request $request)
    {
        if ($request->query('format') === 'pdf') {
            $items = BahanBaku::orderBy('kode_bahan')->get();
            $title = 'Laporan Data Bahan Baku';
            $count = $items->count();
            $pdf = Pdf::loadView('exports.bahan-baku', compact('items', 'title', 'count'));
            return $pdf->download('bahan_baku.pdf');
        }

        return Excel::download(new BahanBakuExport, 'bahan_baku.xlsx');
    }

    /**
     * Download template import Excel.
     */
    public function template()
    {
        return Excel::download(new BahanBakuTemplateExport, 'template_import_bahan_baku.xlsx');
    }

    /**
     * Import data dari Excel.
     */
    public function import(Request $request, BahanBakuService $service)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv', 'max:2048'],
        ], [
            'file.required' => 'File Excel harus diunggah.',
            'file.mimes' => 'Format file harus berupa .xlsx atau .csv.',
            'file.max' => 'Ukuran file maksimal adalah 2MB.',
        ]);

        try {
            DB::transaction(function () use ($request, $service) {
                Excel::import(new BahanBakuImport($service), $request->file('file'));
            });

            return redirect()->back()->with('success', 'Data Bahan Baku berhasil diimport.');
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = $e->failures();
            $errorMessages = [];
            
            foreach ($failures as $failure) {
                $row = $failure->row(); // baris ke-berapa
                $errors = implode(', ', $failure->errors());
                $errorMessages[] = "Baris {$row}: {$errors}";
            }

            return redirect()->back()->withErrors(['error' => 'Gagal import: ' . implode(' | ', $errorMessages)]);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan sistem: ' . $e->getMessage()]);
        }
    }
}
