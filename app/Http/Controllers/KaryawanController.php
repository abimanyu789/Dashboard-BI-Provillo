<?php

namespace App\Http\Controllers;

use App\Http\Requests\KaryawanRequest;
use App\Models\Karyawan;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Exports\KaryawanExport;
use App\Exports\KaryawanTemplateExport;
use App\Imports\KaryawanImport;
use App\Services\KaryawanService;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class KaryawanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search  = $request->input('search');
        $jabatan = $request->input('jabatan');
        $status  = $request->input('status');
        $perPage = (int) $request->input('per_page', 15);
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        // Whitelist kolom yang boleh di-sort
        $allowedSorts = ['nama_karyawan', 'jabatan', 'no_hp', 'status', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = $sortDir === 'asc' ? 'asc' : 'desc';

        // Whitelist per_page
        $allowedPerPage = [10, 15, 25, 50, 100];
        if (!in_array($perPage, $allowedPerPage)) {
            $perPage = 15;
        }

        $karyawans = Karyawan::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nama_karyawan', 'like', "%{$search}%")
                        ->orWhere('no_hp', 'like', "%{$search}%")
                        ->orWhere('jabatan', 'like', "%{$search}%");
                });
            })
            ->when($jabatan, function ($query) use ($jabatan) {
                $query->where('jabatan', $jabatan);
            })
            ->when($status && in_array($status, ['aktif', 'nonaktif']), function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->withQueryString();

        // Daftar jabatan unik untuk dropdown filter
        $jabatanOptions = Karyawan::query()
            ->whereNotNull('jabatan')
            ->distinct()
            ->orderBy('jabatan')
            ->pluck('jabatan');

        return Inertia::render('karyawan/index', [
            'karyawans'      => $karyawans,
            'jabatanOptions' => $jabatanOptions,
            'filters'        => [
                'search'   => $search,
                'jabatan'  => $jabatan,
                'status'   => $status,
                'per_page' => $perPage,
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
        return Inertia::render('karyawan/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(KaryawanRequest $request, KaryawanService $service)
    {
        $service->store($request->validated());

        return redirect()
            ->route('karyawan.index')
            ->with('success', 'Karyawan berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Karyawan $karyawan)
    {
        return Inertia::render('karyawan/show', [
            'karyawan' => $karyawan,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Karyawan $karyawan)
    {
        return Inertia::render('karyawan/edit', [
            'karyawan' => $karyawan,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(KaryawanRequest $request, Karyawan $karyawan)
    {
        $karyawan->update($request->validated());

        return redirect()
            ->route('karyawan.index')
            ->with('success', 'Karyawan berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     *
     * TODO (Modul Produksi): Uncomment blok validasi di bawah setelah
     * tabel `detail_produksi` dan relasi Karyawan::detailProduksis() tersedia.
     */
    public function destroy(Karyawan $karyawan)
    {
        // Validasi: karyawan tidak bisa dihapus jika masih terlibat produksi aktif (BR Karyawan)
        if ($karyawan->produksis()->whereIn('status', ['draft', 'proses'])->exists()) {
            return back()->with('error', 'Karyawan tidak dapat dihapus karena masih terlibat dalam produksi aktif.');
        }

        $karyawan->delete();

        return redirect()
            ->route('karyawan.index')
            ->with('success', 'Karyawan berhasil dihapus.');
    }

    /**
     * Export data ke Excel atau PDF.
     */
    public function export(Request $request)
    {
        if ($request->query('format') === 'pdf') {
            $items = Karyawan::orderBy('nama_karyawan')->get();
            $title = 'Laporan Data Karyawan';
            $count = $items->count();
            $pdf = Pdf::loadView('exports.karyawan', compact('items', 'title', 'count'));
            return $pdf->download('karyawan.pdf');
        }

        return Excel::download(new KaryawanExport, 'karyawan.xlsx');
    }

    /**
     * Download template import Excel.
     */
    public function template()
    {
        return Excel::download(new KaryawanTemplateExport, 'template_import_karyawan.xlsx');
    }

    /**
     * Import data dari Excel.
     */
    public function import(Request $request, KaryawanService $service)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv', 'max:2048'],
        ], [
            'file.required' => 'File Excel harus diunggah.',
            'file.mimes' => 'Format file harus berupa .xlsx atau .csv.',
            'file.max' => 'Ukuran file maksimal adalah 2MB.',
        ]);

        try {
            $import = new KaryawanImport($service);
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
