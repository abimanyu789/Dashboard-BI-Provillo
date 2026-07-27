<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stok_produk_jadi', function (Blueprint $table) {
            // Nullable: hanya diisi saat jenis_transaksi = pengiriman
            $table->foreignId('pesanan_id')
                ->nullable()
                ->after('produk_id')
                ->constrained('pesanan')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('stok_produk_jadi', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pesanan_id');
        });
    }
};
