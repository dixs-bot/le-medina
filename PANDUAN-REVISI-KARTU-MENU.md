# Revisi Kartu Menu Pesan Makanan

Perubahan:
- Katalog menu menggunakan grid responsif 1/2/3/4 kolom sesuai ukuran layar.
- Foto menu diambil dari `image_url` yang sudah ada pada data `restaurant_menu` dan diisi melalui panel admin.
- Ada fallback jika foto belum diunggah.
- Keranjang menampilkan kuantitas, subtotal item, dan total.
- Form data pemesan/pembayaran baru ditampilkan setelah keranjang berisi item.
- Endpoint dan alur penyimpanan pesanan yang sudah ada tetap digunakan.

Setelah mengganti file, jalankan `npm run build`, lalu uji di lokal. Pastikan gambar yang diunggah lewat admin tersimpan pada kolom `image_url` dan URL gambar bisa diakses dari browser.
