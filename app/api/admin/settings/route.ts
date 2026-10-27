import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { writeAdminAudit } from '../../../../lib/adminAudit';
import { getSitePengaturan, updateSitePengaturan } from '../../../../lib/data/store';
import { isSupabaseAdminConfigured } from '../../../../lib/supabaseClient';
import type { SitePengaturan } from '../../../../lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SETTINGS_FIELDS: (keyof SitePengaturan)[] = ['name', 'tagline', 'stars', 'address', 'phone', 'whatsapp', 'email', 'check_in_time', 'check_out_time', 'currency'];
function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: 'Pengaturan memerlukan SUPABASE_SERVICE_ROLE_KEY di environment server.' }, { status: 503 });
  try {
    return NextResponse.json({ settings: await getSitePengaturan() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Gagal membaca pengaturan hotel dari Supabase.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: 'Pengaturan memerlukan SUPABASE_SERVICE_ROLE_KEY di environment server.' }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Format pengaturan tidak valid.' }, { status: 400 });

  const name = cleanText(body.name, 120);
  const address = cleanText(body.address, 500);
  const phone = cleanText(body.phone, 40);
  const whatsapp = cleanText(body.whatsapp, 40);
  const email = cleanText(body.email, 254).toLowerCase();
  const tagline = cleanText(body.tagline, 240);
  const checkInTime = cleanText(body.check_in_time, 5);
  const checkOutTime = cleanText(body.check_out_time, 5);
  const stars = Number(body.stars);
  const currency = cleanText(body.currency, 3).toUpperCase() || 'IDR';

  if (!name || !address || !phone || !whatsapp || !email) return NextResponse.json({ error: 'Nama hotel, alamat, telepon, WhatsApp, dan email wajib diisi.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Format email hotel tidak valid.' }, { status: 400 });
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  if (whatsappDigits.length < 8 || whatsappDigits.length > 15) return NextResponse.json({ error: 'Nomor WhatsApp harus menggunakan kode negara dan berisi 8–15 digit.' }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(checkInTime) || !/^\d{2}:\d{2}$/.test(checkOutTime)) return NextResponse.json({ error: 'Format jam check-in/check-out harus HH:MM.' }, { status: 400 });
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return NextResponse.json({ error: 'Jumlah bintang hotel harus 1–5.' }, { status: 400 });

  try {
    const before = await getSitePengaturan();
    const settings = await updateSitePengaturan({ name, address, phone, whatsapp, email, tagline, check_in_time: checkInTime, check_out_time: checkOutTime, stars, currency });
    const changedFields = SETTINGS_FIELDS.filter((field) => before[field] !== settings[field]);
    await writeAdminAudit(request, auth.user, 'hotel_settings_updated', 'site_settings', 'hotel_info', {
      changed_fields: changedFields,
      before: Object.fromEntries(changedFields.map((field) => [field, before[field]])),
      after: Object.fromEntries(changedFields.map((field) => [field, settings[field]])),
    });
    return NextResponse.json({ success: true, settings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/settings] update failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Pengaturan gagal disimpan ke Supabase.' }, { status: 500 });
  }
}
