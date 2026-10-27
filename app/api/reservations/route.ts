import { NextRequest, NextResponse } from 'next/server';
import {
  createAtomicReservation,
  getReservasi,
  getRoomTypeById,
} from '../../../lib/data/store';
import { ReservationStatus } from '../../../lib/types';
import { requireAdminAuth } from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/rateLimit';
import {
  sanitizeString,
  isValidEmail,
  isValidPhone,
  isValidISODate,
  isDateTodayOrFuture,
  isDateAfter,
} from '../../../lib/validation';

// GET /api/reservations - Strictly guarded for authorized staff
export async function GET(request: NextRequest) {
  // 1. Enforce RBAC: Only staff and admins can view reservation records
  const authResult = await requireAdminAuth(request, [
    'super_admin',
    'admin',
    'reservation_staff',
    'receptionist_staff',
  ]);

  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ReservationStatus | null;
    const search = searchParams.get('search') ? sanitizeString(searchParams.get('search'), 50) : undefined;

    const reservations = await getReservasi({
      status: status || undefined,
      search,
    });

    return NextResponse.json({ reservations });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal memuat data reservasi. Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// POST /api/reservations - Public booking endpoint with strict security hardening
export async function POST(request: NextRequest) {
  // 1. Rate Limiting: Max 5 booking creations per minute per client IP
  const rateLimit = checkRateLimit(request, 'create_reservation', {
    limit: 5,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan pemesanan. Silakan coba kembali dalam ${rateLimit.resetInSeconds} detik.`,
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.resetInSeconds) },
      }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Format data reservasi tidak valid.' },
        { status: 400 }
      );
    }

    // 2. Extract and sanitize inputs
    const guest_name = sanitizeString(body.guest_name, 100);
    const guest_email = sanitizeString(body.guest_email, 100).toLowerCase();
    const guest_phone = sanitizeString(body.guest_phone, 25);
    const check_in = String(body.check_in || '').trim();
    const check_out = String(body.check_out || '').trim();
    const room_type_id = sanitizeString(body.room_type_id, 64);
    const special_requests = body.special_requests ? sanitizeString(body.special_requests, 500) : undefined;
    const promo_code = body.promo_code ? sanitizeString(body.promo_code, 32).toUpperCase() : undefined;
    const payment_method = body.payment_method === undefined ? 'pay_at_hotel' : String(body.payment_method);

    // Online payment is deliberately disabled until Midtrans merchant credentials and
    // verified webhook handling are configured. Never trust a UI-only disabled state.
    if (payment_method !== 'pay_at_hotel') {
      return NextResponse.json(
        { error: 'Pembayaran online belum tersedia. Silakan pilih Bayar di Hotel.' },
        { status: 409 }
      );
    }

    const adults = Math.max(1, Math.min(10, parseInt(body.adults, 10) || 1));
    const children = Math.max(0, Math.min(6, parseInt(body.children, 10) || 0));

    // 3. Validation checks
    if (!guest_name || guest_name.length < 2) {
      return NextResponse.json(
        { error: 'Nama tamu lengkap wajib diisi (minimal 2 karakter).' },
        { status: 400 }
      );
    }

    if (!isValidEmail(guest_email)) {
      return NextResponse.json(
        { error: 'Format alamat email tidak valid.' },
        { status: 400 }
      );
    }

    if (!isValidPhone(guest_phone)) {
      return NextResponse.json(
        { error: 'Nomor telepon/WhatsApp tidak valid (minimal 8 digit).' },
        { status: 400 }
      );
    }

    if (!isValidISODate(check_in) || !isValidISODate(check_out)) {
      return NextResponse.json(
        { error: 'Format tanggal harus YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (!isDateTodayOrFuture(check_in)) {
      return NextResponse.json(
        { error: 'Tanggal check-in tidak boleh di masa lampau.' },
        { status: 400 }
      );
    }

    if (!isDateAfter(check_out, check_in)) {
      return NextResponse.json(
        { error: 'Tanggal check-out harus setelah tanggal check-in.' },
        { status: 400 }
      );
    }

    // Max 30 days stay duration constraint
    const checkInDate = new Date(check_in + 'T00:00:00Z');
    const checkOutDate = new Date(check_out + 'T00:00:00Z');
    const nightDuration = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (nightDuration > 30) {
      return NextResponse.json(
        { error: 'Maksimum durasi pemesanan online langsung adalah 30 malam. Silakan hubungi bagian reservasi untuk periode lebih panjang.' },
        { status: 400 }
      );
    }

    // Verify room type exists and capacity
    const roomType = await getRoomTypeById(room_type_id);
    if (!roomType || !roomType.is_active) {
      return NextResponse.json(
        { error: 'Tipe kamar yang dipilih tidak valid atau sedang tidak aktif.' },
        { status: 400 }
      );
    }

    if (adults > roomType.max_adults) {
      return NextResponse.json(
        { error: `Kapasitas maksimum dewasa untuk tipe kamar ${roomType.name} adalah ${roomType.max_adults} orang.` },
        { status: 400 }
      );
    }

    // 4. Concurrency-safe atomic reservation creation (Price is recalculated strictly server-side)
    const reservation = await createAtomicReservation({
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults,
      children,
      room_type_id,
      special_requests,
      promo_code,
      payment_method: 'pay_at_hotel',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Reservasi berhasil dibuat. Metode pembayaran: Bayar di Hotel. Status pembayaran: Belum Dibayar.',
        reservation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memproses reservasi Anda.' },
      { status: 400 }
    );
  }
}
