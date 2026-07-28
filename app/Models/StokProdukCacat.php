<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $detail_produksi_id
 * @property int $produksi_id
 * @property int $produk_id
 * @property string $disposisi
 * @property int $qty
 * @property string $alasan_qc
 * @property int $created_by
 */
class StokProdukCacat extends Model
{
    protected $table = 'stok_produk_cacat';

    protected $fillable = [
        'detail_produksi_id',
        'produksi_id',
        'produk_id',
        'disposisi',
        'qty',
        'alasan_qc',
        'catatan',
        'created_by',
    ];

    protected $casts = [
        'qty' => 'integer',
    ];

    /** @return BelongsTo<DetailProduksi, $this> */
    public function detailProduksi(): BelongsTo
    {
        return $this->belongsTo(DetailProduksi::class, 'detail_produksi_id');
    }

    /** @return BelongsTo<Produksi, $this> */
    public function produksi(): BelongsTo
    {
        return $this->belongsTo(Produksi::class, 'produksi_id');
    }

    /** @return BelongsTo<Produk, $this> */
    public function produk(): BelongsTo
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
