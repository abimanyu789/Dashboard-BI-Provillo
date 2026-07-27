<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Pesanan extends Model
{
    protected $table = 'pesanan';

    protected $fillable = [
        'customer_id',
        'created_by',
        'nomor_pesanan',
        'tanggal',
        'status',
        'jenis_pembayaran',
        'subtotal',
        'diskon',
        'ongkir',
        'total',
        'keterangan',
    ];

    protected $casts = [
        'tanggal'  => 'date',
        'subtotal' => 'decimal:2',
        'diskon'   => 'decimal:2',
        'ongkir'   => 'decimal:2',
        'total'    => 'decimal:2',
    ];

    /**
     * Auto-generate nomor_pesanan saat creating.
     * Format: PSN-{YYYYMMDD}-{urutan 4 digit per hari}
     * Contoh: PSN-20260708-0001
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $pesanan) {
            if (empty($pesanan->nomor_pesanan)) {
                $pesanan->nomor_pesanan = static::generateNomor();
            }
        });
    }

    public static function generateNomor(): string
    {
        $tanggal = now()->format('Ymd');
        $prefix  = "PSN-{$tanggal}-";

        // Lock agar aman dari race condition
        $last = DB::table('pesanan')
            ->where('nomor_pesanan', 'like', "{$prefix}%")
            ->lockForUpdate()
            ->orderByDesc('nomor_pesanan')
            ->value('nomor_pesanan');

        $urutan = $last
            ? (int) substr($last, -4) + 1
            : 1;

        return $prefix . str_pad($urutan, 4, '0', STR_PAD_LEFT);
    }

    // ─── Status helpers ──────────────────────────────────────────────────────

    public function isPending(): bool   { return $this->status === 'pending'; }
    public function isProses(): bool    { return $this->status === 'proses'; }
    public function isSelesai(): bool   { return $this->status === 'selesai'; }
    public function isDibatalkan(): bool { return $this->status === 'dibatalkan'; }

    /** Status selesai/dibatalkan tidak boleh diedit/dihapus (BR-07) */
    public function isLocked(): bool
    {
        return in_array($this->status, ['selesai', 'dibatalkan']);
    }

    // ─── Pembayaran helpers (derived — BR-PBY-11) ─────────────────────────────

    public function totalDibayar(): float
    {
        return (float) $this->pembayarans()->sum('nominal');
    }

    public function sisaTagihan(): float
    {
        return max(0, round((float) $this->total - $this->totalDibayar(), 2));
    }

    public function isLunas(): bool
    {
        return $this->sisaTagihan() <= 0.009 && (float) $this->total > 0;
    }

    /**
     * Status bayar turunan (bukan kolom DB).
     *
     * @return 'belum_bayar'|'sebagian'|'lunas'
     */
    public function statusPembayaran(): string
    {
        $dibayar = $this->totalDibayar();

        if ($dibayar <= 0) {
            return 'belum_bayar';
        }

        if ($dibayar + 0.009 >= (float) $this->total) {
            return 'lunas';
        }

        return 'sebagian';
    }

    // ─── Pengiriman helpers (derived — BR-KIR) ────────────────────────────────

    /**
     * Qty produk yang sudah dikirim untuk pesanan ini.
     *
     * @return array<int, int>  map produk_id => qty_dikirim
     */
    public function qtyDikirimPerProduk(): array
    {
        return StokProdukJadi::query()
            ->where('pesanan_id', $this->id)
            ->where('jenis_transaksi', 'pengiriman')
            ->selectRaw('produk_id, SUM(qty) as total_qty')
            ->groupBy('produk_id')
            ->pluck('total_qty', 'produk_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    public function hasPengiriman(): bool
    {
        return $this->stokProdukJadi()
            ->where('jenis_transaksi', 'pengiriman')
            ->exists();
    }

    public function isFullyShipped(): bool
    {
        $this->loadMissing('detailPesanan');

        if ($this->detailPesanan->isEmpty()) {
            return false;
        }

        $dikirim = $this->qtyDikirimPerProduk();

        foreach ($this->detailPesanan as $detail) {
            $sudah = $dikirim[$detail->produk_id] ?? 0;
            if ($sudah < (int) $detail->qty) {
                return false;
            }
        }

        return true;
    }

    /**
     * Ringkasan progress pengiriman untuk UI detail pesanan.
     * Menampilkan qty dipesan, dikirim, sisa, dan persen.
     *
     * @return array{overall: array, items: array<int, array>}
     */
    public function progressPengiriman(): array
    {
        $this->loadMissing('detailPesanan.produk');

        $dikirimMap = $this->qtyDikirimPerProduk();
        $items = [];
        $totalPesan = 0;
        $totalDikirim = 0;

        foreach ($this->detailPesanan as $detail) {
            $qtyPesan = (int) $detail->qty;
            $qtyDikirim = min($qtyPesan, $dikirimMap[$detail->produk_id] ?? 0);
            $qtySisa = max(0, $qtyPesan - $qtyDikirim);
            $percent = $qtyPesan > 0 ? (int) round(($qtyDikirim / $qtyPesan) * 100) : 0;

            $status = match (true) {
                $qtyDikirim <= 0 => 'belum',
                $qtySisa <= 0 => 'lengkap',
                default => 'sebagian',
            };

            $items[] = [
                'produk_id' => $detail->produk_id,
                'kode_produk' => $detail->produk?->kode_produk,
                'nama_produk' => $detail->produk?->nama_produk,
                'qty_pesan' => $qtyPesan,
                'qty_dikirim' => $qtyDikirim,
                'qty_sisa' => $qtySisa,
                'percent' => $percent,
                'status' => $status,
            ];

            $totalPesan += $qtyPesan;
            $totalDikirim += $qtyDikirim;
        }

        $overallPercent = $totalPesan > 0
            ? (int) round(($totalDikirim / $totalPesan) * 100)
            : 0;

        return [
            'overall' => [
                'qty_pesan' => $totalPesan,
                'qty_dikirim' => $totalDikirim,
                'qty_sisa' => max(0, $totalPesan - $totalDikirim),
                'percent' => $overallPercent,
            ],
            'items' => $items,
        ];
    }

    /**
     * Daftar item yang masih bisa dikirim + stok tersedia.
     * Dipakai form pengiriman stok produk jadi.
     *
     * @return list<array{
     *   produk_id:int, kode_produk:?string, nama_produk:?string,
     *   qty_pesan:int, qty_dikirim:int, qty_sisa:int, stok_tersedia:int
     * }>
     */
    public function sisaPengirimanItems(): array
    {
        $this->loadMissing('detailPesanan.produk');

        $dikirimMap = $this->qtyDikirimPerProduk();
        $items = [];

        foreach ($this->detailPesanan as $detail) {
            $qtyPesan = (int) $detail->qty;
            $qtyDikirim = $dikirimMap[$detail->produk_id] ?? 0;
            $qtySisa = max(0, $qtyPesan - $qtyDikirim);

            if ($qtySisa <= 0) {
                continue;
            }

            $items[] = [
                'produk_id' => $detail->produk_id,
                'kode_produk' => $detail->produk?->kode_produk,
                'nama_produk' => $detail->produk?->nama_produk,
                'qty_pesan' => $qtyPesan,
                'qty_dikirim' => $qtyDikirim,
                'qty_sisa' => $qtySisa,
                'stok_tersedia' => (int) ($detail->produk?->stok ?? 0),
            ];
        }

        return $items;
    }

    // ─── Relasi ──────────────────────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function detailPesanan(): HasMany
    {
        return $this->hasMany(DetailPesanan::class, 'pesanan_id');
    }

    public function produksi(): HasMany
    {
        return $this->hasMany(Produksi::class, 'pesanan_id');
    }

    public function pembayarans(): HasMany
    {
        return $this->hasMany(Pembayaran::class, 'pesanan_id');
    }

    public function stokProdukJadi(): HasMany
    {
        return $this->hasMany(StokProdukJadi::class, 'pesanan_id');
    }
}
