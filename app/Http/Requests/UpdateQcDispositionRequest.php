<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateQcDispositionRequest extends FormRequest
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
            'alasan_qc' => ['required', 'string', 'max:2000'],
            'disposisi_qc' => [
                'required',
                'string',
                Rule::in(['rework', 'jual_cacat', 'dimusnahkan']),
            ],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'alasan_qc.required' => 'Alasan kegagalan QC wajib diisi.',
            'disposisi_qc.required' => 'Disposisi QC wajib dipilih.',
            'disposisi_qc.in' => 'Disposisi QC tidak valid.',
        ];
    }
}
