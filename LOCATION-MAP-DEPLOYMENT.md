# Lokasi Hotel: Peta, jarak perangkat, dan navigasi

Patch ini mengganti `components/LocationSection.tsx`.

## Perubahan
- Mengganti gambar dekoratif yang menyerupai peta dengan embed Google Maps berisi koordinat lokasi Hôtel Le Médina.
- Menghilangkan panel alamat/tempat sekitar yang lama sehingga hanya ada satu peta utama.
- Menambahkan tombol **Cek jarak saya** yang meminta izin lokasi browser dan menghitung jarak garis lurus menggunakan koordinat GPS/perangkat.
- Menambahkan CTA **Navigasi ke Hotel** ke Google Maps. Bila lokasi perangkat sudah diperoleh, URL menyertakan origin; bila belum, Google Maps tetap diarahkan ke tujuan hotel.

## Koordinat
- Latitude: `0.8922778`
- Longitude: `108.9696696`

Jarak yang dihitung pada halaman adalah jarak garis lurus (haversine), bukan jarak berkendara. Google Maps menghitung rute jalan ketika pengguna menekan tombol navigasi. Geolocation membutuhkan persetujuan pengguna serta konteks HTTPS (website Vercel sudah menggunakan HTTPS).

## Instalasi
Timpa file `components/LocationSection.tsx` di folder proyek dengan file pada patch ZIP ini. Tidak memerlukan migrasi SQL atau perubahan environment variables.

Jalankan:

```bash
npm run build
```

Jika build berhasil:

```bash
git add components/LocationSection.tsx
git diff --cached --check
git commit -m "Replace location section with Google Maps and navigation"
git push origin main
```
