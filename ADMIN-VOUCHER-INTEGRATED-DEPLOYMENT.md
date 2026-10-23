# Patch terintegrasi: Voucher & Promo + Profil Admin + Manajemen Akun

Paket ini menggabungkan dashboard admin terbaru dengan tab **Voucher & Promo**, halaman profil admin, dan bagian owner-only **Akun Admin & Catatan Pergantian Sif**. Voucher menu muncul di navigasi dashboard; menu tersebut tidak dibatasi oleh role. Bagian pembuatan/aktivasi akun dan audit memang khusus role `super_admin`.

## Mengapa fitur bisa terlihat hilang
- Jika **Voucher & Promo** tidak ada di navigasi, deployment Vercel kemungkinan masih menjalankan versi `app/admin/AdminDashboardClient.tsx` yang lama, atau file dari ZIP sebelumnya belum masuk ke commit yang ter-deploy.
- Bagian **Profil Admin** berada lebih bawah di halaman **Pengaturan Sistem**, jadi scroll ke bawah.
- **Tambah Akun Admin** ditampilkan hanya untuk akun owner dengan role `super_admin`. Jika belum tampil setelah scroll, jalankan SQL promosi role (langkah 2) dengan email owner yang benar lalu logout/login.

## Cara memasang
1. Ekstrak ZIP ini ke folder utama proyek (folder yang berisi `package.json`) dan izinkan file bernama sama ditimpa. Struktur `app/`, `components/`, `lib/`, dan `supabase/` harus digabung pada folder yang sama, bukan ditaruh dalam folder bersarang.
2. Pastikan migrasi `supabase/migrations/20261023000014_admin_profiles_shift_audit.sql` dan `supabase/migrations/20261023000017_voucher_cms_and_booking_discount.sql` sudah dijalankan di Supabase yang dipakai Vercel. Jangan mengulangi migrasi voucher jika sebelumnya sudah berhasil kecuali memang dibuat idempotent sesuai skrip.
3. Jika fitur **Tambah Akun Admin** tidak tampil, buka `20261023000015_promote_hotel_owner_to_super_admin.sql`, ganti placeholder email dengan email akun owner yang sudah terdaftar dan memiliki baris `profiles`, lalu jalankan di Supabase SQL Editor. Jangan membuat akun bersama atau membagikan kata sandi.
4. Jalankan `npm run build`. Jangan push jika build gagal.
5. Jika berhasil, jalankan `git add -A`, `git diff --cached --check`, `git commit -m "Restore voucher and admin management features"`, lalu `git push origin main`.
6. Pastikan deployment Vercel terbaru berstatus **Ready**, kemudian logout/login ulang.

## Pengujian
- `Voucher & Promo` terlihat pada sidebar.
- Menu Voucher menampilkan status kosong sampai manajemen menambah kode voucher valid.
- Di `Pengaturan Sistem`, scroll ke bawah untuk melihat Profil Admin.
- Akun owner `super_admin` dapat melihat **Akun Admin & Catatan Pergantian Sif**; akun admin operasional tidak dapat melihat fungsi owner-only tersebut.

## Catatan
Build Next.js penuh belum dapat dijalankan di lingkungan pembuat paket karena dependensi proyek tidak lengkap. Verifikasi `npm run build` di komputer proyek sebelum push. `SUPABASE_SERVICE_ROLE_KEY` tetap hanya pada environment server Vercel.
