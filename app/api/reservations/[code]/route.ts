import { NextRequest, NextResponse } from 'next/server';
import {
  getReservationByCode,
  updateReservationStatus,
} from '../../../../lib/data/store';
import { ReservationStatus } from '../../../../lib/types';
import { requireAdminAuth, getAuthenticatedAdmin } from '../../../../lib/auth';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { sanitizeString } from '../../../../lib/validation';
import { writeAdminAudit } from '../../../../lib/adminAudit';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  // 1. Rate Limiting: Max 30 lookups per minute per IP to prevent code enumeration
  const rateLimit = checkRateLimit(request, 'lookup_reservation', {
    limit: 30,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan penelusuran kode. Silakan tunggu sebentar.' },
      { status: 429 }
    );
  }

  try {
    const rawCode = params.code;
    const cleanCode = sanitizeString(rawCode, 20).toUpperCase();

    // Validate format: MED- followed by alphanumeric characters
    if (!/^MED-[A-Z0-9]{4,12}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: 'Format kode reservasi tidak valid.' },
        { status: 400 }
      );
    }

    const reservation = await getReservationByCode(cleanCode);

    if (!reservation) {
      return NextResponse.json(
        { error: `Reservasi dengan kode ${cleanCode} tidak ditemukan.` },
        { status: 404 }
      );
    }

    // Check if requester is authenticated staff
    const adminUser = await getAuthenticatedAdmin(request);

    // If unauthenticated public guest viewing confirmation: sanitize internal fields
    if (!adminUser) {
      const sanitized = { ...reservation };
      delete sanitized.internal_notes;
      return NextResponse.json({ reservation: sanitized });
    }

    return NextResponse.json({ reservation });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal memuat informasi reservasi.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  // 1. Strict Authorization Guard: Only staff and admins can update reservations
  const authResult = await requireAdminAuth(request, [
    'super_admin',
    'admin',
    'reservation_staff',
  ]);

  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const cleanCode = sanitizeString(params.code, 20).toUpperCase();
    const reservation = await getReservationByCode(cleanCode);

    if (!reservation) {
      return NextResponse.json(
        { error: `Reservasi dengan kode ${cleanCode} tidak ditemukan.` },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Format data perubahan status tidak valid.' },
        { status: 400 }
      );
    }

    const { status, internal_notes } = body;

    const validStatuses: ReservationStatus[] = [
      'pending',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Status '${status}' tidak valid. Pilihan status yang diperbolehkan: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const cleanNotes = internal_notes !== undefined ? sanitizeString(internal_notes, 1000) : undefined;

    const updated = await updateReservationStatus(
      reservation.id,
      status || reservation.status,
      cleanNotes
    );
    if (status && status !== reservation.status) {
      await writeAdminAudit(request, authResult.user, 'reservation_status_updated', 'reservation', reservation.reservation_code, {
        previous_status: reservation.status,
        new_status: updated.status,
        assigned_room_number: updated.assigned_room_number || reservation.assigned_room_number || null,
        internal_notes_changed: cleanNotes !== undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Status reservasi berhasil diperbarui.',
      reservation: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui status reservasi.' },
      { status: 500 }
    );
  }
}
