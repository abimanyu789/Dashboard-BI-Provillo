<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
