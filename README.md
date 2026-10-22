# Hôtel Le Médina & Resto Singkawang — Web Platform (Hardened Edition)

Platform web resmi, katalog kamar, sistem pemesanan langsung (*direct booking engine*), dan dasbor manajemen operasional **Hôtel Le Médina & Resto Singkawang**. Dibangun dengan arsitektur modern Next.js 14 App Router, TypeScript, Tailwind CSS, serta integrasi database Supabase PostgreSQL dengan pengamanan tingkat enterprise.

---

## 🛡️ Ikhtisar Hardening & Fitur Keamanan

Proyek ini telah melalui audit dan pengerasan keamanan (*security hardening*) komprehensif:

1. **Autentikasi & RBAC Server-Side**:
   - Akses `/admin` dilindungi verifikasi sesi server (*Server Component gate*) via cookie `admin_session` yang ditandatangani dengan algoritma HMAC-SHA256 (`lib/auth.ts`).
   - Mendukung integrasi token Supabase Auth JWT maupun otentikasi admin lokal/demo yang aman.
   - Hak akses berjenjang (*Least Privilege*):
     - `super_admin`: Izin penuh (kelola hak akses, pengaturan sistem, reservasi, tarif, konten).
     - `admin`: Izin operasional penuh (reservasi, kamar, tarif, konten, pengaturan).
     - `reservation_staff`: Khusus pemrosesan reservasi dan status tamu.
     - `content_editor`: Khusus pengelolaan menu restoran, penawaran promo, fasilitas, dan galeri.
   - Mencegah manipulasi peran dari sisi browser (*client-side role tampering*).

2. **Pengerasan API Reservasi**:
   - **Perhitungan Harga Wajib di Server**: API `POST /api/reservations` mengabaikan seluruh nilai harga dari klien dan selalu menghitung total biaya berdasarkan tarif dasar kamar, tarif musiman, dan validasi kode promo secara server-side.
   - **Rate Limiting Aktif**: Pembatasan laju permintaan berbasis IP klien (`lib/rateLimit.ts`):
     - Pembuatan reservasi: maks 5 permintaan per menit.
     - Pengecekan ketersediaan: maks 30 permintaan per menit.
     - Pelacakan kode reservasi: maks 30 permintaan per menit.
   - **Validasi Input Ketat**:
     - Sanitasi string untuk mencegah injeksi XSS dan HTML.
     - Validasi format ISO tanggal `YYYY-MM-DD`, validasi tanggal check-in masa depan, dan urutan check-out.
     - Batas maksimum masa inap 30 malam.
     - Validasi kapasitas kamar (dewasa dan anak).
   - **Pencegahan Double-Booking & Konkurensi**:
     - *In-memory concurrency mutex lock* pada `lib/data/store.ts`.
     - Fungsi database Supabase RPC `create_atomic_reservation` dengan mekanisme `FOR UPDATE SKIP LOCKED`.
   - **Kode Reservasi Kriptografis**: Dihasilkan menggunakan `crypto.randomBytes` (format `MED-XXXXXXXX`).
   - **Perlindungan Privasi Tamu**: `GET /api/reservations` dilindungi RBAC khusus staf/admin. Endpoint publik pelacakan kode reservasi menghapus catatan internal staf (*internal notes*).

3. **Row Level Security (RLS) & Supabase**:
   - Memperbaiki celah RLS pada tabel `reservations`: Menghapus kebijakan `USING (true)` publik yang rentan kebocoran data.
   - Mengunci pembacaan langsung seluruh tabel reservasi hanya untuk peran `reservation_staff`, `admin`, dan `super_admin`.
   - Melindungi seluruh fungsi database `SECURITY DEFINER` dengan `SET search_path = public, pg_temp` untuk memitigasi kerentanan *Search Path Hijacking* (CWE-426).

4. **HTTP Security Headers**:
   - `X-Frame-Options: DENY` (mencegah *clickjacking*).
   - `X-Content-Type-Options: nosniff` (mencegah *MIME sniffing*).
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Permissions-Policy` membatasi fitur sensor/perangkat.
   - `poweredByHeader: false` di `next.config.mjs`.

---

## 🚀 Panduan Memulai Cepat (Local Setup)

### 1. Prasyarat
- **Node.js**: Versi 18.18+ atau 20+ LTS
- **npm**: Versi 9+ atau 10+

### 2. Instalasi Dependensi
```bash
# Clone atau ekstrak proyek
cd le-medina-main

# Pasang paket dependensi
npm install
```

### 3. Konfigurasi Lingkungan (.env.local)
Salin berkas template lingkungan:
```bash
cp .env.example .env.local
```

Buka `.env.local` dan sesuaikan nilainya:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ADMIN_SECRET_KEY=rahasia-keamanan-admin-minimal-32-karakter-acak-2026!
ADMIN_DEFAULT_PASSWORD=MedinaAdmin2026!
NEXT_PUBLIC_HOTEL_NAME="Hôtel Le Médina & Resto Singkawang"
NEXT_PUBLIC_HOTEL_WHATSAPP="+628115708899"
PORT=5173
```

> **Catatan**: Aplikasi ini dirancang tangguh (*graceful fallback*). Jika kredensial Supabase belum diisi, aplikasi akan otomatis menggunakan modul penyimpanan memori bawaan dengan data seed lengkap sehingga seluruh alur halaman publik dan dasbor admin tetap berfungsi 100%.

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi melalui peramban di: **`http://localhost:5173`**

### 5. Membangun untuk Produksi
```bash
# Verifikasi tipe TypeScript
npx tsc --noEmit

# Buat build teroptimasi
npm run build

# Jalankan server produksi lokal
npm start
```

