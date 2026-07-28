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
        Schema::create('stok_produk_cacat', function (Blueprint $table) {
            $table->id();
            $table->foreignId('detail_produksi_id')
                ->unique()
                ->constrained('detail_produksi')
                ->restrictOnDelete();
            $table->foreignId('produksi_id')
                ->constrained('produksi')
                ->restrictOnDelete();
            $table->foreignId('produk_id')
                ->constrained('produk')
                ->restrictOnDelete();
            $table->enum('disposisi', ['jual_cacat', 'dimusnahkan']);
            $table->integer('qty');
            $table->text('alasan_qc');
            $table->text('catatan')->nullable();
            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->timestamps();

            $table->index(['produksi_id', 'disposisi']);
            $table->index(['produk_id', 'disposisi']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stok_produk_cacat');
    }
};
