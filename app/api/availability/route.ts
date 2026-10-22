import { NextRequest, NextResponse } from 'next/server';
import {
  checkRoomAvailability,
  calculateStayPricing,
} from '../../../lib/data/store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomTypeId = searchParams.get('roomTypeId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const promoCode = searchParams.get('promoCode') || undefined;

    if (!roomTypeId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomTypeId, checkIn, checkOut' },
        { status: 400 }
      );
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      return NextResponse.json(
        { error: 'checkOut must be strictly after checkIn' },
        { status: 400 }
      );
    }

    const [availability, pricing] = await Promise.all([
      checkRoomAvailability(roomTypeId, checkIn, checkOut),
      calculateStayPricing(roomTypeId, checkIn, checkOut, promoCode),
    ]);

    return NextResponse.json({
      roomTypeId,
      checkIn,
      checkOut,
      isTersedia: availability.isTersedia,
      availableKamarCount: availability.availableKamarCount,
      pricing,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error checking availability' },
      { status: 400 }
    );
  }
}
