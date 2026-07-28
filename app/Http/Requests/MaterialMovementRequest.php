<?php

namespace App\Http\Requests;

use App\Models\BahanBaku;
use App\Models\Produksi;
use App\Models\ProduksiPemakaianBahan;
use App\Services\ProduksiMaterialService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class MaterialMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'bahan_baku_id' => ['required', 'integer', 'exists:bahan_baku,id'],
            'movement_type' => [
                'required',
                'string',
                Rule::in(['issued', 'consumed', 'additional', 'returned', 'adjustment']),
            ],
            'qty' => ['required', 'numeric', 'not_in:0'],
            'tanggal' => ['required', 'date'],
            'keterangan' => [
                Rule::requiredIf($this->string('movement_type')->toString() === 'adjustment'),
                'nullable',
                'string',
                'max:2000',
            ],
            'idempotency_key' => ['required', 'uuid'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var Produksi|null $produksi */
            $produksi = $this->route('produksi');

            if (! $produksi instanceof Produksi) {
                return;
            }

            $movementType = $this->string('movement_type')->toString();
            $bahanBakuId = (int) $this->input('bahan_baku_id');

            // issued / consumed / returned / additional harus bahan pada rencana BOM produksi ini.
            // adjustment tetap dibatasi ke bahan yang sudah punya riwayat di produksi agar audit jelas.
            $allowedIds = ProduksiPemakaianBahan::query()
                ->where('produksi_id', $produksi->id)
                ->pluck('bahan_baku_id')
                ->map(fn ($id): int => (int) $id)
                ->unique()
                ->all();

            if ($allowedIds === []) {
                $validator->errors()->add(
                    'bahan_baku_id',
                    'Rencana bahan produksi belum tersedia. Mulai produksi dulu atau pastikan BOM valid.',
                );

                return;
            }

            if (! in_array($bahanBakuId, $allowedIds, true)) {
                $validator->errors()->add(
                    'bahan_baku_id',
                    'Bahan baku di luar kebutuhan BOM produksi ini tidak diizinkan.',
                );

                return;
            }

            // Batas qty per jenis pergerakan (sumber sisa rencana = materialSummary.shortage).
            // Service tetap menjadi penegak akhir anti-bypass / race condition.
            $this->validateQuantityLimits(
                $validator,
                $produksi,
                $bahanBakuId,
                $movementType,
                (float) $this->input('qty'),
            );
        });
    }

    private function validateQuantityLimits(
        Validator $validator,
        Produksi $produksi,
        int $bahanBakuId,
        string $movementType,
        float $qty,
    ): void {
        if (in_array($movementType, ['adjustment'], true)) {
            return;
        }

        if ($qty <= 0) {
            return;
        }

        /** @var ProduksiMaterialService $materialService */
        $materialService = app(ProduksiMaterialService::class);
        $summary = collect($materialService->materialSummary($produksi))
            ->firstWhere('id', $bahanBakuId);

        if (! is_array($summary)) {
            return;
        }

        $available = (float) ($summary['available'] ?? 0);
        $remainingPlanned = (float) ($summary['shortage'] ?? 0);
        $returnable = (float) ($summary['returnable'] ?? 0);
        $epsilon = 0.00001;

        if ($movementType === 'issued') {
            if ($remainingPlanned <= $epsilon) {
                $validator->errors()->add(
                    'movement_type',
                    'Kebutuhan bahan berdasarkan rencana sudah terpenuhi.',
                );
                $validator->errors()->add(
                    'qty',
                    'Kebutuhan bahan berdasarkan rencana sudah terpenuhi. Gunakan Bahan Tambahan Dikeluarkan untuk kelebihan di luar rencana.',
                );

                return;
            }

            $maxIssued = min($remainingPlanned, max(0.0, $available));

            if ($qty - $maxIssued > $epsilon) {
                $validator->errors()->add(
                    'qty',
                    'Jumlah Bahan Dikeluarkan melebihi batas. '
                    ."Maksimum: {$maxIssued} (sisa rencana {$remainingPlanned}, stok gudang {$available}). "
                    .'Gunakan Bahan Tambahan Dikeluarkan untuk kelebihan di luar rencana.',
                );
            }

            return;
        }

        if ($movementType === 'additional') {
            if ($qty - max(0.0, $available) > $epsilon) {
                $bahan = BahanBaku::query()->find($bahanBakuId);
                $nama = $bahan?->nama_bahan ?? 'bahan baku';
                $validator->errors()->add(
                    'qty',
                    "Stok {$nama} tidak mencukupi. Tersedia: {$available}, diminta: {$qty}.",
                );
            }

            return;
        }

        if (in_array($movementType, ['consumed', 'returned'], true)) {
            if ($returnable <= $epsilon) {
                $label = $movementType === 'consumed'
                    ? 'Bahan Terpakai'
                    : 'Bahan Dikembalikan';
                $validator->errors()->add(
                    'qty',
                    "Tidak ada sisa bahan yang dapat dicatat sebagai {$label}.",
                );

                return;
            }

            if ($qty - $returnable > $epsilon) {
                $label = $movementType === 'consumed'
                    ? 'Bahan Terpakai'
                    : 'Bahan Dikembalikan';
                $validator->errors()->add(
                    'qty',
                    "Jumlah {$label} melebihi bahan yang masih dapat diproses. Maksimum: {$returnable}.",
                );
            }
        }
    }

    public function messages(): array
    {
        return [
            'bahan_baku_id.required' => 'Bahan baku harus dipilih.',
            'bahan_baku_id.exists' => 'Bahan baku tidak ditemukan.',
            'movement_type.in' => 'Jenis pergerakan bahan tidak valid.',
            'qty.not_in' => 'Jumlah pergerakan tidak boleh nol.',
            'keterangan.required' => 'Alasan penyesuaian wajib diisi.',
            'idempotency_key.uuid' => 'Kunci idempotensi tidak valid.',
        ];
    }
}
