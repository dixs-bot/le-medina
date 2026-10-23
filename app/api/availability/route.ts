import { NextRequest, NextResponse } from 'next/server';
import {
  getRoomAvailabilityDetails,
  calculateStayPricing,
  getRoomTypeById,
} from '../../../lib/data/store';
import { checkRateLimit } from '../../../lib/rateLimit';
import {
  sanitizeString,
  isValidISODate,
  isDateTodayOrFuture,
  isDateAfter,
} from '../../../lib/validation';

export async function GET(request: NextRequest) {
  // 1. Rate limiting: Max 30 availability checks per minute per IP
  const rateLimit = checkRateLimit(request, 'check_availability', {
    limit: 30,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan pengecekan ketersediaan. Silakan coba sebentar lagi.' },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const roomTypeId = sanitizeString(searchParams.get('roomTypeId'), 64);
    const checkIn = String(searchParams.get('checkIn') || '').trim();
    const checkOut = String(searchParams.get('checkOut') || '').trim();
    const promoCode = searchParams.get('promoCode') ? sanitizeString(searchParams.get('promoCode'), 20) : undefined;

    if (!roomTypeId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Parameter roomTypeId, checkIn, dan checkOut wajib disertakan.' },
        { status: 400 }
      );
    }

    if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) {
      return NextResponse.json(
        { error: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (!isDateTodayOrFuture(checkIn)) {
      return NextResponse.json(
        { error: 'Tanggal check-in tidak boleh sebelum hari ini.' },
        { status: 400 }
      );
    }

    if (!isDateAfter(checkOut, checkIn)) {
      return NextResponse.json(
        { error: 'Tanggal check-out harus setelah tanggal check-in.' },
        { status: 400 }
      );
    }

    // Verify room type exists
    const roomType = await getRoomTypeById(roomTypeId);
    if (!roomType || !roomType.is_active) {
      return NextResponse.json(
        { error: 'Tipe kamar yang dicari tidak ditemukan atau tidak aktif.' },
        { status: 404 }
      );
    }

    const [roomDetails, pricing] = await Promise.all([
      getRoomAvailabilityDetails(roomTypeId, checkIn, checkOut),
      calculateStayPricing(roomTypeId, checkIn, checkOut, promoCode),
    ]);

    return NextResponse.json({
      roomTypeId,
      checkIn,
      checkOut,
      isTersedia: roomDetails.availableKamarCount > 0,
      availableKamarCount: roomDetails.availableKamarCount,
      rooms: roomDetails.rooms,
      pricing,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memeriksa ketersediaan kamar.' },
      { status: 400 }
    );
  }
}
