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
        Schema::create('produksi_pemakaian_bahan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produksi_id')
                ->constrained('produksi')
                ->restrictOnDelete();
            $table->foreignId('bahan_baku_id')
                ->constrained('bahan_baku')
                ->restrictOnDelete();
            $table->enum('movement_type', [
                'planned',
                'issued',
                'consumed',
                'additional',
                'returned',
                'adjustment',
            ]);
            $table->decimal('qty', 12, 2);
            $table->date('tanggal');
            $table->text('keterangan')->nullable();
            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->string('idempotency_key', 100)->unique();
            $table->timestamps();

            $table->index(
                ['produksi_id', 'bahan_baku_id', 'movement_type'],
                'ppb_produksi_bahan_type_index',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produksi_pemakaian_bahan');
    }
};
