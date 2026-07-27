# Business Rules — Provillo Management System

Sumber: Bab IV skripsi (Use Case Scenario & Business Rules), diringkas per modul.
Gunakan ini sebagai acuan wajib saat membuat Service/FormRequest — jangan diubah tanpa
instruksi eksplisit dari pemilik project.

## Login (KF-01)
- Autentikasi pakai email + password.
- Gagal login → pesan "Email atau Password salah". Field kosong → pesan wajib diisi.

## Dashboard (KF-02) & Laporan (KF-03)
- Menampilkan ringkasan real-time: pesanan, produksi, stok, arus kas.
- Download laporan mendukung filter periode + jenis laporan, output PDF/Excel/cetak.

## Bahan Baku (KF-04)
- BR-01 Kode bahan baku harus unik.
- BR-02 Nama bahan baku tidak boleh kosong.
- BR-03 Stok awal minimal nol.
- BR-04 Satuan harus dipilih.
- BR-05 Import hanya menerima template yang sesuai.

## Produk (KF-05)
- BR-01 Produk memiliki kode unik.
- BR-02 Produk harus memiliki BOM.
- BR-03 Produk yang telah digunakan pada transaksi tidak dapat dihapus.
- BR-04 Import hanya menerima template yang sesuai.

## Bill of Materials / BOM (KF-06, KF-15)
- BR-01 Setiap produk hanya memiliki satu BOM aktif.
- BR-02 Satu bahan baku dapat dipakai banyak produk.
- BR-03 Quantity bahan baku tidak boleh nol.
- BR-04 BOM yang telah dimiliki produk tidak dapat dihapus.
- BR-05 Produk tidak dapat diproduksi apabila belum memiliki BOM.

## Karyawan (KF-08)
- BR-01 Karyawan memiliki status aktif/nonaktif.
- BR-02 Tukang dapat terlibat pada lebih dari satu produksi.
- BR-03 Karyawan yang masih memiliki produksi aktif tidak dapat dihapus.

## Customer (KF-07)
- BR-01 Jenis customer harus dipilih (B2B/B2C).
- BR-02 Nomor telepon tidak boleh sama (unik).
- BR-03 Customer dapat memiliki banyak pesanan.

## Pesanan & Invoice (KF-09, KF-10)
- BR-01 Pesanan hanya dibuat oleh admin yang sudah login.
- BR-02 Satu pesanan hanya dimiliki satu customer.
- BR-03 Satu pesanan dapat terdiri dari lebih dari satu produk.
- BR-04 Qty produk harus lebih dari nol.
- BR-05 Status awal pesanan adalah Pending.
- BR-06 Status dapat diperbarui menjadi Proses atau Cancel secara manual. Transisi ke Selesai **tidak manual** (lihat BR-PSN-10).
- BR-07 Pesanan berstatus Done/Cancel tidak dapat dihapus.
- BR-08 Invoice hanya bisa dicetak lewat menu Detail Pesanan; nomor invoice unik & otomatis.
- BR-09 Setiap pesanan memiliki jenis pembayaran yang disepakati saat order (DP, Lunas, Bertahap, COD, Termin). Jenis pembayaran ini berbeda dari transaksi pembayaran aktual yang dicatat di tabel pembayaran.
- BR-PBY-10 Nominal pembayaran tidak boleh melebihi sisa tagihan (`total − Σ nominal`). Melanggar → reject.
- BR-PBY-11 Status bayar bersifat **derived** (bukan kolom DB): `belum_bayar` / `sebagian` / `lunas` dari `Σ nominal` vs `total`.
- BR-PSN-10 Auto `status = selesai` **hanya** jika (a) lunas **dan** (b) semua item pesanan sudah terkirim penuh. Status Selesai tidak tersedia di dropdown manual.
- BR-PSN-12 Pembatalan pesanan yang sudah punya pengiriman diblok (perlu reverse stok dulu).
- BR-PSN-13 Auto `pending → proses` saat aktivitas bayar/ship pertama (kurangi lupa ubah status).

## Stok Bahan Baku (KF-11, KF-16)
- BR-01 Stok tidak boleh negatif.
- BR-02 Penambahan stok lewat proses restock manual oleh admin.
- BR-03 Pengurangan stok otomatis saat produksi dimulai (sesuai perhitungan BOM).
- BR-04 Produksi dibatalkan → stok bahan baku dikembalikan otomatis.
- BR-05 Setiap perubahan stok wajib tercatat di riwayat (tabel stok_bahan_baku).