---

## 🔑 Kredensial Akses Dasbor Admin

Buka **`http://localhost:5173/admin`** pada browser. Anda akan disambut oleh halaman login admin yang terproteksi.

Gunakan kredensial pengelola berikut:
- **Email**: `admin@lemedina.id` (atau `superadmin@lemedina.id`, `reservasi@lemedina.id`, `editor@lemedina.id`)
- **Kata Sandi**: `MedinaAdmin2026!` (sesuai nilai `ADMIN_DEFAULT_PASSWORD` di `.env.local`)
- **Persona RBAC**: Pilih peran akses yang ingin diuji.

---

## 🗄️ Penerapan Migrasi Database Supabase

Jika menghubungkan ke instance Supabase PostgreSQL mandiri, jalankan berkas migrasi SQL secara berurutan melalui **Supabase Dashboard > SQL Editor**:

1. `supabase/migrations/20261022000001_initial_schema.sql` (Skema tabel hotel & relasi)
2. `supabase/migrations/20261022000002_rls_policies.sql` (Kebijakan Row Level Security berorientasi RBAC)
3. `supabase/migrations/20261022000003_rpc_functions.sql` (Fungsi RPC ketersediaan, dynamic pricing, & atomic booking)
4. `supabase/migrations/20261022000004_seed_data.sql` (Data inisialisasi kamar, restoran, fasilitas, & ulasan)
5. `supabase/migrations/20261022000005_security_hardening.sql` (Patch pengerasan RLS reservations & pencegahan CWE-426)

---

## ☁️ Panduan Deployment (Vercel & GitHub)

### Langkah Deploy ke Vercel:
1. Hubungkan repository GitHub ke akun **Vercel**.
2. Pengaturan Framework Preset: **Next.js**.
3. Konfigurasikan **Environment Variables** di dashboard Vercel:
   - `ADMIN_SECRET_KEY`: Buat string acak unik dengan panjang minimal 32 karakter.
   - `ADMIN_DEFAULT_PASSWORD`: Kata sandi administrator yang kuat.
   - `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase produksi.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (jangan bocorkan ke publik).
   - `NEXT_PUBLIC_HOTEL_NAME`: "Hôtel Le Médina & Resto Singkawang".
   - `NEXT_PUBLIC_HOTEL_WHATSAPP`: Nomor WhatsApp resmi hotel (+62...).
4. Klik **Deploy**. Vercel akan menjalankan `npm run build` secara otomatis.
5. Verifikasi bahwa halaman utama, formulir pemesanan, dan halaman `/admin` dapat diakses dengan respons cepat dan sertifikat HTTPS aktif.

---

## 📄 Struktur Berkas Proyek

```
le-medina-main/
├── app/
│   ├── admin/
│   │   ├── AdminDashboardClient.tsx   # Komponen interaktif dasbor admin (RBAC)
│   │   └── page.tsx                   # Server guard halaman admin
│   ├── api/
│   │   ├── admin/
│   │   │   ├── login/route.ts         # Endpoint autentikasi admin & penerbitan token sesi
│   │   │   ├── logout/route.ts        # Endpoint penghapusan cookie sesi
│   │   │   └── me/route.ts            # Endpoint pengecekan status sesi admin
│   │   ├── availability/route.ts      # Endpoint cek ketersediaan kamar & tarif (Rate-limited)
│   │   └── reservations/
│   │       ├── route.ts               # GET (RBAC Staff/Admin), POST (Pemesanan aman & server pricing)
│   │       └── [code]/route.ts        # GET (Pelacakan aman kode reservasi), PATCH (Update status RBAC)
│   ├── confirmation/[code]/page.tsx   # Halaman ringkasan konfirmasi reservasi tamu
│   ├── globals.css                    # Styling global Tailwind & variabel CSS
│   ├── layout.tsx                     # Layout utama, metadata SEO, font Playfair & Plus Jakarta Sans
│   └── page.tsx                       # Halaman beranda utama publik
├── components/                        # Komponen UI publik (Navbar, Hero, Katalog, Restoran, dll.)
│   └── AdminLoginView.tsx             # Antarmuka login admin elegan dan terproteksi
├── lib/
│   ├── auth.ts                        # Modul otentikasi server-side, HMAC session tokens & RBAC
│   ├── rateLimit.ts                   # Modul pelindung pembatasan laju permintaan (Rate limiting)
│   ├── validation.ts                  # Sanitasi input XSS, validasi email, telepon, & ISO tanggal
│   ├── supabaseClient.ts              # Inisialisasi client Supabase tangguh
│   ├── types.ts                       # Definisi antarmuka TypeScript lengkap
│   ├── utils.ts                       # Utilitas format mata uang IDR & tanggal Indonesia
│   └── data/
│       ├── seed.ts                    # Data seed hotel berbahasa Indonesia
│       └── store.ts                   # Modul penyimpanan tangguh dengan mutex lock konkurensi
├── supabase/
│   └── migrations/                    # Skema SQL, RLS policies, RPC functions, & security patch
├── middleware.ts                      # Next.js Edge Middleware untuk HTTP security headers
├── next.config.mjs                    # Konfigurasi Next.js dengan custom security headers
├── tailwind.config.js                 # Konfigurasi palet warna mewah (forest, gold, ivory, charcoal)
└── tsconfig.json                      # Konfigurasi TypeScript ketat
```

---

&copy; 2026 **Hôtel Le Médina & Resto Singkawang**. Hak cipta dilindungi undang-undang.
