import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../../lib/auth';
import { writeAdminAudit } from '../../../../../lib/adminAudit';
import {
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from '../../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request, ['admin', 'reservation_staff']);
  if ('response' in authResult) return authResult.response;

  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Fitur pencatatan pembayaran belum tersedia karena konfigurasi database server belum lengkap.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Format permintaan pembayaran tidak valid.' }, { status: 400 });
    }

    const reservationCode = String((body as any).reservation_code || '').trim().toUpperCase();
    const receiptReference = String((body as any).receipt_reference || '').trim().slice(0, 120);
    const notes = String((body as any).notes || '').trim().slice(0, 500);

    if (!/^MED-[A-Z0-9]{4,12}$/.test(reservationCode)) {
      return NextResponse.json({ error: 'Kode reservasi tidak valid.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('receive_offline_payment', {
      p_reservation_code: reservationCode,
      p_received_by: authResult.user.id,
      p_receipt_reference: receiptReference || null,
      p_notes: notes || null,
    });

    if (error) {
      console.error('[admin/payments/receive] RPC failed:', error.code || 'unknown', error.message || 'Database request failed');
      const message = String(error.message || '').toLowerCase();
      const clientError = message.includes('tidak ditemukan') || message.includes('tidak dapat dicatat') || message.includes('bukan bayar di hotel') || message.includes('hanya mendukung');
      return NextResponse.json(
        { error: clientError ? error.message : 'Pembayaran belum dapat dicatat. Periksa log server untuk detail.' },
        { status: clientError ? 409 : 500 },
      );
    }

    if (!data || (data as any).success !== true) {
      return NextResponse.json({ error: 'Database tidak mengonfirmasi pencatatan pembayaran.' }, { status: 500 });
    }

    await writeAdminAudit(request, authResult.user, 'offline_payment_received', 'reservation', reservationCode, {
      receipt_reference: receiptReference || null,
      notes_present: Boolean(notes),
    });
    return NextResponse.json({ success: true, payment: data });
  } catch (error) {
    console.error('[admin/payments/receive] Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Terjadi kesalahan saat mencatat pembayaran.' }, { status: 500 });
  }
}
