# Panduan pemasangan — Pengaturan Sistem, akun staf, sif, dan audit admin

Patch ini menambahkan:

- Pengaturan informasi hotel yang menyimpan ke `public.site_settings` dengan `key = 'hotel_info'`. Nomor WhatsApp, telepon, email, dan alamat yang tersimpan menjadi sumber bagi website publik yang membaca pengaturan hotel dari Supabase.
- Profil admin/staf per akun: nama tampilan, nomor telepon staf, dan foto profil yang disimpan pada bucket Supabase Storage `admin-avatars`.
- Pemilihan sif Pagi/Siang/Malam saat login.
- Pembuatan akun staf melalui Supabase Auth dan pemberian role `admin`, `reservation_staff`, atau `content_editor` oleh owner.
- Aktivasi/nonaktif akun staf. API memeriksa status akun aktif dan role terkini dari database.
- Audit trail untuk login/logout, perubahan pengaturan hotel, profil, akun staf, status reservasi, pembayaran offline, kamar/tarif, dan menu restoran. Log menyimpan identitas admin, waktu server, aksi, target, dan IP bila tersedia.

## Urutan pemasangan (penting)

### 1. Cadangkan database

Sebelum SQL, ekspor tabel `profiles` dan `user_roles` atau pastikan Anda punya backup. Migrasi menambah kolom `is_active`, membuat tabel audit, mengatur hak akses `service_role`, dan membuat bucket foto. Tidak menghapus akun atau reservasi.

### 2. Jalankan migrasi 14 sebelum deploy kode

Di Supabase → SQL Editor → New query, salin seluruh isi:

`supabase/migrations/20261023000014_admin_profiles_shift_audit.sql`

Jalankan dan pastikan berhasil. **Jalankan migrasi ini sebelum deploy kode**, karena API/page berikutnya membaca kolom `profiles.is_active`.

### 3. Pastikan akun owner memiliki role `super_admin`

Bagian pengelolaan akun hanya dapat dilihat oleh `super_admin`. Bila akun owner Anda saat ini hanya ber-role `admin`, buka file `20261023000015_promote_hotel_owner_to_super_admin.sql`, ganti `GANTI_DENGAN_EMAIL_OWNER@example.com` menjadi email akun owner yang sudah memiliki profil di Supabase Auth, lalu jalankan SQL itu di Supabase SQL Editor. File ini tidak membuat akun baru dan tidak mengubah kata sandi.

Setelah perubahan role, **keluar dari panel admin lalu login kembali** supaya tampilan memuat role terbaru.

### 4. Pasang file kode

Ekstrak ZIP patch ke folder proyek Next.js yang memiliki `package.json`. Pertahankan struktur folder dan izinkan file bernama sama ditimpa. ZIP tidak berisi `node_modules`, `.env`, atau kunci rahasia.

### 5. Build secara lokal

Di Git Bash pada folder proyek:

```bash
npm run build
```

Jangan push bila build gagal. Periksa error build terbaru terlebih dahulu.

### 6. Commit dan push

Jika build berhasil:

```bash
git add -A
git diff --cached --check
git commit -m "Add admin shifts, account management and profile settings"
git push origin main
```

Kemudian pastikan deployment Vercel berstatus **Ready**. Pastikan environment Vercel memakai `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` dari **proyek Supabase yang sama**.

## Uji setelah deployment

1. Logout, login kembali dengan akun owner, pilih sif yang sedang dijaga.
2. Buka Pengaturan Sistem dan simpan nomor WhatsApp serta kontak hotel yang benar.
3. Refresh website publik dan tekan CTA WhatsApp untuk memastikan tujuan mengikuti nomor baru.
4. Di Profil Admin, upload foto JPG/PNG/WebP maksimal 4 MB; nama dan foto semestinya tampil di header panel.
5. Di bagian Akun Admin, buat akun khusus tiap staf dengan email sendiri, role yang sesuai, dan kata sandi awal berbeda.
6. Minta staf login dengan sif masing-masing, lakukan perubahan yang memang diperlukan, lalu logout. Periksa Audit Aktivitas Admin.
7. Nonaktifkan akun uji dan pastikan akses API-nya ditolak. Jangan nonaktifkan satu-satunya akun owner.

## Batasan dan catatan keamanan

- Audit bersifat **ke depan** setelah migrasi/kode terpasang; tidak dapat merekonstruksi aktivitas sebelum fitur ini aktif.
- Log login/logout dan perubahan aplikasi membantu pemeriksaan, tetapi tidak membuktikan sendiri siapa yang secara fisik berada di meja resepsionis. Jangan berbagi akun antarpetugas.
- Pilihan sif dicatat saat login. Staf perlu memilih sif yang benar pada setiap login/pergantian sif.
- Foto disimpan pada bucket `admin-avatars` publik supaya foto profil dapat dimuat di header. Jangan unggah foto identitas sensitif; gunakan foto profil kerja.
- Akun `admin` dapat mengelola kegiatan operasional, namun daftar akun dan audit lengkap hanya tersedia bagi `super_admin`.
- Build Next.js penuh belum diverifikasi dalam lingkungan pembuat patch karena dependency Next.js tidak tersedia lengkap. Sintaks TS/TSX pada file yang disentuh telah diperiksa; tetap jalankan `npm run build` pada komputer proyek sebelum push.
