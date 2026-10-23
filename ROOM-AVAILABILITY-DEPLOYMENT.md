# Hôtel Le Médina — Perbaikan Inventaris & Reservasi Kamar

## Perubahan yang disertakan

- Menggunakan tiga tipe kamar aktif: **Standar**, **Royale**, dan **Premium**. Harga `base_price_cents` di database tidak diubah oleh migrasi.
- Menyiapkan 10 nomor kamar awal: Standar 101–104, Royale 201–204, Premium 301–302.
- Menampilkan nomor kamar dan penanda **“Kamar ini sudah dipesan orang”** pada modal berdasarkan tanggal check-in/check-out yang dipilih.
- Formulir booking mengecek jumlah kamar tersedia; jika tipe kamar penuh, pelanggan diminta memilih tipe lain atau mengubah tanggal.
- Fungsi reservasi atomik mengecek rentang tanggal pada reservasi aktif dan baris kalender malam kamar, serta tetap mempertahankan batas unik kamar/tanggal.
- Status kamar di dashboard admin dihitung dari reservasi yang aktif pada tanggal operasional Jakarta: tersedia, Reserved, atau Sudah Ditempati.
- Saat reservasi diubah menjadi **Sudah Check-Out** atau **Dibatalkan**, baris okupansi hari ini dan tanggal sesudahnya dilepas. Riwayat malam sebelumnya tetap disimpan.
- Nomor kamar aktual dikembalikan di ringkasan booking ketika pencarian nomor kamar berhasil.

## Penerapan di Supabase

1. Jika migrasi `20261023000008_fix_stale_reservation_nights.sql` **belum** diterapkan, jalankan SQL tersebut terlebih dahulu di Supabase → SQL Editor.
2. Jalankan `20261023000009_room_inventory_and_checkout_release.sql` di SQL Editor. Migrasi 9 mendefinisikan ulang allocator yang lebih aman, mengatur nama tipe dan inventaris kamar, serta memasang trigger check-out/pembatalan. Migrasi ini mempertahankan harga dan ID tipe kamar.
3. Lihat hasil query verifikasi di bagian akhir migrasi 9. Inventaris aktif yang diharapkan adalah Standar 4, Royale 4, Premium 2.

Jalankan file SQL, bukan file ZIP, di SQL Editor. Jangan menghapus reservasi lama secara manual. Jika kamar tipe lama masih direferensikan reservasi, migrasi mempertahankan record itu sebagai data lama; baris tersebut tidak ditawarkan sebagai tipe kamar aktif.

## Penerapan di repository lokal

1. Ekstrak ZIP patch di root repository yang berisi `package.json`, lalu izinkan file pada path yang sama ditimpa.
2. Jalankan:

```bash
npm run build
```

3. Jika build berhasil, tambahkan perubahan:

```bash
git add app/admin/AdminDashboardClient.tsx app/api/availability/route.ts components/ContactBookingSection.tsx components/PublicInteractiveWrapper.tsx components/RoomModal.tsx components/RoomsCatalog.tsx lib/data/seed.ts lib/data/store.ts lib/types.ts supabase/migrations/20261023000008_fix_stale_reservation_nights.sql supabase/migrations/20261023000009_room_inventory_and_checkout_release.sql
```

4. Lalu:

```bash
git diff --cached --check
git diff --cached --name-only
git commit -m "Fix room availability and checkout release"
git push origin main
```

Setelah deployment Vercel berhasil, uji satu reservasi untuk tanggal tertentu, coba buka modal tipe kamar yang sama pada rentang tanggal tersebut, lalu pastikan nomor kamar tampil sebagai sudah dipesan. Ubah reservasi menjadi **Sudah Check-Out** di admin, buka kembali modal untuk tanggal yang sudah dilepas, dan pastikan statusnya kembali tersedia sesuai tanggal yang diperiksa.

## Catatan verifikasi

Sintaks TypeScript/TSX untuk semua file yang diubah telah diperiksa dan lolos pemeriksaan sintaks. Build Next.js penuh tidak dapat dijalankan di lingkungan pembuatan patch karena dependensi lokal tidak lengkap dan pemasangan paket tidak selesai. Karena itu, jalankan `npm run build` di repository lokal sebelum push.
