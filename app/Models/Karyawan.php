<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Karyawan extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'karyawan';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nama_karyawan',
        'jabatan',
        'no_hp',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => 'string',
    ];

    // ─── Relasi ──────────────────────────────────────────────────────────────

    /**
     * Relasi ke tabel produksi via pivot produksi_karyawan.
     *
     * @return BelongsToMany<Produksi, $this>
     */
    public function produksis(): BelongsToMany
    {
        return $this->belongsToMany(Produksi::class, 'produksi_karyawan', 'karyawan_id', 'produksi_id');
    }

    /**
     * @return HasMany<DetailProduksi, $this>
     */
    public function productionProgress(): HasMany
    {
        return $this->hasMany(DetailProduksi::class, 'karyawan_id');
    }
}
