import { NextRequest, NextResponse } from 'next/server';
import {
  getReservationByCode,
  updateReservationStatus,
} from '../../../../lib/data/store';
import { ReservationStatus } from '../../../../lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const reservation = await getReservationByCode(code);

    if (!reservation) {
      return NextResponse.json(
        { error: `Reservation with code ${code} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error fetching reservation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();
    const { status, internal_notes } = body;

    const reservation = await getReservationByCode(code);
    if (!reservation) {
      return NextResponse.json(
        { error: `Reservation with code ${code} not found` },
        { status: 404 }
      );
    }

    const validStatuses: ReservationStatus[] = [
      'pending',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await updateReservationStatus(
      reservation.id,
      status || reservation.status,
      internal_notes
    );

    return NextResponse.json({
      success: true,
      reservation: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error updating reservation' },
      { status: 500 }
    );
  }
}
