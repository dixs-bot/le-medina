import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { getAdminMetrics } from '../../../../lib/data/store';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request, ['admin', 'reservation_staff']);
  if ('response' in authResult) return authResult.response;

  try {
    const metrics = await getAdminMetrics();
    return NextResponse.json({ metrics }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics] Failed to load metrics:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Gagal memuat ringkasan dashboard dari database.' }, { status: 500 });
  }
}
