<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InputProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'produk_id' => ['required', 'integer', 'exists:produk,id'],
            'karyawan_id' => ['required', 'integer', 'exists:karyawan,id'],
            'qty' => ['required', 'integer', 'min:1'],
            'qc_status' => ['required', 'string', Rule::in(['lolos', 'tidak_lolos'])],
            'alasan_qc' => [
                Rule::requiredIf($this->string('qc_status')->toString() === 'tidak_lolos'),
                'nullable',
                'string',
                'max:2000',
            ],
            'disposisi_qc' => [
                Rule::requiredIf($this->string('qc_status')->toString() === 'tidak_lolos'),
                'nullable',
                'string',
                Rule::in(['rework', 'jual_cacat', 'dimusnahkan']),
            ],
            'rework_parent_id' => [
                'nullable',
                'integer',
                'exists:detail_produksi,id',
            ],
            'catatan' => ['nullable', 'string', 'max:2000'],
            'idempotency_key' => ['required', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'produk_id.required' => 'Produk harus dipilih.',
            'produk_id.exists' => 'Produk tidak ditemukan.',
            'karyawan_id.required' => 'Karyawan pelaksana harus dipilih.',
            'karyawan_id.exists' => 'Karyawan tidak ditemukan.',
            'qty.required' => 'Jumlah progress harus diisi.',
            'qty.min' => 'Jumlah progress harus lebih dari 0.',
            'qc_status.required' => 'Status QC harus dipilih.',
            'qc_status.in' => 'Status QC tidak valid.',
            'alasan_qc.required' => 'Alasan kegagalan QC wajib diisi.',
            'disposisi_qc.required' => 'Disposisi QC wajib dipilih.',
            'disposisi_qc.in' => 'Disposisi QC tidak valid.',
            'rework_parent_id.exists' => 'Data rework asal tidak ditemukan.',
            'idempotency_key.uuid' => 'Kunci idempotensi tidak valid.',
        ];
    }
}
