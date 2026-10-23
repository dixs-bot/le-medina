# Panduan: Harga Kamar dan Inventaris Supabase

Patch ini mengganti kartu tarif contoh yang tertulis langsung di halaman admin menjadi data langsung dari Supabase, menambahkan pengelolaan harga dasar, aturan akhir pekan/libur panjang, dan form tambah kamar fisik.

## Berkas yang berubah

- `app/admin/AdminDashboardClient.tsx` — UI inventaris dan manajemen harga aktual.
- `app/api/admin/room-management/route.ts` — endpoint admin yang membaca/menulis tipe kamar, tarif, dan kamar fisik ke Supabase.
- `lib/types.ts` — tipe kolom aturan tarif.
- `lib/data/store.ts` — menampilkan pesan minimum durasi saat aturan harga menolak reservasi.
- `supabase/migrations/20261023000011_admin_room_rate_management.sql` — skema aturan tarif, aturan harga berulang, fungsi harga reservasi, dan menonaktifkan dua aturan demo musim dingin.

## Urutan pemasangan

1. Pastikan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` di Vercel mengarah ke **proyek Supabase yang sama**. Service role key harus tetap hanya di server, tidak boleh menggunakan awalan `NEXT_PUBLIC_`.
2. Buka **Supabase → SQL Editor → New query**, tempel seluruh isi `supabase/migrations/20261023000011_admin_room_rate_management.sql`, lalu jalankan. Migrasi ini mempertahankan harga dasar tipe kamar yang sekarang; tidak menghapus riwayat reservasi.
3. Ekstrak ZIP patch ke folder utama proyek yang berisi `package.json`, dan timpa file dengan nama sama.
4. Di Git Bash pada folder proyek jalankan:

   ```bash
   npm ci
   npm run build
   ```

5. Jika build berhasil, commit hanya file patch berikut:

   ```bash
   git add app/admin/AdminDashboardClient.tsx app/api/admin/room-management/route.ts lib/types.ts lib/data/store.ts supabase/migrations/20261023000011_admin_room_rate_management.sql
   git diff --cached --check
   git commit -m "Add Supabase room and pricing management"
   git push origin main
   ```

## Cara memakai

- **Admin → Tarif & Ketentuan**: harga dasar setiap tipe kamar dibaca dari `room_types.base_price_cents`. Input di UI memakai nominal Rupiah biasa, misalnya `150000`; server menyimpan format internal aplikasi sebagai `15,000,000` (nilai Rupiah × 100) supaya konsisten dengan kode dan reservasi yang sudah ada.
- **Tambah Harga**: pilih tipe kamar, nama aturan, harga per malam, periode, dan minimum menginap. Untuk akhir pekan berulang, pilih hari (ISO: Senin=1 sampai Minggu=7) serta rentang tanggal berlakunya aturan. Untuk libur panjang, pilih jenis `Libur panjang / hari besar`; aturan ini memiliki prioritas di atas akhir pekan ketika periodenya bertumpuk.
- **Aturan Tarif dari Supabase**: harga, tanggal, nama, minimum menginap, hari yang dikenai tarif, dan status aktif bisa diedit. Menonaktifkan aturan tidak menghapusnya; centang “Tampilkan nonaktif” untuk melihat/mengaktifkannya lagi.
- **Admin → Kamar & Inventaris**: isi nomor kamar, tipe, lantai, dan sayap/area. Setelah berhasil disimpan, kamar baru muncul di inventaris Supabase sebagai `available` dan dapat masuk perhitungan ketersediaan.
- Perubahan harga berlaku untuk **pemesanan baru**. Total reservasi yang sudah dibuat tetap menyimpan nilai historisnya.

## Prioritas harga

`Libur panjang (100)` > `Tarif khusus (80)` > `Akhir pekan (60)` > `Musiman (40)` > harga dasar. Bila aturan libur panjang mencakup akhir pekan, harga libur panjang dipakai. Minimum durasi menginap dari aturan aktif ikut divalidasi oleh fungsi SQL perhitungan harga.

Migrasi menonaktifkan dua nama aturan contoh lama yang ditulis untuk data demo: `Winter Holiday Oasis High Season` dan `Atlas Winter Starlight Season`. Harga dasar di `room_types` tidak diubah oleh migrasi.

## Pemeriksaan setelah deployment

1. Buka `/admin` → Tarif & Ketentuan. Nilai yang ditampilkan harus mengikuti nominal di Supabase, bukan lagi dua kartu contoh statis.
2. Simpan harga dasar sementara, segarkan halaman, dan pastikan nominal tetap tersimpan di `room_types`.
3. Tambahkan aturan akhir pekan dengan Sabtu dan Minggu, lalu buka formulir reservasi publik dan periksa total untuk tanggal yang memuat akhir pekan.
4. Tambahkan kamar dengan nomor baru (misalnya `105`) lalu segarkan inventaris dan pastikan kamar muncul satu kali.
5. Jika `/api/admin/room-management` mengeluhkan kolom tarif, pastikan migrasi nomor 11 berhasil diterapkan pada proyek Supabase yang sama dengan URL di Vercel.

## Catatan validasi

Sintaks file TypeScript/TSX yang diubah sudah diperiksa. Build Next.js penuh tidak dapat dijalankan di lingkungan pembuatan patch ini karena instalasi dependensi npm terhenti dan executable `next` tidak tersedia. Karena itu, `npm ci` dan `npm run build` pada komputer proyek Anda tetap perlu berhasil sebelum push/deploy. Belum ada koneksi langsung yang dilakukan ke database produksi.
