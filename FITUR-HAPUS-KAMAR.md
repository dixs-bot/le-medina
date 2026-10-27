# Fitur Hapus Kamar — Hôtel Le Médina

## Perubahan
- Menambahkan tombol **Hapus Kamar** pada setiap kartu di bagian **Kamar & Inventaris > Daftar Kamar dari Database**.
- Tombol hanya tampil untuk peran yang sudah diizinkan mengelola katalog kamar (`canManageRoomCatalog`).
- Ada konfirmasi sebelum menghapus.
- Penghapusan melalui endpoint server `/api/admin/room-management` dan Supabase service role yang sudah ada.
- Sistem menolak menghapus kamar yang terhubung dengan `reservations.assigned_room_id` atau `reservation_nights`, agar riwayat reservasi/alokasi tidak rusak.
- Aksi penghapusan dicatat ke audit log sebagai `room_deleted`.

## Pemasangan
1. Backup repository.
2. Ekstrak ZIP ke folder proyek, gabungkan file dengan struktur folder yang sama.
3. Jalankan `npm run build`.
4. Jika build sukses, cek `git diff` lalu commit dan push.

Tidak ada migrasi SQL baru. Fitur memakai tabel `rooms`, `reservations`, dan `reservation_nights` yang sudah ada di schema proyek.

## Push GitHub
```bash
git status
git add app/admin/AdminDashboardClient.tsx app/api/admin/room-management/route.ts
git diff --cached --check
git commit -m "feat: add safe room deletion in admin inventory"
git pull --rebase origin main
git push origin main
```

Jika `git pull --rebase` menyatakan sudah up to date, lanjutkan `git push origin main`. Jika kamar sudah punya histori reservasi, sistem akan menolak penghapusan dan menyarankan status pemeliharaan/ditutup demi menjaga histori.
