<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkMaterialIssueRequest extends FormRequest
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
            'tanggal' => ['required', 'date'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
            'request_key' => ['required', 'uuid'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.bahan_baku_id' => [
                'required',
                'integer',
                'exists:bahan_baku,id',
                'distinct',
            ],
            'items.*.qty' => ['required', 'numeric', 'min:0'],
            'items.*.idempotency_key' => ['required', 'uuid', 'distinct'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Minimal satu bahan harus dipilih untuk dikeluarkan.',
            'items.min' => 'Minimal satu bahan harus dipilih untuk dikeluarkan.',
            'items.*.bahan_baku_id.required' => 'Bahan baku wajib dipilih.',
            'items.*.bahan_baku_id.exists' => 'Bahan baku tidak ditemukan.',
            'items.*.bahan_baku_id.distinct' => 'Bahan baku tidak boleh duplikat dalam satu pengeluaran massal.',
            'items.*.qty.required' => 'Jumlah pengeluaran wajib diisi.',
            'items.*.qty.min' => 'Jumlah pengeluaran tidak boleh negatif.',
            'items.*.idempotency_key.required' => 'Kunci idempotensi per item wajib diisi.',
            'items.*.idempotency_key.distinct' => 'Kunci idempotensi per item harus unik.',
            'request_key.uuid' => 'Kunci permintaan massal tidak valid.',
        ];
    }
}
