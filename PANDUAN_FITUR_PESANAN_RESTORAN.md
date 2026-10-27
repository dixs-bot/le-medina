# Fitur Pesanan Restoran Le Médina

## 1. Jalankan migrasi Supabase
1. Buka Supabase Dashboard proyek hotel.
2. Masuk ke **SQL Editor** → **New query**.
3. Salin seluruh isi `supabase/migrations/20261027000001_restaurant_orders.sql`, lalu tekan **Run**.
4. Pastikan tabel `restaurant_orders` dan `restaurant_order_items` muncul di Table Editor.

## 2. Environment Vercel
Pastikan environment server memuat:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, jangan memakai awalan `NEXT_PUBLIC_` dan jangan pernah membagikannya)

Setelah migrasi dan perubahan environment, redeploy aplikasi.

## 3. Cara uji
1. Buka halaman publik dan bagian Restoran.
2. Tambah menu ke keranjang, isi nama dan kamar (atau pilih pengunjung), pilih pembayaran, lalu buat pesanan.
3. Simpan kode pesanan dan gunakan bagian **Lacak Pesanan**.
4. Buka `/admin` → **Pesanan** (posisinya di atas Menu Restoran), ubah status ke Diproses lalu Sudah siap.
5. Kembali ke pelacakan pelanggan; status diperbarui otomatis sekitar setiap 10 detik.
6. Klik **Unduh Struk POS** di admin. File HTML disiapkan dengan layout thermal 80 mm; buka file dan cetak melalui dialog print browser. Kertas 58 mm perlu penyesuaian CSS.

## Catatan pembayaran
Transfer dan QRIS masih simulasi. Tidak ada verifikasi transfer, QRIS, atau penerimaan uang. Jangan tampilkan nomor rekening atau QR palsu. Setelah hotel memberikan rekening/QRIS resmi, integrasikan payment gateway atau alur verifikasi yang disetujui.

## Catatan operasional
- Pesanan memakai harga menu yang tersimpan di database saat dikirim dan item pesanan menyimpan snapshot nama/harga.
- API publik hanya memberi akses pelacakan berdasarkan kode pesanan; admin perlu login dan role yang diizinkan.
- Struk yang diunduh adalah HTML siap cetak, belum koneksi langsung ke perangkat POS.
- Jalankan pengujian di staging terlebih dahulu. Build proyek belum dapat diverifikasi di lingkungan penyusunan ini karena dependensi npm tidak terpasang.
