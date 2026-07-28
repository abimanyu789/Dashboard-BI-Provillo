<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $produksi_id
 * @property int $bahan_baku_id
 * @property string $movement_type
 * @property float $qty
 * @property int $created_by
 * @property string $idempotency_key
 * @property BahanBaku $bahanBaku
 */
class ProduksiPemakaianBahan extends Model
{
    protected $table = 'produksi_pemakaian_bahan';

    protected $fillable = [
        'produksi_id',
        'bahan_baku_id',
        'movement_type',
        'qty',
        'tanggal',
        'keterangan',
        'created_by',
        'idempotency_key',
    ];

    protected $casts = [
        'qty' => 'float',
        'tanggal' => 'date',
    ];

    /** @return BelongsTo<Produksi, $this> */
    public function produksi(): BelongsTo
    {
        return $this->belongsTo(Produksi::class, 'produksi_id');
    }

    /** @return BelongsTo<BahanBaku, $this> */
    public function bahanBaku(): BelongsTo
    {
        return $this->belongsTo(BahanBaku::class, 'bahan_baku_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return HasOne<StokBahanBaku, $this> */
    public function stokHistory(): HasOne
    {
        return $this->hasOne(StokBahanBaku::class, 'produksi_pemakaian_bahan_id');
    }
}
