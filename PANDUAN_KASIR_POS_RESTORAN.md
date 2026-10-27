# Kasir Offline / POS Restoran Le Médina

## Fitur
- Menu dan harga diambil dari `restaurant_menu` yang dikelola lewat CMS admin.
- Kasir bisa memilih item, mengubah jumlah, mengisi nama pembeli, catatan, dan metode pembayaran.
- Cash disimpan sebagai pembayaran diterima. Transfer/QRIS masih simulasi dan tidak dihitung ke pendapatan diterima.
- Transaksi disimpan ke `restaurant_orders` dan `restaurant_order_items` dengan `order_source = 'pos'`.
- Laporan pendapatan restoran hari ini, minggu ini (Senin–Minggu), bulan ini, dan total tersedia pada tab Kasir Offline / POS; pembaruan otomatis setiap 30 detik.

## Instalasi database
1. Buka Supabase Dashboard > SQL Editor.
2. Jalankan `supabase/migrations/20261027000002_restaurant_pos_and_revenue.sql` setelah migration `20261027000001_restaurant_orders.sql` sudah diterapkan.
3. Pastikan environment server Vercel sudah memiliki `SUPABASE_SERVICE_ROLE_KEY` dan URL Supabase yang benar. Jangan expose service role key ke browser.

## Cara menggunakan
1. Login ke panel admin.
2. Klik navigasi **Kasir Offline / POS** yang berada tepat di atas **Pesanan**.
3. Pilih menu, atur jumlah, isi nama pembeli, pilih Cash / Transfer simulasi / QRIS simulasi, lalu simpan transaksi.
4. Pendapatan hanya bertambah pada pembayaran dengan status diterima. Transfer/QRIS dummy tidak masuk ke angka pendapatan sampai nanti metode pembayaran asli terverifikasi.

## Catatan laporan
Endpoint laporan saat ini adalah laporan divisi restoran. Laporan gabungan owner (hotel + restoran) harus menjumlahkan pendapatan hotel dari tabel pembayaran yang tervalidasi dan pendapatan restoran yang telah diterima, sambil memisahkan sumber/divisi agar tidak menghitung pembayaran simulasi sebagai uang masuk.
