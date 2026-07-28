<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DetailProduksi extends Model
{
    protected $table = 'detail_produksi';

    protected $fillable = [
        'produksi_id',
        'produk_id',
        'karyawan_id',
        'qty_selesai',
        'qc_status',
        'alasan_qc',
        'disposisi_qc',
        'rework_parent_id',
        'catatan',
        'inspected_by',
        'inspected_at',
        'idempotency_key',
    ];

    protected $casts = [
        'qty_selesai' => 'integer',
        'produk_id' => 'integer',
        'karyawan_id' => 'integer',
        'rework_parent_id' => 'integer',
        'inspected_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Produksi, $this>
     */
    public function produksi(): BelongsTo
    {
        return $this->belongsTo(Produksi::class, 'produksi_id');
    }

    /**
     * @return BelongsTo<Produk, $this>
     */
    public function produk(): BelongsTo
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }

    /**
     * @return BelongsTo<Karyawan, $this>
     */
    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class, 'karyawan_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    /**
     * @return BelongsTo<DetailProduksi, $this>
     */
    public function reworkParent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'rework_parent_id');
    }

    /**
     * @return HasMany<DetailProduksi, $this>
     */
    public function reworkResults(): HasMany
    {
        return $this->hasMany(self::class, 'rework_parent_id');
    }

    /**
     * @return HasOne<StokProdukJadi, $this>
     */
    public function stokHistory(): HasOne
    {
        return $this->hasOne(StokProdukJadi::class, 'detail_produksi_id');
    }

    /**
     * @return HasOne<StokProdukCacat, $this>
     */
    public function defectLedger(): HasOne
    {
        return $this->hasOne(StokProdukCacat::class, 'detail_produksi_id');
    }
}
