import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, isSupabaseConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';
import { isDateAfter, isValidEmail, isValidISODate, isValidPhone, sanitizeString } from '../../../../lib/validation';

export const dynamic = 'force-dynamic';

function jakartaTodayISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function databaseUnavailable() {
  return NextResponse.json(
    { error: 'Fitur tamu offline memerlukan koneksi Supabase server dengan SUPABASE_SERVICE_ROLE_KEY yang valid.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

// GET /api/admin/walk-in-reservations?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// Returns rooms available for the exact date range, not just rooms free today.
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request, ['admin', 'reservation_staff']);
  if ('response' in authResult) return authResult.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return databaseUnavailable();

  const { searchParams } = new URL(request.url);
  const checkIn = String(searchParams.get('checkIn') || '').trim();
  const checkOut = String(searchParams.get('checkOut') || '').trim();
  if (!isValidISODate(checkIn) || !isValidISODate(checkOut) || !isDateAfter(checkOut, checkIn)) {
    return NextResponse.json({ error: 'Tanggal check-in dan check-out tidak valid.' }, { status: 400 });
  }
  if (checkIn < jakartaTodayISO()) {
    return NextResponse.json({ error: 'Tanggal check-in tidak boleh di masa lampau.' }, { status: 400 });
  }
  if ((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000 > 30) {
    return NextResponse.json({ error: 'Maksimum durasi inap adalah 30 malam.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('get_available_rooms_for_dates', {
    p_check_in: checkIn,
    p_check_out: checkOut,
  });
  if (error) {
    console.error('[admin/walk-in-reservations] availability RPC failed:', error.code || 'unknown', error.message || 'Database request failed');
    return NextResponse.json(
      { error: 'Gagal memeriksa ketersediaan kamar. Pastikan migrasi SQL tamu offline sudah diterapkan.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json({ rooms: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/admin/walk-in-reservations - creates a fixed-room booking transactionally.
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request, ['admin', 'reservation_staff']);
  if ('response' in authResult) return authResult.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return databaseUnavailable();

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Format data tamu offline tidak valid.' }, { status: 400 });
    }

    const roomId = sanitizeString((body as any).room_id, 64);
    const guestName = sanitizeString((body as any).guest_name, 100);
    const guestPhone = sanitizeString((body as any).guest_phone, 25);
    const rawEmail = sanitizeString((body as any).guest_email, 100).toLowerCase();
    const checkIn = String((body as any).check_in || '').trim();
    const checkOut = String((body as any).check_out || '').trim();
    const guestCount = Number((body as any).guest_count);
    const paymentMethod = String((body as any).payment_method || '').trim();
    const paymentStatus = String((body as any).payment_status || '').trim();
    const checkInNow = (body as any).check_in_now === true;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId)) {
      return NextResponse.json({ error: 'Pilih kamar yang valid dari daftar ketersediaan.' }, { status: 400 });
    }
    if (guestName.length < 2) return NextResponse.json({ error: 'Nama tamu minimal 2 karakter.' }, { status: 400 });
    if (!isValidPhone(guestPhone)) return NextResponse.json({ error: 'Nomor telepon harus berisi minimal 8 digit.' }, { status: 400 });
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      return NextResponse.json({ error: 'Jumlah tamu harus antara 1 sampai 20 orang.' }, { status: 400 });
    }
    if (!isValidISODate(checkIn) || !isValidISODate(checkOut) || !isDateAfter(checkOut, checkIn)) {
      return NextResponse.json({ error: 'Tanggal check-out harus setelah tanggal check-in.' }, { status: 400 });
    }
    if (checkIn < jakartaTodayISO()) return NextResponse.json({ error: 'Tanggal check-in tidak boleh di masa lampau.' }, { status: 400 });
    if ((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000 > 30) {
      return NextResponse.json({ error: 'Maksimum durasi inap adalah 30 malam.' }, { status: 400 });
    }
    if (checkInNow && checkIn !== jakartaTodayISO()) {
      return NextResponse.json({ error: 'Check-in langsung hanya tersedia untuk tanggal hari ini.' }, { status: 400 });
    }
    if (!['cash', 'bank_transfer', 'qris'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Pilih Cash, Transfer Bank, atau QRIS.' }, { status: 400 });
    }
    if (!['paid', 'unpaid'].includes(paymentStatus)) {
      return NextResponse.json({ error: 'Pilih status pembayaran yang valid.' }, { status: 400 });
    }
    if (rawEmail && !isValidEmail(rawEmail)) return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });

    // Reservations have a required email field; make a non-deliverable internal placeholder
    // when a walk-in guest does not provide one. No email is sent from this workflow.
    const email = rawEmail || `walkin+${guestPhone.replace(/\D/g, '').slice(-12)}@guest.lemedina.local`;
    const { data, error } = await supabaseAdmin.rpc('create_offline_walk_in_reservation', {
      p_room_id: roomId,
      p_guest_name: guestName,
      p_guest_email: email,
      p_guest_phone: guestPhone,
      p_guest_count: guestCount,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_payment_method: paymentMethod,
      p_payment_status: paymentStatus,
      p_check_in_now: checkInNow,
      p_actor: authResult.user.id || authResult.user.email || 'admin_panel',
    });

    if (error) {
      console.error('[admin/walk-in-reservations] create RPC failed:', error.code || 'unknown', error.message || 'Database request failed');
      const rawMessage = String(error.message || '').toLowerCase();
      const conflict = rawMessage.includes('sudah dipesan') || rawMessage.includes('tidak dalam kondisi tersedia') || error.code === '23505';
      const clientError = conflict || rawMessage.includes('tanggal') || rawMessage.includes('tamu harus') || rawMessage.includes('metode pembayaran') || rawMessage.includes('tarif') || rawMessage.includes('check-in langsung') || rawMessage.includes('nama tamu') || rawMessage.includes('nomor telepon') || rawMessage.includes('durasi inap') || rawMessage.includes('hanya mendukung tarif') || rawMessage.includes('kamar tidak ditemukan');
      return NextResponse.json(
        { error: conflict ? 'Kamar baru saja dipesan atau sudah tidak tersedia. Segarkan daftar kamar dan pilih kamar lain.' : clientError ? error.message : 'Gagal menyimpan tamu offline. Periksa konfigurasi migrasi SQL.' },
        { status: conflict ? 409 : clientError ? 400 : 500 },
      );
    }

    if (!data || (data as any).success !== true) {
      return NextResponse.json({ error: 'Database tidak mengonfirmasi penyimpanan tamu offline.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reservation: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/walk-in-reservations] Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Terjadi kesalahan saat menyimpan data tamu offline.' }, { status: 500 });
  }
}
