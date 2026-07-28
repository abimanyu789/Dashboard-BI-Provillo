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
        Schema::table('detail_produksi', function (Blueprint $table) {
            $table->foreignId('karyawan_id')
                ->nullable()
                ->after('produk_id')
                ->constrained('karyawan')
                ->restrictOnDelete();
            $table->text('alasan_qc')->nullable()->after('qc_status');
            $table->enum('disposisi_qc', ['rework', 'jual_cacat', 'dimusnahkan'])
                ->nullable()
                ->after('alasan_qc');
            $table->foreignId('rework_parent_id')
                ->nullable()
                ->after('disposisi_qc')
                ->constrained('detail_produksi')
                ->restrictOnDelete();
            $table->text('catatan')->nullable()->after('rework_parent_id');
            $table->foreignId('inspected_by')
                ->nullable()
                ->after('catatan')
                ->constrained('users')
                ->restrictOnDelete();
            $table->timestamp('inspected_at')->nullable()->after('inspected_by');
            $table->string('idempotency_key', 100)->nullable()->unique()->after('inspected_at');

            $table->index(
                ['produksi_id', 'qc_status', 'disposisi_qc'],
                'detail_produksi_qc_disposisi_index',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('detail_produksi', function (Blueprint $table) {
            $table->dropForeign(['inspected_by']);
            $table->dropForeign(['rework_parent_id']);
            $table->dropForeign(['karyawan_id']);
            $table->dropIndex('detail_produksi_qc_disposisi_index');
            $table->dropUnique(['idempotency_key']);
            $table->dropColumn([
                'karyawan_id',
                'alasan_qc',
                'disposisi_qc',
                'rework_parent_id',
                'catatan',
                'inspected_by',
                'inspected_at',
                'idempotency_key',
            ]);
        });
    }
};
