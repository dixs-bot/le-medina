# CMS Menu Restoran Supabase — Panduan Pemasangan

Paket ini mengganti katalog demo restoran dengan CMS menu yang dikelola manajemen restoran. Nama menu, deskripsi, harga Rupiah, kategori, ketersediaan, dan URL foto tersimpan di Supabase. Foto diunggah ke Supabase Storage melalui API server yang memerlukan sesi admin.

## Isi patch

- `app/api/admin/restaurant-menu/route.ts` — API baca, tambah, edit, hapus menu; simpan status ketersediaan; membuat/mengaktifkan kategori berdasarkan nama.
- `app/admin/AdminDashboardClient.tsx` — form menu admin, upload foto/pratinjau, edit menu, status ketersediaan, dan pesan hasil operasi.
- `components/RestaurantSection.tsx` — placeholder publik saat belum ada menu tersedia.
- `supabase/migrations/20261023000013_restaurant_menu_cms.sql` — membersihkan menu demo, menonaktifkan kategori demo, memberi grants service-role yang diperlukan, serta membuat bucket `restaurant-menu`.

## Penting: SQL menghapus menu lama

Sesuai permintaan, migrasi menghapus seluruh baris dari `public.restaurant_menu` dan menonaktifkan seluruh kategori yang ada. Ini tidak dapat dibatalkan dari website. Ekspor/cadangkan tabel tersebut dulu jika data lama perlu disimpan. Tabel kamar, tarif kamar, reservasi, pengguna/admin, dan data hotel lainnya tidak disentuh oleh migrasi ini.

## Urutan pemasangan

1. Buka proyek Supabase yang sama dengan variabel `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` pada Vercel.
2. Buka **SQL Editor → New query**, salin seluruh isi `supabase/migrations/20261023000013_restaurant_menu_cms.sql`, lalu jalankan sekali.
3. Ekstrak ZIP patch ke direktori utama proyek lokal (`hotel-le-medina`, folder yang memiliki `package.json`) dan izinkan file yang sama ditimpa. Jangan menaruh `app`, `components`, atau `supabase` di subfolder baru.
4. Jalankan `npm run build`. Jika berhasil, jalankan:

   ```bash
   git add -A
   git diff --cached --check
   git commit -m "Add Supabase restaurant menu CMS"
   git push origin main
   ```

5. Tunggu deployment Vercel berstatus **Ready**, lalu buka `/admin` → **Menu Restoran**.

## Cara menggunakan

1. Tekan **Tambah Menu**.
2. Isi nama menu, kategori (mis. `Makanan`, `Minuman`, `Dessert`), deskripsi jika ada, dan harga dalam Rupiah.
3. Pilih foto JPG/PNG/WebP/AVIF maksimum 4 MB. Foto akan diunggah ke bucket `restaurant-menu` dan URL publik disimpan di `restaurant_menu.image_url`.
4. Pilih apakah menu tersedia, lalu simpan. Kategori baru akan dibuat otomatis bila belum ada.
5. Untuk perubahan, tekan **Edit**. Tombol **Tersedia/Habis** menyimpan status ke Supabase, dan **Hapus** menghapus item dari tabel.

## Keamanan dan verifikasi

- Browser tidak menerima `SUPABASE_SERVICE_ROLE_KEY`; upload foto dilakukan oleh route server setelah autentikasi admin.
- Bucket foto bersifat public-read agar pengunjung dapat melihat foto hidangan, namun upload tetap melalui route admin.
- Jika endpoint mengembalikan `503`, pastikan `SUPABASE_SERVICE_ROLE_KEY` valid di environment server Vercel dan deployment sudah selesai.
- Jika upload foto gagal, periksa apakah migrasi membuat bucket `restaurant-menu` dan pastikan file tidak lebih dari 4 MB dalam format yang didukung.
- Peringatan Next.js tentang penggunaan `<img>` dapat muncul sebagai warning optimasi gambar; itu bukan error penyimpanan menu.
