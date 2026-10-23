# Fitur Tamu Walk-in / Resepsionis — Hôtel Le Médina

## Isi fitur

- Resepsionis/admin dapat mencatat nama tamu, nomor telepon, email opsional, jumlah orang, tanggal check-in/check-out, kamar fisik, metode pembayaran, dan status pembayaran.
- Daftar pilihan kamar berasal dari Supabase dan difilter untuk rentang tanggal yang dipilih.
- Saat disimpan, fungsi PostgreSQL mengunci baris kamar, memeriksa bentrok dari reservasi aktif maupun catatan malam kamar, membuat reservasi, menetapkan kamar, membuat `reservation_nights`, menulis catatan pembayaran, dan mencatat audit di dalam satu transaksi.
- Secara default, entri baru hanya berstatus **Reserved**. Resepsionis mencentang **Check-In sekarang** hanya ketika tamu memang sudah menerima kamar; untuk check-in hari ini, status menjadi **Sudah Ditempati**.
- Jika opsi **Tamu langsung menempati kamar (Check-In sekarang)** dicentang pada tanggal hari ini, status reservasi menjadi `checked_in` dan inventaris menunjukkan **Sudah Ditempati**. Jika tidak dicentang, status awal menjadi `confirmed` dan inventaris menunjukkan **Reserved** untuk tanggal operasionalnya.
- Status pembayaran default **Belum dibayar** agar pendapatan tidak bertambah sebelum pembayaran diverifikasi. Pilih **Sudah dibayar / Lunas** hanya jika uang benar-benar diterima.
- Cash, Transfer Bank, dan QRIS dicatat sebagai metode pembayaran offline. Ini belum menginisiasi pembayaran QRIS atau transfer secara otomatis.

## Prasyarat

Pastikan migrasi payment workflow 6, backend 7, perbaikan bentrok 8, dan inventaris kamar 9 sudah diterapkan pada proyek Supabase. Migration 10 pada paket ini hanya perlu diterapkan satu kali; migrasi tersebut aman untuk dijalankan ulang karena fungsi dibuat dengan `CREATE OR REPLACE` dan constraint metode pembayaran diganti dengan cara drop/add.

## Pemasangan

1. Buka proyek lokal dan ekstrak patch ZIP ke folder utama yang berisi `package.json`. Pertahankan jalur folder di dalam ZIP.
2. Di Supabase Dashboard, buka **SQL Editor → New query**.
3. Salin dan jalankan isi `supabase/migrations/20261023000010_offline_walkin_reservations.sql`.
4. Jalankan `npm run build` di terminal lokal. Pastikan build bersih sebelum commit.
5. Commit file patch dan push ke `main` untuk memicu deployment Vercel.

## Pengujian manual

1. Masuk ke `/admin`, buka **Daftar Reservasi → Tambah Tamu Offline**.
2. Isi nama, nomor telepon, jumlah orang, tanggal inap, metode pembayaran, dan pilih kamar tersedia seperti 102.
3. Untuk membuatnya langsung ditempati, biarkan opsi **Check-In sekarang** tercentang; untuk hanya menahan kamar, hapus centangnya.
4. Simpan. Kode reservasi dan status akan muncul di dashboard. Tab **Kamar & Inventaris** akan menunjukkan status operasionalnya setelah dashboard disegarkan.
5. Buka modal pemesanan publik dan cek rentang tanggal yang sama. Kamar yang baru dialokasikan tidak boleh muncul sebagai kamar tersedia untuk rentang tersebut.
6. Ulangi pada dua sesi admin dengan kamar dan tanggal sama. Permintaan kedua harus ditolak dengan pesan bahwa kamar sudah dipesan.

## Catatan pembayaran

`reservations.payment_method` tetap bernilai `pay_at_hotel` karena kolom tersebut menyatakan rute pembayaran offline. Detail `cash`, `bank_transfer`, atau `qris` disimpan pada `payments.payment_method`. Pendapatan hanya masuk saat status pembayaran `paid`.
