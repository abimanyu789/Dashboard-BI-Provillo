<?php

namespace App\Http\Requests;

use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\StokProdukJadi;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class TransaksiProdukRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isPengiriman = $this->input('jenis_transaksi') === 'pengiriman';

        return [
            'jenis_transaksi' => ['required', 'string', 'in:pengiriman,penyesuaian'],
            'pesanan_id' => [
                $isPengiriman ? 'required' : 'nullable',
                'integer',
                'exists:pesanan,id',
            ],
            'items' => ['required', 'array', 'min:1'],
            'items.*.produk_id' => ['required', 'integer', 'exists:produk,id'],
            'items.*.qty' => ['required', 'integer', 'not_in:0'],
            'items.*.keterangan' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            $jenis = $this->input('jenis_transaksi');
            $items = $this->input('items', []);

            // Penyesuaian: keterangan wajib
            if ($jenis === 'penyesuaian') {
                foreach ($items as $i => $item) {
                    if (empty(trim($item['keterangan'] ?? ''))) {
                        $v->errors()->add(
                            "items.{$i}.keterangan",
                            'Keterangan wajib diisi untuk transaksi penyesuaian.'
                        );
                    }
                }

                return;
            }

            // ─── Pengiriman ───────────────────────────────────────────────────
            $pesananId = (int) $this->input('pesanan_id');
            $pesanan = Pesanan::with('detailPesanan.produk')->find($pesananId);

            if (! $pesanan) {
                $v->errors()->add('pesanan_id', 'Pesanan tidak ditemukan.');

                return;
            }

            // BR-KIR-01: pesanan tidak boleh locked
            if ($pesanan->isLocked()) {
                $v->errors()->add(
                    'pesanan_id',
                    "Pesanan {$pesanan->nomor_pesanan} berstatus '{$pesanan->status}' dan tidak bisa dikirim."
                );

                return;
            }

            // Produk yang boleh dikirim = detail pesanan
            $detailMap = $pesanan->detailPesanan->keyBy('produk_id');

            // Qty sudah dikirim per produk
            $dikirimMap = StokProdukJadi::query()
                ->where('pesanan_id', $pesanan->id)
                ->where('jenis_transaksi', 'pengiriman')
                ->selectRaw('produk_id, SUM(qty) as total_qty')
                ->groupBy('produk_id')
                ->pluck('total_qty', 'produk_id')
                ->map(fn ($val) => (int) $val)
                ->all();

            // Cegah duplikat produk dalam 1 request (H13)
            $seen = [];
            $requestQtyPerProduk = [];

            foreach ($items as $i => $item) {
                $produkId = (int) ($item['produk_id'] ?? 0);
                $qty = (int) ($item['qty'] ?? 0);

                if ($produkId === 0) {
                    continue;
                }

                if (isset($seen[$produkId])) {
                    $v->errors()->add(
                        "items.{$i}.produk_id",
                        'Produk duplikat dalam satu transaksi. Gabungkan qty ke satu baris.'
                    );
                    continue;
                }
                $seen[$produkId] = true;

                // BR-KIR-02: produk harus ada di detail pesanan
                if (! $detailMap->has($produkId)) {
                    $v->errors()->add(
                        "items.{$i}.produk_id",
                        'Produk tidak termasuk dalam pesanan yang dipilih.'
                    );
                    continue;
                }

                // Pengiriman qty harus positif
                if ($qty <= 0) {
                    $v->errors()->add(
                        "items.{$i}.qty",
                        'Qty pengiriman harus lebih dari 0.'
                    );
                    continue;
                }

                $qtyPesan = (int) $detailMap->get($produkId)->qty;
                $qtyDikirim = $dikirimMap[$produkId] ?? 0;
                $qtySisa = max(0, $qtyPesan - $qtyDikirim);

                // BR-KIR-03: qty ≤ sisa kirim
                if ($qty > $qtySisa) {
                    $nama = $detailMap->get($produkId)->produk?->nama_produk ?? "ID {$produkId}";
                    $v->errors()->add(
                        "items.{$i}.qty",
                        "Qty pengiriman {$nama} melebihi sisa. Sisa: {$qtySisa} (dipesan {$qtyPesan}, sudah dikirim {$qtyDikirim})."
                    );
                    continue;
                }

                // BR-KIR-04: qty ≤ stok tersedia
                $produk = Produk::find($produkId);
                $stok = (int) ($produk?->stok ?? 0);
                if ($qty > $stok) {
                    $nama = $produk?->nama_produk ?? "ID {$produkId}";
                    $v->errors()->add(
                        "items.{$i}.qty",
                        "Stok {$nama} tidak mencukupi. Tersedia: {$stok}, diminta: {$qty}."
                    );
                }

                $requestQtyPerProduk[$produkId] = ($requestQtyPerProduk[$produkId] ?? 0) + $qty;
            }
        });
    }

    public function attributes(): array
    {
        $attrs = [
            'jenis_transaksi' => 'jenis transaksi',
            'pesanan_id' => 'pesanan',
            'items' => 'daftar item',
        ];

        $items = $this->input('items', []);
        foreach (array_keys($items) as $i) {
            $attrs["items.{$i}.produk_id"] = 'produk baris '.($i + 1);
            $attrs["items.{$i}.qty"] = 'jumlah baris '.($i + 1);
            $attrs["items.{$i}.keterangan"] = 'keterangan baris '.($i + 1);
        }

        return $attrs;
    }

    public function messages(): array
    {
        return [
            'jenis_transaksi.required' => 'Jenis transaksi harus dipilih.',
            'jenis_transaksi.in' => 'Jenis transaksi tidak valid.',
            'pesanan_id.required' => 'Pesanan wajib dipilih untuk pengiriman.',
            'pesanan_id.exists' => 'Pesanan tidak ditemukan.',
            'items.required' => 'Minimal satu item harus ditambahkan.',
            'items.min' => 'Minimal satu item harus ditambahkan.',
            'items.*.produk_id.required' => 'Produk harus dipilih.',
            'items.*.produk_id.exists' => 'Produk tidak ditemukan.',
            'items.*.qty.required' => 'Jumlah harus diisi.',
            'items.*.qty.not_in' => 'Jumlah tidak boleh nol.',
        ];
    }
}