## Stok Produk Jadi (KF-12, KF-16)
- BR-01 Stok tidak boleh negatif.
- BR-02 Penambahan stok otomatis berdasarkan progres produksi yang selesai.
- BR-03 Pengurangan stok saat admin mencatat pengiriman ke customer.
- BR-04 Setiap perubahan stok wajib tercatat di riwayat (tabel stok_produk_jadi).
- BR-05 Penyesuaian stok hanya bisa dilakukan admin.
- BR-KIR-01 Pengiriman wajib pilih pesanan (status `pending`/`proses`, tidak locked).
- BR-KIR-02 Produk pengiriman harus ada di `detail_pesanan` pesanan tsb.
- BR-KIR-03 Qty kirim per produk ≤ `qty_pesan − qty_sudah_dikirim` untuk pesanan itu.
- BR-KIR-04 Qty kirim juga tetap ≤ stok produk jadi tersedia (BR-01 tetap berlaku).
- Log pengiriman menyimpan `stok_produk_jadi.pesanan_id` (nullable; diisi HANYA untuk `jenis_transaksi = pengiriman`) agar progress kirim per pesanan bisa dihitung akurat.

## Produksi (KF-13, KF-14, KF-15, KF-16) — modul paling kompleks
- BR-01 Status awal produksi adalah Draft.
- BR-02 Produksi memiliki dua jenis: (a) Produksi untuk Pesanan — target produk berasal dari detail pesanan; (b) Produksi untuk Restok — target produk diinput manual oleh admin.
- BR-03 Kebutuhan bahan baku dihitung dari BOM seluruh produk pada produksi_item, berlaku untuk kedua jenis produksi.
- BR-04 Produksi hanya bisa mulai (status Proses) jika stok bahan baku mencukupi.
- BR-05 Saat status jadi Proses, stok bahan baku otomatis dikurangi sesuai BOM.
- BR-06 Jika stok tidak cukup, status tetap Draft.
- BR-07 Target per-produk disimpan di tabel `produksi_item` (terpisah dari histori progress di `detail_produksi`). Berfungsi sebagai sumber kebenaran qty per produk untuk kedua jenis produksi.
- BR-08 Daftar karyawan yang terlibat dalam produksi disimpan di tabel `produksi_karyawan` (pivot). Karyawan dipilih saat Create Produksi, bukan saat input progress. Tabel ini bukan histori progress.
- BR-09 Progress produksi dicatat per produk berdasarkan output tim yang sudah ditentukan. Admin memilih: produk, qty progress, dan status QC.
- BR-10 Setiap progress wajib melalui QC. Status QC (lolos/tidak_lolos) disimpan di `detail_produksi.qc_status` agar histori QC dapat diaudit dan progress bar QC dapat dihitung.
- BR-11 Progress yang lolos QC langsung menambah stok produk jadi sesuai jumlah produk yang lolos.
- BR-12 Progress yang tidak lolos QC tidak menambah stok dan harus diperbaiki.
- BR-13 Dropdown produk saat input progress hanya menampilkan produk yang qty lolos QC masih kurang dari qty_target di produksi_item.
- BR-14 Produksi di-cancel → stok bahan baku yang sudah dipakai dikembalikan otomatis.
- BR-15 Satu produksi bisa melibatkan lebih dari satu tukang (via produksi_karyawan).
- BR-16 Produksi untuk Pesanan hanya berasal dari satu pesanan. Produksi untuk Restok tidak terkait pesanan (pesanan_id = null).
- BR-17 Produksi selesai hanya jika total qty lolos QC dari seluruh produksi_item sama dengan qty_target produksi. Status selesai tidak menambah stok (stok sudah bertambah bertahap).

## Arus Kas (KF-17, KF-18)
- BR-01 Setiap transaksi wajib berjenis Pemasukan atau Pengeluaran.
- BR-02 Kategori transaksi harus sesuai jenis transaksi.
- BR-03 Transaksi pembayaran pesanan wajib terhubung ke data pesanan terkait.
- BR-04 Nominal transaksi harus lebih besar dari nol.
- BR-05 Saldo kas dihitung ulang otomatis setiap transaksi berhasil disimpan.
- BR-06 Perubahan transaksi menyebabkan saldo dihitung ulang.
- BR-07 Penghapusan transaksi menyebabkan saldo dihitung ulang.
- BR-08 Bukti transaksi opsional, disarankan diunggah sebagai arsip.
- BR-09 Transaksi yang sudah dihapus tidak ditampilkan lagi di daftar.

## Cross-cutting
- KF-19 Filter & pencarian tersedia di semua modul utama.
- KF-20 Export PDF/Excel tersedia di semua modul utama.

## Catatan implementasi (sinkron dengan database-schema.md — FINAL)
- BR-05 di modul Stok Bahan Baku & Stok Produk Jadi: kolom `stok` di tabel `bahan_baku`/
  `produk` (sumber utama jumlah stok saat ini) dan tabel log (`stok_bahan_baku`/
  `stok_produk_jadi`) wajib diupdate bersamaan dalam satu `DB::transaction()`, supaya
  keduanya tidak pernah out-of-sync.
- Rule larangan hapus (Karyawan BR-03, Produk BR-03, BOM BR-04) sudah dijaga juga di level
  database lewat FK `onDelete('restrict')`. Validasi eksplisit tetap wajib ada di
  Service/FormRequest — tujuannya supaya user dapat pesan error yang jelas, bukan cuma
  error SQL constraint yang mentah.
