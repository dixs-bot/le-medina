# Rekap Bulanan Restoran — CSV dan PDF

## File yang diubah
- `app/admin/AdminDashboardClient.tsx`: menambahkan pemilih bulan, ringkasan pendapatan bulanan, tabel transaksi, ekspor CSV, dan cetak/simpan sebagai PDF.
- `app/api/admin/restaurant-revenue-report/route.ts`: endpoint terproteksi untuk mengambil pesanan restoran dan detail item per bulan dari Supabase.

## Pemasangan
1. Backup file lama.
2. Gabungkan kedua file sesuai path ke proyek lokal.
3. Pastikan migrasi tabel `restaurant_orders` dan `restaurant_order_items` serta kolom `order_source` sudah diterapkan.
4. Jalankan `npm run build`.
5. Uji tab Kasir Offline / POS Restoran, pilih bulan, klik Tampilkan, lalu coba Unduh CSV dan Cetak / Simpan PDF.

## Aturan pendapatan
Pendapatan diterima dihitung hanya dari transaksi `payment_status = 'paid_at_restaurant'` yang tidak dibatalkan. Transfer dan QRIS simulasi tetap ditampilkan sebagai transaksi, tetapi tidak dimasukkan ke pendapatan diterima. PDF dibuka melalui dialog cetak browser; pilih “Save as PDF”. Zona waktu laporan adalah Asia/Jakarta.

Tidak ada migrasi SQL baru untuk fitur laporan ini.
