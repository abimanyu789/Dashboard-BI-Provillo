<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Produksi extends Model
{
    protected $table = 'produksi';

    protected $fillable = [
        'pesanan_id',
        'created_by',
        'jenis_produksi',
        'deadline',
        'qty_target',
        'qty_selesai',
        'status',
        'status_qc',
        'catatan',
    ];

    protected $casts = [
        'deadline' => 'date',
        'qty_target' => 'integer',
        'qty_selesai' => 'integer',
    ];

    // ─── Status helpers ──────────────────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isProses(): bool
    {
        return $this->status === 'proses';
    }

    public function isSelesai(): bool
    {
        return $this->status === 'selesai';
    }

    public function isDibatalkan(): bool
    {
        return $this->status === 'dibatalkan';
    }

    /** Produksi aktif = masih draft atau proses */
    public function isAktif(): bool
    {
        return in_array($this->status, ['draft', 'proses']);
    }

    /** Apakah produksi ini dari pesanan (bukan restok) */
    public function isPesanan(): bool
    {
        return $this->jenis_produksi === 'pesanan';
    }

    // ─── Relasi ──────────────────────────────────────────────────────────────

    public function pesanan(): BelongsTo
    {
        return $this->belongsTo(Pesanan::class, 'pesanan_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function detailProduksi(): HasMany
    {
        return $this->hasMany(DetailProduksi::class, 'produksi_id');
    }

    public function produksiItems(): HasMany
    {
        return $this->hasMany(ProduksiItem::class, 'produksi_id');
    }

    public function produksiKaryawans(): HasMany
    {
        return $this->hasMany(ProduksiKaryawan::class, 'produksi_id');
    }

    public function materialMovements(): HasMany
    {
        return $this->hasMany(ProduksiPemakaianBahan::class, 'produksi_id');
    }

    public function defectLedgers(): HasMany
    {
        return $this->hasMany(StokProdukCacat::class, 'produksi_id');
    }
}
