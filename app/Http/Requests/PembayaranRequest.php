<?php

namespace App\Http\Requests;

use App\Models\Pesanan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PembayaranRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tanggal' => ['required', 'date'],
            'jenis_pembayaran' => ['required', 'string', 'in:dp,pelunasan,termin'],
            'nominal' => ['required', 'numeric', 'min:0.01'],
            'metode' => ['nullable', 'string', 'max:100'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            /** @var Pesanan|null $pesanan */
            $pesanan = $this->route('pesanan');

            if (! $pesanan instanceof Pesanan) {
                $v->errors()->add('nominal', 'Pesanan tidak valid.');

                return;
            }

            if ($pesanan->isLocked()) {
                $v->errors()->add(
                    'nominal',
                    "Pesanan berstatus '{$pesanan->status}' tidak menerima pembayaran baru."
                );

                return;
            }

            $sisa = $pesanan->sisaTagihan();
            $nominal = (float) $this->input('nominal');

            // BR-PBY-10: nominal tidak boleh melebihi sisa tagihan
            if ($nominal - $sisa > 0.009) {
                $formatted = number_format($sisa, 0, ',', '.');
                $v->errors()->add(
                    'nominal',
                    "Nominal melebihi sisa tagihan. Sisa: Rp {$formatted}."
                );
            }
        });
    }

    public function attributes(): array
    {
        return [
            'tanggal' => 'tanggal pembayaran',
            'jenis_pembayaran' => 'jenis pembayaran',
            'nominal' => 'nominal',
            'metode' => 'metode pembayaran',
            'keterangan' => 'keterangan',
        ];
    }

    public function messages(): array
    {
        return [
            'tanggal.required' => 'Tanggal pembayaran harus diisi.',
            'jenis_pembayaran.required' => 'Jenis pembayaran harus dipilih.',
            'jenis_pembayaran.in' => 'Jenis pembayaran tidak valid.',
            'nominal.required' => 'Nominal harus diisi.',
            'nominal.min' => 'Nominal harus lebih dari 0.',
        ];
    }
}
