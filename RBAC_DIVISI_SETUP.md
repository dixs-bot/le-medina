# RBAC Divisi Hôtel Le Médina

## Role baru
- `receptionist_staff`: Ringkasan Dashboard, Daftar Reservasi, Kamar & Inventaris, Voucher & Promo.
- `restaurant_cashier`: Kasir Offline/POS, Pesanan, Menu Restoran.
- `waterpark_cashier`: Mini Waterpark, Pesanan Tiket Online.
- `super_admin`: seluruh divisi dan Pengaturan Sistem.

Akun lama `reservation_staff`, `admin`, dan `content_editor` tetap didukung sebagai kompatibilitas. Akun baru yang dibuat melalui Pengaturan Sistem hanya dapat memakai tiga role divisi baru di atas. Pengaturan Sistem hanya untuk `super_admin`.

## Pemasangan
1. Backup kode dan database terlebih dahulu.
2. Jalankan migrasi `supabase/migrations/20261027000006_division_role_isolation.sql` di Supabase SQL Editor.
3. Pastikan variabel server `SUPABASE_SERVICE_ROLE_KEY` dan `ADMIN_SECRET_KEY` tetap dikonfigurasi dengan benar di Vercel. Jangan pernah meletakkan service role key di client.
4. Jalankan `npm ci` lalu `npm run build` di komputer lokal.
5. Uji login dengan satu akun dummy untuk tiap divisi dan pastikan API menolak akses lintas divisi (403).

Catatan: pembatasan navigasi di client hanya untuk tampilan; pembatasan API server juga diperbarui. Super Admin tetap dapat mengakses semua endpoint melalui pemeriksaan role server.
