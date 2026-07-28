<?php

namespace App\Http\Controllers;

use App\Models\Pesanan;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $filter = $request->query('filter', 'bulan_ini');
        $startDate = $request->query('start_date', '');
        $endDate = $request->query('end_date', '');

        // Stat Cards
        $totalPemasukan = $this->getFinancialStat('pemasukan', $filter, $startDate, $endDate);
        $totalPengeluaran = $this->getFinancialStat('pengeluaran', $filter, $startDate, $endDate);
        $pesananAktif = $this->getPesananAktif();
        $produksiBerjalan = $this->getProduksiBerjalan();
        $selesaiProduksi = $this->getSelesaiProduksi($filter, $startDate, $endDate);
        $saldo = $this->getSaldoStat($filter, $startDate, $endDate);

        // Financial Chart (12 bulan terakhir)
        $financialChart = $this->getFinancialChart();

        // Best Sellers (top 5 produk)
        $bestSellers = $this->getBestSellers($filter, $startDate, $endDate);

        // Active Orders Progress
        $activeOrders = $this->getActiveOrders();

        // Top Employee Performance
        $topEmployees = $this->getTopEmployees();
        $operationalIndicators = $this->getOperationalIndicators();

        return Inertia::render('dashboard', [
            'stats' => [
                'totalPemasukan' => $totalPemasukan,
                'totalPengeluaran' => $totalPengeluaran,
                'saldo' => $saldo,
                'pesananAktif' => $pesananAktif,
                'produksiBerjalan' => $produksiBerjalan,
                'selesaiProduksi' => $selesaiProduksi,
            ],
            'financialChart' => $financialChart,
            'bestSellers' => $bestSellers,
            'activeOrders' => $activeOrders,
            'topEmployees' => $topEmployees,
            'operationalIndicators' => $operationalIndicators,
            'filter' => $filter,
        ]);
    }

    private function getFinancialStat(string $jenis, string $filter, string $startDate = '', string $endDate = ''): array
    {
        if (! Schema::hasTable('arus_kas')) {
            return ['value' => 0, 'percentage' => null];
        }

        try {
            $currentQuery = DB::table('arus_kas')->where('jenis', $jenis);
            $previousQuery = DB::table('arus_kas')->where('jenis', $jenis);

            if ($filter === 'range' && $startDate && $endDate) {
                $start = Carbon::parse($startDate)->startOfDay();
                $end = Carbon::parse($endDate)->endOfDay();
                $diffInDays = $start->diffInDays($end) + 1;

                $currentQuery->whereBetween('tanggal', [$start, $end]);

                $prevStart = $start->copy()->subDays($diffInDays);
                $prevEnd = $end->copy()->subDays($diffInDays);
                $previousQuery->whereBetween('tanggal', [$prevStart, $prevEnd]);
            } elseif ($filter === 'bulan_ini') {
                $currentQuery->whereMonth('tanggal', now()->month)->whereYear('tanggal', now()->year);
                $previousQuery->whereMonth('tanggal', now()->subMonth()->month)->whereYear('tanggal', now()->subMonth()->year);
            } elseif ($filter === 'tahun_ini') {
                $currentQuery->whereYear('tanggal', now()->year);
                $previousQuery->whereYear('tanggal', now()->subYear()->year);
            } else {
                return [
                    'value' => (float) $currentQuery->sum('nominal'),
                    'percentage' => null,
                ];
            }

            $currentValue = (float) $currentQuery->sum('nominal');
            $previousValue = (float) $previousQuery->sum('nominal');

            $percentage = null;
            if ($previousValue > 0) {
                $percentage = (($currentValue - $previousValue) / $previousValue) * 100;
            } elseif ($currentValue > 0) {
                $percentage = 100;
            } else {
                $percentage = 0;
            }

            return [
                'value' => $currentValue,
                'percentage' => $percentage,
            ];
        } catch (\Exception $e) {
            return ['value' => 0, 'percentage' => null];
        }
    }

    private function getSaldoStat(string $filter, string $startDate = '', string $endDate = ''): array
    {
        if (! Schema::hasTable('arus_kas')) {
            return ['value' => 0, 'percentage' => null];
        }

        try {
            $currentValue = (float) (DB::table('arus_kas')->where('jenis', 'pemasukan')->sum('nominal') - DB::table('arus_kas')->where('jenis', 'pengeluaran')->sum('nominal'));

            if ($filter === 'semua') {
                return ['value' => $currentValue, 'percentage' => null];
            }

            $prevPem = DB::table('arus_kas')->where('jenis', 'pemasukan');
            $prevPeng = DB::table('arus_kas')->where('jenis', 'pengeluaran');

            if ($filter === 'range' && $startDate && $endDate) {
                $start = Carbon::parse($startDate)->startOfDay();
                $prevPem->where('tanggal', '<', $start);
                $prevPeng->where('tanggal', '<', $start);
            } elseif ($filter === 'bulan_ini') {
                $prevPem->where('tanggal', '<', now()->startOfMonth());
                $prevPeng->where('tanggal', '<', now()->startOfMonth());
            } elseif ($filter === 'tahun_ini') {
                $prevPem->where('tanggal', '<', now()->startOfYear());
                $prevPeng->where('tanggal', '<', now()->startOfYear());
            }

            $previousValue = (float) ($prevPem->sum('nominal') - $prevPeng->sum('nominal'));

            $percentage = null;
            if ($previousValue > 0) {
                $percentage = (($currentValue - $previousValue) / $previousValue) * 100;
            } elseif ($currentValue > 0) {
                $percentage = 100;
            } else {
                $percentage = 0;
            }

            return [
                'value' => $currentValue,
                'percentage' => $percentage,
            ];
        } catch (\Exception $e) {
            return ['value' => 0, 'percentage' => null];
        }
    }

    private function getPesananAktif(): int
    {
        if (! Schema::hasTable('pesanan')) {
            return 0;
        }

        try {
            return DB::table('pesanan')
                ->whereIn('status', ['pending', 'proses'])
                ->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getProduksiBerjalan(): int
    {
        if (! Schema::hasTable('produksi')) {
            return 0;
        }

        try {
            return DB::table('produksi')
                ->where('status', 'proses')
                ->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getSelesaiProduksi(string $filter, string $startDate = '', string $endDate = ''): int
    {
        if (! Schema::hasTable('produksi')) {
            return 0;
        }

        try {
            $query = DB::table('produksi');

            if ($filter === 'range' && $startDate && $endDate) {
                $start = Carbon::parse($startDate)->startOfDay();
                $end = Carbon::parse($endDate)->endOfDay();
                $query->whereBetween('updated_at', [$start, $end]);
            } elseif ($filter === 'bulan_ini') {
                $query->whereMonth('updated_at', now()->month)
                    ->whereYear('updated_at', now()->year);
            } elseif ($filter === 'tahun_ini') {
                $query->whereYear('updated_at', now()->year);
            }

            return (int) $query->sum('qty_selesai');
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getFinancialChart(): array
    {
        if (! Schema::hasTable('arus_kas')) {
            return $this->getDefaultFinancialChart();
        }

        try {
            $data = DB::table('arus_kas')
                ->select(
                    DB::raw('DATE_FORMAT(tanggal, "%Y-%m") as bulan'),
                    DB::raw('SUM(CASE WHEN jenis = "pemasukan" THEN nominal ELSE 0 END) as pemasukan'),
                    DB::raw('SUM(CASE WHEN jenis = "pengeluaran" THEN nominal ELSE 0 END) as pengeluaran')
                )
                ->where('tanggal', '>=', now()->subMonths(11)->startOfMonth())
                ->groupBy('bulan')
                ->orderBy('bulan')
                ->get();

            // Fill missing months with zero
            $result = [];
            for ($i = 11; $i >= 0; $i--) {
                $month = now()->subMonths($i);
                $monthKey = $month->format('Y-m');
                $monthName = $month->locale('id')->format('M Y');

                $found = $data->firstWhere('bulan', $monthKey);

                $result[] = [
                    'bulan' => $monthName,
                    'pemasukan' => $found ? (float) $found->pemasukan : 0,
                    'pengeluaran' => $found ? (float) $found->pengeluaran : 0,
                ];
            }

            return $result;
        } catch (\Exception $e) {
            return $this->getDefaultFinancialChart();
        }
    }

    private function getDefaultFinancialChart(): array
    {
        $result = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $result[] = [
                'bulan' => $month->locale('id')->format('M Y'),
                'pemasukan' => 0,
                'pengeluaran' => 0,
            ];
        }

        return $result;
    }

    private function getBestSellers(string $filter, string $startDate = '', string $endDate = ''): array
    {
        if (! Schema::hasTable('detail_pesanan') || ! Schema::hasTable('produk') || ! Schema::hasTable('pesanan')) {
            return [];
        }

        try {
            $query = DB::table('detail_pesanan')
                ->join('produk', 'detail_pesanan.produk_id', '=', 'produk.id')
                ->join('pesanan', 'detail_pesanan.pesanan_id', '=', 'pesanan.id')
                ->select(
                    'produk.nama_produk',
                    DB::raw('SUM(detail_pesanan.qty) as total_qty')
                );

            if ($filter === 'range' && $startDate && $endDate) {
                $start = Carbon::parse($startDate)->startOfDay();
                $end = Carbon::parse($endDate)->endOfDay();
                $query->whereBetween('pesanan.tanggal', [$start, $end]);
            } elseif ($filter === 'bulan_ini') {
                $query->whereMonth('pesanan.tanggal', now()->month)
                    ->whereYear('pesanan.tanggal', now()->year);
            } elseif ($filter === 'tahun_ini') {
                $query->whereYear('pesanan.tanggal', now()->year);
            }

            return $query->groupBy('produk.id', 'produk.nama_produk')
                ->orderByDesc('total_qty')
                ->limit(5)
                ->get()
                ->map(fn ($item) => [
                    'nama_produk' => $item->nama_produk,
                    'total_qty' => (int) $item->total_qty,
                ])
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getActiveOrders(): array
    {
        if (! Schema::hasTable('pesanan') || ! Schema::hasTable('customer')) {
            return [];
        }

        try {
            $orders = DB::table('pesanan')
                ->join('customer', 'pesanan.customer_id', '=', 'customer.id')
                ->select(
                    'pesanan.id',
                    'pesanan.nomor_pesanan',
                    'customer.nama_customer',
                    'pesanan.status',
                    'pesanan.tanggal',
                    'pesanan.total'
                )
                ->whereIn('pesanan.status', ['pending', 'proses'])
                ->orderBy('pesanan.tanggal', 'desc')
                ->limit(5)
                ->get();

            // Calculate progress from produksi if table exists
            return $orders->map(function ($order) {
                $progress = 0;
                $statusProduksi = 'Belum Dimulai';

                if (Schema::hasTable('produksi')) {
                    try {
                        $produksi = DB::table('produksi')
                            ->where('pesanan_id', $order->id)
                            ->first();

                        if ($produksi) {
                            $statusProduksi = ucfirst($produksi->status);
                            if ($produksi->qty_target > 0) {
                                $progress = round(($produksi->qty_selesai / $produksi->qty_target) * 100);
                            }
                        }
                    } catch (\Exception $e) {
                        // Ignore error
                    }
                }

                return [
                    'id' => $order->id,
                    'nomor_pesanan' => $order->nomor_pesanan,
                    'nama_customer' => $order->nama_customer,
                    'status' => $order->status,
                    'status_produksi' => $statusProduksi,
                    'tanggal' => $order->tanggal,
                    'total' => (float) $order->total,
                    'progress' => $progress,
                ];
            })->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getTopEmployees(): array
    {
        if (! Schema::hasTable('detail_produksi') || ! Schema::hasColumn('detail_produksi', 'karyawan_id')) {
            return [];
        }

        return DB::table('detail_produksi')
            ->join('karyawan', 'detail_produksi.karyawan_id', '=', 'karyawan.id')
            ->whereNotNull('detail_produksi.karyawan_id')
            ->where('detail_produksi.qc_status', 'lolos')
            ->select(
                'karyawan.id',
                'karyawan.nama_karyawan',
                'karyawan.jabatan',
                DB::raw('SUM(detail_produksi.qty_selesai) as total_output'),
            )
            ->groupBy('karyawan.id', 'karyawan.nama_karyawan', 'karyawan.jabatan')
            ->orderByDesc('total_output')
            ->limit(3)
            ->get()
            ->map(fn ($item): array => [
                'nama_karyawan' => $item->nama_karyawan,
                'jabatan' => $item->jabatan ?? 'Karyawan',
                'total_output' => (int) $item->total_output,
            ])
            ->all();
    }

    /**
     * @return array{
     *     activeRework: int,
     *     failedQcQty: int,
     *     productionsWithShortage: int,
     *     outstandingReceivables: float,
     *     ordersNotFullyShipped: int
     * }
     */
    private function getOperationalIndicators(): array
    {
        if (! Schema::hasTable('produksi_pemakaian_bahan')) {
            return [
                'activeRework' => 0,
                'failedQcQty' => 0,
                'productionsWithShortage' => 0,
                'outstandingReceivables' => 0.0,
                'ordersNotFullyShipped' => 0,
            ];
        }

        $activeRework = DB::table('detail_produksi as failed')
            ->leftJoin('detail_produksi as result', 'result.rework_parent_id', '=', 'failed.id')
            ->where('failed.qc_status', 'tidak_lolos')
            ->where('failed.disposisi_qc', 'rework')
            ->groupBy('failed.id', 'failed.qty_selesai')
            ->selectRaw(
                'failed.qty_selesai as failed_qty, COALESCE(SUM(result.qty_selesai), 0) as processed_qty'
            )
            ->get()
            ->sum(
                fn ($row): int => max(0, (int) $row->failed_qty - (int) $row->processed_qty)
            );

        $productionsWithShortage = DB::query()
            ->fromSub(
                DB::table('produksi_pemakaian_bahan')
                    ->join('produksi', 'produksi_pemakaian_bahan.produksi_id', '=', 'produksi.id')
                    ->join('bahan_baku', 'produksi_pemakaian_bahan.bahan_baku_id', '=', 'bahan_baku.id')
                    ->where('produksi.status', 'proses')
                    ->groupBy(
                        'produksi_pemakaian_bahan.produksi_id',
                        'produksi_pemakaian_bahan.bahan_baku_id',
                    )
                    ->havingRaw(
                        "SUM(CASE WHEN movement_type = 'planned' THEN qty ELSE 0 END) > "
                        ."SUM(CASE WHEN movement_type IN ('issued', 'additional') THEN qty "
                        ."WHEN movement_type = 'returned' THEN -qty ELSE 0 END) + MAX(bahan_baku.stok)"
                    )
                    ->select('produksi_pemakaian_bahan.produksi_id'),
                'shortages',
            )
            ->distinct()
            ->count('produksi_id');

        $outstandingReceivables = DB::table('pesanan')
            ->leftJoin('pembayaran', 'pembayaran.pesanan_id', '=', 'pesanan.id')
            ->where('pesanan.status', '!=', 'dibatalkan')
            ->groupBy('pesanan.id', 'pesanan.total')
            ->selectRaw(
                'pesanan.total as order_total, COALESCE(SUM(pembayaran.nominal), 0) as paid_total'
            )
            ->get()
            ->sum(
                fn ($row): float => max(0.0, (float) $row->order_total - (float) $row->paid_total)
            );

        $ordersNotFullyShipped = Pesanan::query()
            ->whereIn('status', ['pending', 'proses'])
            ->with('detailPesanan')
            ->get()
            ->filter(fn (Pesanan $pesanan): bool => ! $pesanan->isFullyShipped())
            ->count();

        return [
            'activeRework' => (int) $activeRework,
            'failedQcQty' => (int) DB::table('detail_produksi')
                ->where('qc_status', 'tidak_lolos')
                ->sum('qty_selesai'),
            'productionsWithShortage' => $productionsWithShortage,
            'outstandingReceivables' => (float) $outstandingReceivables,
            'ordersNotFullyShipped' => $ordersNotFullyShipped,
        ];
    }
}
