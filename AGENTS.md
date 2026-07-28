# Provillo — AI Agent Context

Sistem Informasi Manajemen Operasional Provillo (UMKM sepatu, Mojokerto).
Baca file ini dulu sebelum ngoding apapun. Detail lengkap ada di folder `docs/`.

## Stack
- Laravel 13, PHP 8.3
- Inertia.js v3 + React 19 + TypeScript (frontend)
- Tailwind CSS v4
- MySQL (production) / SQLite (development — jangan diubah otomatis, migrasi manual saat deploy)
- Laravel Fortify (auth backend — bukan WorkOS, bukan Breeze)
- Laravel Wayfinder (typed route functions)

## Aktor
Hanya 1 role: **Admin** (owner/staf operasional). Tidak ada multi-role/permission matrix.

## Urutan modul (kerjakan satu per satu, jangan digabung dalam 1 sesi AI)
1. Auth / Login
2. Dashboard
3. Master Data — Bahan Baku
4. Master Data — Produk
5. Bill of Materials (BOM)
6. Master Data — Karyawan
7. Master Data — Customer
8. Pesanan + Invoice
9. Stok Bahan Baku
10. Stok Produk Jadi
11. Produksi
12. Arus Kas
13. Laporan / Export (cross-cutting, lintas modul)

Detail task per modul ada di `docs/modules-todo.md`.

## Entitas utama (ERD)
User, Customer, Produk, BahanBaku, BOM (`bom_categorie` + `bom_detail`), Karyawan,
Pesanan + DetailPesanan, Produksi + ProduksiItem (target per produk) + ProduksiKaryawan (tim) + DetailProduksi (histori progress), Pembayaran, ArusKas, StokBahanBaku (log), StokProdukJadi (log).

Skema lengkap (kolom & relasi) ada di `docs/database-schema.md` — **status: FINAL**, sudah
dicocokkan dengan Gambar 4.16 & 4.17. Tidak perlu cek ulang ke folder `diagram/` lagi
sebelum bikin migration.

⚠️ Perhatikan penamaan tabel saat bikin migration & model (sering salah tebak kalau ikut
konvensi default Laravel):
- Semua tabel **singular**, kecuali `users` (plural, khusus auth, ikut default Laravel).
- Tabel BOM: header-nya bernama `bom_categorie` (bukan `bom_category`/`boms`) dan
  detailnya `bom_detail`. Ejaan `categorie` memang disengaja — jangan "dikoreksi".
- Karena hampir semua model pakai tabel singular (beda dari tebakan default Eloquent),
  setiap Model selain `User` **wajib** deklarasi eksplisit `protected $table = 'nama_tabel';`.

## Business rules kritis (ringkas — lengkap di docs/business-rules.md)
- Produk wajib punya 1 BOM aktif sebelum bisa diproduksi.
- Produksi: status awal `Draft`. Sistem menghitung kebutuhan BOM sebagai rencana. Produksi dapat masuk `Proses` meski stok belum cukup; stok hanya berkurang saat bahan diterbitkan (`issued`/`additional`).
- Progress produksi dicatat per produk dan per karyawan. Progress lolos QC menambah stok normal tepat sekali; progress gagal wajib alasan + disposisi dan tidak menjadi dasar upah.
- Produksi `Cancel` → bahan consumed tidak dikembalikan; hanya bahan terbit yang belum digunakan dan belum dikembalikan yang masuk kembali ke stok.
- Stok (bahan baku & produk jadi) tidak boleh negatif.
- Pesanan: status `Pending → Proses → Done/Cancel`. Status `Done`/`Cancel` tidak bisa dihapus.
- Pembayaran bisa bertahap; tiap pembayaran otomatis membuat entry Arus Kas (Pemasukan).
- Arus Kas: saldo dihitung ulang otomatis setiap ada transaksi tambah/ubah/hapus.
- Karyawan yang masih terlibat produksi aktif tidak bisa dihapus.
- Produk yang sudah dipakai transaksi tidak bisa dihapus. BOM yang sudah dimiliki produk
  tidak bisa dihapus.

## Coding convention
- PSR-12, ikuti konvensi default Laravel.
- **Tidak pakai Repository Pattern.** Cukup Eloquent Model + Service Class untuk business
  logic yang kompleks (perhitungan BOM, update stok, hitung saldo kas, hitung upah).
- Pakai **FormRequest** untuk semua validasi input, jangan validasi inline di controller.
- Pakai **DB::transaction()** untuk operasi yang menyentuh lebih dari satu tabel sekaligus
  (mulai/selesai produksi, pembayaran → arus kas, restock).
- Controller tetap tipis (thin controller) — logic berat taruh di Service.

## Aturan keras — jangan dilanggar tanpa izin eksplisit
- Jangan membuat tabel baru atau mengubah relasi ERD yang sudah ada.
- Jangan mengubah business rule yang tertulis di atas / di `docs/business-rules.md`.
- Jangan lanjut ke modul berikutnya sebelum modul saat ini lulus testing manual.
- Jangan langsung coding. Selalu: baca requirement → ringkas → buat plan/daftar file →
  tunggu approval → baru implementasi.

## Alur kerja per modul (backend dulu, React belakangan)
Migration → Seeder → Model + Relation → FormRequest → Service (jika perlu) → Controller →
Route → test manual (tinker/Postman) → React/Inertia Page → test end-to-end → **commit git**.

## Kalau kamu (AI agent) baru pindah dari tool lain
Baca dulu: modul apa yang sedang dikerjakan, file apa saja yang sudah dibuat, dan status
git log terakhir (`git log --oneline -10`). Jangan mulai ulang dari nol atau menebak desain
sendiri — semua desain sudah final di `docs/`.
