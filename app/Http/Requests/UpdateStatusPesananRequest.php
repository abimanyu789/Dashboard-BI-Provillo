<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStatusPesananRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // R1: 'selesai' dihapus dari input manual — hanya lewat auto-evaluate
        return [
            'status' => ['required', 'string', 'in:pending,proses,dibatalkan'],
        ];
    }

    public function attributes(): array
    {
        return [
            'status' => 'status pesanan',
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Status pesanan harus dipilih.',
            'status.in' => 'Status tidak valid. Status Selesai di-set otomatis saat lunas dan semua produk terkirim.',
        ];
    }
}
