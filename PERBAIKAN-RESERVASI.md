# Catatan Perbaikan Reservasi Supabase

## Yang diubah

1. `lib/data/store.ts`
   - Saat Supabase dikonfigurasi, pembuatan reservasi menggunakan RPC PostgreSQL `create_atomic_reservation` yang sudah tersedia pada migration `20261022000003_rpc_functions.sql`.
   - Tidak lagi melakukan INSERT ke `reservations` menggunakan kolom yang tidak ada seperti `assigned_room_number`.
   - Tidak lagi mengembalikan objek booking lokal sebagai sukses ketika operasi database gagal.
   - Pembacaan daftar reservasi menggunakan database; error database tidak disembunyikan dengan fallback seed.
   - Detail tipe kamar dan nomor kamar dibaca melalui `reservation_items` dan `rooms`.
   - `getRoomTypeById` mengambil data dari Supabase jika koneksi dikonfigurasi.
   - Jika kode promo dikirim pada mode Supabase, permintaan ditolak secara jelas karena RPC yang ada belum mendukung promo. Ini mencegah diskon UI yang tidak diterapkan pada harga database.
   - Jika Supabase tidak dikonfigurasi, perilaku in-memory tetap tersedia untuk pengembangan lokal saja.

2. `app/api/reservations/route.ts`
   - Error saat proses penyimpanan dikembalikan sebagai kegagalan server, bukan respons validasi `400` setelah validasi input sudah lolos.
   - Respons gagal eksplisit menggunakan `success: false`.

3. `.env.example`
   - Placeholder anon/publishable key dan service-role key diperjelas.

## Konfigurasi yang dibutuhkan

Atur variabel berikut di Vercel untuk environment yang digunakan:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable key yang sesuai dengan proyek)
- `SUPABASE_SERVICE_ROLE_KEY` (hanya server; jangan beri awalan `NEXT_PUBLIC_` dan jangan commit nilainya)

Dashboard admin memakai service-role client di server untuk membaca data karena sesi admin aplikasi saat ini bukan sesi Supabase Auth. Lindungi seluruh endpoint admin dengan autentikasi server-side. Service-role key melewati RLS dan harus dijaga sebagai rahasia.

## Catatan penting

- Pastikan migration yang mendefinisikan `public.create_atomic_reservation` dan tabel terkait sudah diterapkan ke proyek Supabase yang benar.
- RPC menghitung harga berdasarkan `room_types` dan `room_rates`, membuat reservasi, `reservation_items`, `reservation_nights`, serta event dalam satu transaksi database.
- RPC saat ini belum menerapkan kode promo.
- Jangan menghapus atau menjalankan ulang migration produksi secara membabi buta. Cocokkan status migration dan skema database terlebih dahulu.

## Validasi yang belum dapat diklaim

Build TypeScript belum bisa diverifikasi dalam lingkungan ini karena dependensi npm tidak berhasil terpasang sebelum batas waktu. Koneksi langsung ke Supabase produksi juga tidak diuji. Setelah mengunduh ZIP, jalankan `npm ci` dan `npm run build`, kemudian uji satu reservasi di environment preview dan pastikan record muncul di `reservations`, `reservation_items`, dan `reservation_nights`, serta tampil di admin.
