# Tahap 2 — Workflow Pembayaran Le Médina

## Berkas dalam paket

- `supabase/migrations/20261023000007_payment_workflow_backend.sql`: RPC transaksional untuk membuat reservasi dengan pilihan Bayar di Hotel, pencatatan pembayaran offline yang idempoten, dan status pembayaran minimal pada lookup konfirmasi publik.
- `lib/types.ts`: tipe status/metode pembayaran.
- `lib/data/store.ts`: versi lengkap yang digunakan setelah perbaikan dashboard; menghubungkan booking ke RPC pembayaran dan menghitung pendapatan dari `payments` berstatus `paid`.
- `components/ContactBookingSection.tsx`: checkout menampilkan Bayar di Hotel aktif dan Online (QRIS/transfer) disabled sampai gateway benar-benar diintegrasikan; default tanggal dinamis dan preview harga memakai IDR.
- `app/api/reservations/route.ts`: POST membawa pilihan metode dan server menolak online sebelum gateway tersedia; GET reservasi admin tetap dilindungi auth.
- `app/api/reservations/[code]/route.ts`: PATCH status reservasi diwajibkan memiliki sesi admin/staf.
- `app/api/admin/payments/receive/route.ts`: endpoint staf menandai pembayaran hotel sebagai diterima melalui RPC transaksi.
- `app/api/admin/metrics/route.ts`: endpoint ringkasan dashboard ber-autentikasi.
- `app/admin/AdminDashboardClient.tsx`: status pembayaran dan tombol Catat Lunas; dashboard memuat ulang metrics setelah pembayaran dikonfirmasi.

## Urutan pemasangan

1. Pastikan migration `20261023000006_payment_workflow_foundation.sql` sudah dijalankan (query yang dikirim pengguna mengonfirmasi tabel/kolom sudah tersedia).
2. Jalankan SQL migration `20261023000007_payment_workflow_backend.sql` di Supabase SQL Editor sebelum deploy aplikasi.
3. Cadangkan lalu ganti file yang berada pada path persis sama di proyek kamu memakai file dari paket ini.
4. Jalankan `npm ci` (jika dependencies belum tersedia), lalu `npm run build`.
5. Commit, push ke `main`, tunggu Vercel berstatus Ready.
6. Uji satu reservasi baru metode Bayar di Hotel. Pastikan `reservations.payment_status = unpaid`, ada `payments.status = pending`, dan pendapatan tidak berubah.
7. Di admin tekan `Catat Lunas` hanya setelah pembayaran penuh benar-benar diterima. Pastikan reservation/payment status berubah jadi paid, `paid_at` terisi, `payment_events` berisi audit record, dan total pendapatan berubah otomatis.

## Batasan yang disengaja

- Midtrans belum terintegrasi. Opsi online sengaja disabled di UI dan endpoint server menolak `midtrans`; jangan mengaktifkannya hanya dengan mengubah env.
- Versi pertama hanya mencatat pembayaran penuh di hotel; pembayaran parsial/refund/rekonsiliasi belum diaktifkan pada UI.
- Pendapatan adalah total `payments.amount_idr` dengan `payments.status = paid`, bukan total booking dan bukan otomatis hanya karena check-out.
- Pastikan harga di database tetap IDR dan konvensi `reservations.total_amount_cents` dipertahankan: total IDR dikali 100. RPC wrapper mengonversi `total_amount_cents / 100` ke `payments.amount_idr`.

## Verifikasi sesudah uji

```sql
SELECT reservation_code, payment_method, payment_status, paid_at
FROM public.reservations
ORDER BY created_at DESC
LIMIT 10;

SELECT p.id, r.reservation_code, p.payment_method, p.status,
       p.amount_idr, p.currency, p.paid_at, p.received_by
FROM public.payments p
JOIN public.reservations r ON r.id = p.reservation_id
ORDER BY p.created_at DESC
LIMIT 10;

SELECT event_type, actor, notes, created_at
FROM public.payment_events
ORDER BY created_at DESC
LIMIT 20;
```


## Hasil pemeriksaan lokal pada paket ini

- TypeScript/TSX parse check: seluruh file pengganti lolos pemeriksaan sintaks.
- `npm ci` pada lingkungan pembuatan paket timeout, dan `npm run build` tidak dapat dijalankan karena executable `next` belum tersedia. Karena itu, build Next.js penuh belum dinyatakan lulus. Jalankan `npm ci` lalu `npm run build` di komputer proyek sebelum push ke GitHub.
