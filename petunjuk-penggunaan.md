# 📘 PETUNJUK PENGGUNAAN APLIKASI INSTAND

**Versi:** 1.1
**Terakhir diperbarui:** 15 Juli 2026
**Dibuat oleh (Sistem Builder):** Aditiyas Wahyu

Dokumen ini adalah panduan resmi penggunaan aplikasi **INSTAND** (aplikasi kalkulator harga & rincian booth portable). Gunakan dokumen ini untuk melatih karyawan baru (sales/admin) agar bisa memakai aplikasi tanpa perlu diajari langsung — cukup ikuti langkah demi langkah di bawah ini.

**Alamat aplikasi:** https://instand-boothku.vercel.app

---

## Daftar Isi

1. [Apa itu Aplikasi INSTAND](#1-apa-itu-aplikasi-instand)
2. [Cara Masuk / Login](#2-cara-masuk--login)
3. [Menu & Navigasi](#3-menu--navigasi)
4. [Fitur 1 — Kalkulator Harga](#4-fitur-1--kalkulator-harga)
5. [Fitur 2 — AI Estimasi (Foto ke Harga)](#5-fitur-2--ai-estimasi-foto-ke-harga)
6. [Fitur 3 — Rincian / Penawaran](#6-fitur-3--rincian--penawaran)
7. [Fitur 4 — Pricelist](#7-fitur-4--pricelist)
8. [Fitur 5 — Dashboard](#8-fitur-5--dashboard)
9. [Fitur 6 — Kelola Harga & AI Knowledge](#9-fitur-6--kelola-harga--ai-knowledge)
10. [Alur Kerja Harian (Contoh Kasus)](#10-alur-kerja-harian-contoh-kasus)
11. [Instalasi Aplikasi (untuk Admin/IT)](#11-instalasi-aplikasi-untuk-adminit)
12. [Tanya Jawab (FAQ)](#12-tanya-jawab-faq)
13. [Riwayat Update Panduan](#13-riwayat-update-panduan)
14. [Kredit & Kontak](#14-kredit--kontak)

---

## 1. Apa itu Aplikasi INSTAND

INSTAND adalah aplikasi internal untuk tim sales & admin booth portable. Fungsinya:

- Menghitung HPP (modal) dan harga jual booth beserta komponennya.
- Membuat rincian/penawaran harga untuk klien, lengkap dengan PDF berbranding.
- Mengestimasi harga otomatis hanya dari foto booth menggunakan AI.
- Memantau riwayat penjualan, status penawaran, dan laba lewat dashboard.
- Mengelola harga produk supaya tidak perlu edit Excel manual.

Aplikasi ini berjalan di browser (bisa dipasang seperti aplikasi HP/PWA) dan datanya tersimpan di database (Supabase) sehingga bisa diakses tim dari perangkat berbeda.

## 2. Cara Masuk / Login

1. Buka aplikasi lewat browser (Chrome/Safari) di alamat: **instand-boothku.vercel.app**
2. Anda akan diarahkan ke halaman **Masuk ke Aplikasi**.
3. Isi **Email** dan **Password** yang sudah didaftarkan admin.
4. Tekan tombol **Masuk**.
5. Jika berhasil, Anda otomatis masuk ke halaman **Kalkulator**.

> Belum punya akun? Minta admin menambahkan akun baru lewat Supabase Dashboard → Authentication → Users. Karyawan biasa **tidak bisa** mendaftar sendiri — ini untuk keamanan data harga perusahaan.

> **Tips:** Simpan alamat instand-boothku.vercel.app ke Home Screen HP (Chrome → titik tiga → "Add to Home screen") supaya bisa dibuka langsung seperti aplikasi, tanpa perlu ketik alamat setiap kali.

## 3. Menu & Navigasi

Navigasi utama ada di **bagian bawah layar** (bottom navigation), berisi 6 menu:

| Menu | Fungsi Singkat |
|---|---|
| Kalkulator | Hitung HPP → margin → harga jual manual |
| AI Est. | Upload foto booth → AI otomatis estimasi harga |
| Rincian | Riwayat semua penawaran, export PDF, ubah status |
| Pricelist | Lihat paket standar & daftar harga komponen |
| Dashboard | Grafik revenue, laba, dan tren bulanan |
| Kelola | Update harga produk & knowledge AI |

Tab yang sedang aktif akan tersorot. Tap ikon untuk pindah menu — data yang sedang diisi di Kalkulator/AI Estimasi tidak akan hilang saat pindah menu selama belum keluar aplikasi (tersimpan sementara di sesi browser).

---

## 4. Fitur 1 — Kalkulator Harga

Fitur ini dipakai untuk menghitung harga jual booth secara **manual**, langkah demi langkah.

**Cara pakai:**

1. **Langkah 1 — Pilih Booth Base**: pilih ukuran booth (100cm / 120cm / 150cm). Setiap pilihan menampilkan HPP (modal)-nya.
2. **Langkah 2 — Tambah Komponen**: pilih tab **Add-on** (tiang, wingside, LED, sticker, dll) atau **Ongkir**, lalu tekan **+ Tambah** pada item yang diperlukan. Item yang dipilih akan muncul di daftar "Item Dipilih" dengan tombol +/− untuk atur jumlah (qty).
   - Jika komponen yang dibutuhkan belum ada di daftar, tekan **+ Produk Baru** untuk menambah item baru langsung dari kalkulator (isi nama, kategori, harga HPP, satuan).
3. **Langkah 3 — Atur Margin Keuntungan**: geser slider margin untuk tiap kategori (Booth Base, Add-on, Ongkos Kirim) sesuai kebijakan perusahaan. Bisa juga langsung mengetik **Override Total Harga Jual** kalau ingin set harga akhir manual.
4. Cek **Ringkasan Internal** (kotak hijau tua) — ini menampilkan Total HPP, Margin Aktual, Harga Jual ke Klien, dan Potensi Laba. Bagian ini **tidak pernah tampil di PDF klien**, hanya untuk mata sales.
5. Tekan **Buat Rincian →** untuk lanjut membuat penawaran resmi (lihat bagian Fitur 3).
6. Tombol **Reset** mengosongkan semua pilihan jika ingin mulai hitung ulang dari nol.

## 5. Fitur 2 — AI Estimasi (Foto ke Harga)

Fitur andalan: cukup upload **foto booth** (referensi klien, foto Pinterest, atau foto booth kompetitor), AI akan mendeteksi komponen dan membuatkan estimasi harga otomatis.

**Cara pakai:**

1. Tap menu **AI Est.**
2. Tap kotak upload untuk pilih foto, atau drag & drop foto ke kotak tersebut.
3. (Opsional tapi disarankan) isi **Keterangan Tambahan**, contoh: "Booth ukuran 2x1m, bahan HPL putih, ada laci bawah, roda 4, untuk jualan kopi." Semakin detail keterangan, semakin akurat hasil AI.
4. Aplikasi akan menampilkan perkiraan biaya API sebelum dijalankan (biasanya sangat kecil, di bawah Rp 1.000 per analisa).
5. Tekan **Analisa & Estimasi Harga**. Tunggu beberapa detik — akan muncul progres (membaca gambar → mengambil knowledge base → mengenali komponen → mencocokkan katalog → validasi harga).
6. Setelah selesai, akan muncul **Hasil Analisa AI**: penjelasan singkat, tingkat keyakinan (tinggi/sedang/rendah), dan daftar item beserta HPP-nya.
7. Setiap item **bisa diedit** langsung (nama, harga, qty), dihapus, atau ditambah manual bila AI melewatkan sesuatu.
8. Atur slider **Margin/Keuntungan** untuk menentukan harga jual akhir.
9. Pilih salah satu:
   - **Buat Rincian** → lanjut ke halaman pembuatan penawaran resmi.
   - **Simpan Estimasi** → simpan hasil ke daftar "Tersimpan" untuk dibuka/dipakai lagi nanti (maks. 15 estimasi tersimpan).
10. Estimasi yang tersimpan bisa dibuka lewat tombol **Tersimpan** di pojok kanan atas — dari situ bisa langsung **Buat Rincian** atau **Edit**.

> Jika muncul peringatan "Kredit OpenRouter Habis", artinya saldo API AI sudah habis. Hubungi admin/pemilik akun untuk top up kredit di openrouter.ai — fitur AI Estimasi tidak bisa dipakai sampai saldo diisi ulang.

## 6. Fitur 3 — Rincian / Penawaran

Setelah harga dihitung (dari Kalkulator atau AI Estimasi), langkah selanjutnya membuat rincian resmi untuk dikirim ke klien.

**Membuat rincian baru:**

1. Setelah menekan "Buat Rincian" dari Kalkulator/AI Estimasi, isi:
   - **Nama Klien**
   - **Nama Project/Booth**
   - **Harga Jual** (bisa disesuaikan lagi di sini)
   - **Catatan Khusus** (akan ikut tampil di PDF, misal: "Logo depan file siap cetak", "Bagian dalam ORI plywood", dll)
   - **Gambar Referensi** (opsional, bisa upload beberapa foto — akan muncul di halaman terakhir PDF)
2. Tekan **Simpan** untuk menyimpan rincian ke riwayat, atau **Export PDF** untuk langsung mengunduh PDF penawaran berbranding INSTAND (siap dikirim ke klien via WA/Email).

**Mengelola rincian yang sudah ada (menu Rincian):**

- Tap **Alur Status** untuk melihat panduan alur status penawaran.
- Filter berdasarkan status: Semua / Draft / Terkirim / Diterima / Ditolak.
- Tap salah satu kartu rincian untuk membuka detail: breakdown harga, daftar item, dan aksi yang tersedia.

**Alur status yang benar:**

| Status | Artinya | Tindakan Selanjutnya |
|---|---|---|
| Draft | Rincian baru dibuat, belum dikirim | Export PDF → kirim ke klien via WA/Email |
| Terkirim | PDF sudah dikirim, menunggu balasan | Tandai "Terkirim" agar tercatat waktunya |
| Diterima | Klien setuju, deal! | Tandai "Diterima" — otomatis masuk laporan penjualan/Dashboard |
| Ditolak | Klien minta harga lebih rendah / batal | Gunakan fitur "Beri Diskon", lalu kirim ulang PDF baru |

**Fitur tambahan di halaman Rincian:**

- **Edit** — rincian berstatus Draft masih bisa diedit penuh (nama klien, item, harga, catatan) sebelum dikirim.
- **Beri Diskon** — masukkan diskon dalam persen atau nominal Rupiah. Sistem otomatis menghitung ulang total bayar & laba, dan status kembali ke Draft agar bisa export PDF baru.
- **Gambar Referensi** — bisa ditambah kapan saja, akan otomatis ikut ke PDF di halaman terakhir.
- **Hapus** — menghapus rincian dari riwayat (akan diminta konfirmasi dulu).

## 7. Fitur 4 — Pricelist

Halaman referensi cepat untuk melihat harga tanpa perlu menghitung:

- Tab **Paket** — 3 paket booth standar (100cm, 120cm, 150cm) lengkap dengan isi & harga totalnya.
- Tab **Add-on** — daftar semua komponen tambahan beserta harga HPP per satuan.
- Tab **Bahan** — daftar bahan baku beserta harganya.

Gunakan halaman ini untuk menjawab pertanyaan klien dengan cepat tanpa harus membuka kalkulator.

## 8. Fitur 5 — Dashboard

Ringkasan performa penjualan dalam bentuk grafik, otomatis terhitung dari data rincian yang tersimpan:

- **Total Rincian** — jumlah semua penawaran yang pernah dibuat.
- **Total Revenue** — total nilai penjualan.
- **Total Laba** — total keuntungan dari seluruh penawaran.
- **Avg Margin** — rata-rata persentase margin.
- **Diterima** vs **Proses** — jumlah deal vs yang masih berjalan.
- Grafik **Revenue vs Laba (6 Bulan)** dan **Jumlah Rincian per Bulan** untuk melihat tren.

Dashboard ini berguna untuk laporan mingguan/bulanan ke atasan tanpa perlu rekap manual.

## 9. Fitur 6 — Kelola Harga & AI Knowledge

Menu khusus untuk admin/pemilik mengelola data master aplikasi. Ada 2 tab:

**Tab Produk & Harga:**

1. Pilih kategori: Booth Base / Add-on / Ongkir / Bahan.
2. Tekan **(ikon pensil)** pada item untuk mengubah nama, harga HPP, satuan, atau keterangan.
3. Tekan **(ikon riwayat)** untuk melihat riwayat perubahan harga item tersebut (kapan naik/turun, berapa selisihnya).
4. Tekan **+ Tambah** untuk menambahkan produk/komponen baru ke database.
5. Tekan **(ikon tempat sampah)** untuk menonaktifkan item yang sudah tidak dipakai (bukan dihapus permanen).

**Tab AI Knowledge:**

Ini adalah "pengetahuan" yang dibaca AI setiap kali melakukan estimasi di Fitur 2. Update rutin (disarankan tiap 1–2 minggu) membuat hasil AI makin akurat.

1. Tekan **+ Tambah** untuk menulis pengetahuan baru: pilih kategori (Umum / Produk / Tips Estimasi / Rincian), judul, dan isi konten.
2. Gunakan ikon edit dan hapus untuk mengubah/menghapus knowledge yang sudah ada.

**Akun:**

Di bagian bawah halaman ini juga tersedia info akun yang sedang login dan tombol **Keluar** untuk logout.

---

## 10. Alur Kerja Harian (Contoh Kasus)

Contoh skenario lengkap dari awal sampai akhir, untuk karyawan baru:

1. Klien kirim foto contoh booth yang diinginkan via WhatsApp.
2. Buka menu **AI Est.** → upload foto tersebut → isi keterangan (ukuran, bahan, kebutuhan khusus) → tekan **Analisa & Estimasi Harga**.
3. Cek & koreksi hasil AI jika ada yang kurang tepat → atur margin sesuai kebijakan → tekan **Buat Rincian**.
4. Isi nama klien & nama project → tekan **Export PDF** → kirim file PDF ke klien via WhatsApp/Email.
5. Buka menu **Rincian** → cari rincian tadi → tandai status **Terkirim**.
6. Tunggu balasan klien:
   - Jika setuju → tandai **Klien Setuju (Deal!)**.
   - Jika nego harga → tekan **Beri Diskon** → isi diskon → simpan → export PDF baru → kirim ulang → tandai Terkirim lagi.
   - Jika menolak total → tandai **Ditolak**.
7. Cek performa mingguan lewat menu **Dashboard**.

## 11. Instalasi Aplikasi (untuk Admin/IT)

Aplikasi INSTAND sudah online di **instand-boothku.vercel.app** — karyawan sales cukup buka alamat ini di browser HP/laptop, tidak perlu install apapun (lihat Bagian 2). Bagian di bawah ini hanya untuk admin/IT yang mengelola sisi teknis aplikasi.

**Memasang shortcut di HP Android/iPhone (seperti APK):**
1. Buka **instand-boothku.vercel.app** di Chrome (Android) atau Safari (iPhone).
2. Tap ikon titik tiga (Android) atau ikon Share (iPhone) → **Add to Home screen**.
3. Ikon aplikasi akan muncul di layar utama HP seperti aplikasi biasa.

**Update harga/produk:** cukup lewat menu Kelola di dalam aplikasi (Bagian 9) — tidak perlu deploy ulang.

**Menjalankan/mengembangkan aplikasi secara lokal (khusus developer):**

Prasyarat: Node.js (LTS, dari nodejs.org) dan akun Supabase yang sudah dikonfigurasi.

1. Setup database (sekali saja): buka dashboard Supabase project → menu SQL Editor → New query → copy isi file `supabase/schema.sql` → paste → jalankan (Ctrl+Enter).
2. Cara mudah: klik dua kali `SETUP.bat` lalu ikuti instruksi di layar.
3. Cara manual: buka terminal di folder aplikasi → `npm install` → `npm run dev` → buka `http://localhost:3000`.
4. Setiap perubahan kode yang di-push ke GitHub akan otomatis ter-deploy ulang ke instand-boothku.vercel.app oleh Vercel.

## 12. Tanya Jawab (FAQ)

**Lupa password, bagaimana?**
Hubungi admin untuk reset lewat Supabase Dashboard → Authentication → Users.

**Kenapa fitur AI Estimasi gagal / muncul pesan error kredit?**
Saldo API OpenRouter habis. Info ini otomatis muncul di layar dengan tombol untuk top up — teruskan ke admin.

**Apakah harga jual di Kalkulator langsung terlihat klien?**
Tidak. Bagian "Ringkasan Internal" (HPP, margin, laba) hanya tampil di aplikasi, tidak pernah ikut ke PDF yang dikirim ke klien.

**Bagaimana kalau salah input harga di rincian yang sudah Terkirim?**
Rincian yang bukan status Draft tidak bisa diedit langsung. Gunakan fitur **Beri Diskon** (bisa diisi 0 jika hanya ingin koreksi) — ini akan mengembalikan status ke Draft sehingga bisa export PDF baru.

**Data tersimpan di mana?**
Semua data (produk, harga, rincian, gambar) tersimpan di database Supabase, bukan di HP/laptop masing-masing — aman walau ganti perangkat, asal login dengan akun yang sama.

---

## 13. Riwayat Update Panduan

> Tambahkan baris baru di bagian **paling atas** tabel ini setiap kali ada update fitur aplikasi. Cukup tambahkan satu baris — tidak perlu menulis ulang seluruh dokumen.

| Tanggal | Perubahan |
|---|---|
| 2026-07-15 | Update alamat aplikasi ke domain resmi instand-boothku.vercel.app (Bagian 2 & 11). |
| 2026-07-15 | Panduan awal dibuat — mencakup semua fitur: Kalkulator, AI Estimasi, Rincian, Pricelist, Dashboard, Kelola Harga & AI Knowledge. |

---

## 14. Kredit & Kontak

**Sistem Builder:** Aditiyas Wahyu
**Bantuan/Support:** kochiroad@gmail.com

Dokumen ini dikelola sebagai bagian dari proyek aplikasi INSTAND. Setiap update aplikasi sebaiknya diikuti dengan pembaruan singkat di [Riwayat Update Panduan](#13-riwayat-update-panduan) di atas.

---

*Panduan ini dibangun dan dipelihara oleh **Aditiyas Wahyu** (Sistem Builder INSTAND App).*
