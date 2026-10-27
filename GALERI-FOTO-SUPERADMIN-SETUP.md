# Galeri Foto Super Admin — Panduan Pemasangan

## Fungsi
- Menu **Galeri Foto** tampil tepat di atas **Pengaturan Sistem** dan hanya terlihat ketika akun asli adalah `super_admin` serta mode RBAC sedang `super_admin`.
- Upload foto JPG, PNG, atau WebP maksimal 8 MB.
- Foto, judul, kategori, dan keterangan disimpan ke tabel `public.gallery_images` yang sudah digunakan website pelanggan.
- File gambar disimpan di Supabase Storage bucket `hotel-gallery` yang bersifat public agar browser pelanggan dapat menampilkan foto.
- Super Admin dapat menghapus foto. Penghapusan menghapus baris galeri dan berusaha menghapus file Storage terkait.
- API `/api/admin/gallery` memeriksa sesi dan role `super_admin` di server.

## Pemasangan
1. Backup proyek dan database.
2. Gabungkan file patch sesuai struktur direktori.
3. Jalankan isi `supabase/migrations/20261027000007_superadmin_gallery_cms.sql` di Supabase SQL Editor.
4. Pastikan Vercel memiliki `SUPABASE_SERVICE_ROLE_KEY` sebagai environment variable server. Jangan gunakan atau tampilkan kunci ini di browser.
5. Jalankan `npm ci` lalu `npm run build` secara lokal.
6. Uji login sebagai Super Admin, unggah satu foto dummy, lalu cek bagian Galeri Foto pada halaman pelanggan. Uji juga bahwa role divisi lain menerima HTTP 403 jika mencoba API galeri.

## Catatan
Tabel `gallery_images` sudah ada dalam migrasi awal proyek, jadi tidak dibuat ulang. Galeri pelanggan membaca data dari tabel yang sama. Foto yang diunggah akan ditampilkan bersama foto yang sudah ada di tabel. Foto awal yang menggunakan URL contoh/stok sebaiknya diganti atau dihapus melalui CMS setelah foto fasilitas asli tersedia.
