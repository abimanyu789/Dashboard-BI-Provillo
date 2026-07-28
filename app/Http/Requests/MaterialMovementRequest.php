<?php

namespace App\Http\Requests;

use App\Models\Produksi;
use App\Models\ProduksiPemakaianBahan;
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
            }

            // Catatan: penegakan stok negatif & max returnable tetap di service.
            unset($movementType);
        });
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
