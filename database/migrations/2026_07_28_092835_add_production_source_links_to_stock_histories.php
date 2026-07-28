<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stok_bahan_baku', function (Blueprint $table) {
            $table->foreignId('produksi_pemakaian_bahan_id')
                ->nullable()
                ->unique()
                ->after('bahan_baku_id')
                ->constrained('produksi_pemakaian_bahan')
                ->restrictOnDelete();
            $table->foreignId('created_by')
                ->nullable()
                ->after('keterangan')
                ->constrained('users')
                ->restrictOnDelete();
        });

        Schema::table('stok_produk_jadi', function (Blueprint $table) {
            $table->foreignId('detail_produksi_id')
                ->nullable()
                ->unique()
                ->after('produk_id')
                ->constrained('detail_produksi')
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stok_produk_jadi', function (Blueprint $table) {
            $table->dropForeign(['detail_produksi_id']);
            $table->dropUnique(['detail_produksi_id']);
            $table->dropColumn('detail_produksi_id');
        });

        Schema::table('stok_bahan_baku', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['produksi_pemakaian_bahan_id']);
            $table->dropUnique(['produksi_pemakaian_bahan_id']);
            $table->dropColumn(['produksi_pemakaian_bahan_id', 'created_by']);
        });
    }
};
