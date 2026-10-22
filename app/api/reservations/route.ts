import { NextRequest, NextResponse } from 'next/server';
import {
  createAtomicReservation,
  getReservations,
  CreateReservationInput,
} from '../../../lib/data/store';
import { ReservationStatus } from '../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ReservationStatus | null;
    const search = searchParams.get('search') || undefined;

    const reservations = await getReservations({
      status: status || undefined,
      search,
    });

    return NextResponse.json({ reservations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults = 2,
      children = 0,
      room_type_id,
      special_requests,
      promo_code,
    } = body;

    if (!guest_name || !guest_email || !guest_phone || !check_in || !check_out || !room_type_id) {
      return NextResponse.json(
        { error: 'Missing required reservation fields (guest details, dates, or room type)' },
        { status: 400 }
      );
    }

    const reservation = await createAtomicReservation({
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults: Number(adults),
      children: Number(children),
      room_type_id,
      special_requests,
      promo_code,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Reservation created successfully and marked pending confirmation',
        reservation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error processing reservation' },
      { status: 400 }
    );
  }
}
