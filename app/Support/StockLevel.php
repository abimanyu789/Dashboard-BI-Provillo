<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Status stok otomatis (computed dari stok vs minimum_stok).
 * Bukan kolom database — dipakai filter index & label UI.
 */
final class StockLevel
{
    /**
     * @var list<string>
     */
    public const STATUSES = ['habis', 'kritis', 'sedang', 'aman'];

    /**
     * @var array<string, string>
     */
    public const LABELS = [
        'habis' => 'Habis',
        'kritis' => 'Kritis',
        'sedang' => 'Sedang',
        'aman' => 'Aman',
    ];

    public static function isValid(?string $status): bool
    {
        return is_string($status) && in_array($status, self::STATUSES, true);
    }

    /**
     * Filter query multi-filtering: digabung dengan search/satuan/BOM lain.
     *
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    public static function applyFilter(Builder $query, ?string $status): void
    {
        if (! self::isValid($status)) {
            return;
        }

        match ($status) {
            'habis' => $query->where('stok', '<=', 0),
            'kritis' => $query
                ->where('stok', '>', 0)
                ->whereNotNull('minimum_stok')
                ->where('minimum_stok', '>', 0)
                ->whereColumn('stok', '<=', 'minimum_stok'),
            'sedang' => $query
                ->where('stok', '>', 0)
                ->whereNotNull('minimum_stok')
                ->where('minimum_stok', '>', 0)
                ->whereColumn('stok', '>', 'minimum_stok')
                ->whereRaw('stok <= minimum_stok * 2'),
            'aman' => $query
                ->where('stok', '>', 0)
                ->where(function (Builder $inner): void {
                    $inner->whereNull('minimum_stok')
                        ->orWhere('minimum_stok', '<=', 0)
                        ->orWhereRaw('stok > minimum_stok * 2');
                }),
            default => null,
        };
    }
}
