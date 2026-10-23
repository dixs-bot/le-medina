import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, isSupabaseConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';
import { isValidISODate, sanitizeString } from '../../../../lib/validation';
import { getAllRoomTypesAdmin, getKamar } from '../../../../lib/data/store';
import { writeAdminAudit } from '../../../../lib/adminAudit';
import type { AdminUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RateKind = 'seasonal' | 'weekend' | 'holiday' | 'custom';
const RATE_KINDS: RateKind[] = ['seasonal', 'weekend', 'holiday', 'custom'];

function databaseUnavailable() {
  return NextResponse.json(
    { error: 'Manajemen kamar dan harga memerlukan SUPABASE_SERVICE_ROLE_KEY yang valid di environment server.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

function validPrice(value: unknown): number | null {
  const price = Number(value);
  if (!Number.isInteger(price) || price < 1 || price > 20_000_000) return null;
  return price;
}

function validDateRange(startDate: unknown, endDate: unknown): startDate is string {
  return typeof startDate === 'string' && typeof endDate === 'string'
    && isValidISODate(startDate) && isValidISODate(endDate) && endDate >= startDate;
}

function normaliseDays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = [...new Set(value.map(Number))].sort((a, b) => a - b);
  if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return null;
  return days;
}

function priorityFor(kind: RateKind): number {
  switch (kind) {
    case 'holiday': return 100;
    case 'custom': return 80;
    case 'weekend': return 60;
    case 'seasonal': return 40;
  }
}

async function updateRate(body: Record<string, unknown>, request: NextRequest, actor: AdminUser) {
  const id = sanitizeString(body.id, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'ID aturan tarif tidak valid.' }, { status: 400 });
  }

  const rateName = sanitizeString(body.rate_name, 100);
  const rateKind = String(body.rate_type || '') as RateKind;
  const startDate = body.start_date;
  const endDate = body.end_date;
  const price = validPrice(body.price_idr);
  const minStay = Number(body.min_stay_nights);
  const days = normaliseDays(body.days_of_week);
  const isActive = body.is_active === true;

  if (!rateName) return NextResponse.json({ error: 'Nama aturan tarif wajib diisi.' }, { status: 400 });
  if (!RATE_KINDS.includes(rateKind)) return NextResponse.json({ error: 'Jenis aturan tarif tidak valid.' }, { status: 400 });
  if (!validDateRange(startDate, endDate)) return NextResponse.json({ error: 'Rentang tanggal tarif tidak valid.' }, { status: 400 });
  if (price === null) return NextResponse.json({ error: 'Harga harus bilangan Rupiah antara Rp1 sampai Rp20.000.000.' }, { status: 400 });
  if (!Number.isInteger(minStay) || minStay < 1 || minStay > 30) return NextResponse.json({ error: 'Minimum menginap harus antara 1 sampai 30 malam.' }, { status: 400 });
  if (!days || (rateKind === 'weekend' && days.length === 0)) return NextResponse.json({ error: 'Pilih minimal satu hari untuk aturan akhir pekan.' }, { status: 400 });

  const { data, error } = await supabaseAdmin!
    .from('room_rates')
    .update({
      rate_name: rateName,
      rate_type: rateKind,
      start_date: startDate as string,
      end_date: endDate as string,
      price_cents: price * 100,
      min_stay_nights: minStay,
      days_of_week: rateKind === 'weekend' ? days : [],
      priority: priorityFor(rateKind),
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    console.error('[admin/room-management] rate update failed:', error.code || 'unknown', error.message || 'Database request failed');
    return NextResponse.json({ error: 'Gagal memperbarui aturan harga di Supabase.' }, { status: 500 });
  }
  await writeAdminAudit(request, actor, 'room_rate_updated', 'room_rate', id, {
    rate_name: rateName, rate_type: rateKind, price_idr: price, is_active: isActive,
  });
  return NextResponse.json({ success: true, rate: data });
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request, ['admin']);
  if ('response' in authResult) return authResult.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return databaseUnavailable();

  try {
    const [typesResult, roomsResult, ratesResult] = await Promise.all([
      getAllRoomTypesAdmin(),
      getKamar(),
      supabaseAdmin.from('room_rates')
        .select('id,room_type_id,rate_name,start_date,end_date,price_cents,min_stay_nights,is_active,rate_type,days_of_week,priority,updated_at,created_at')
        .order('start_date', { ascending: true }).order('rate_name', { ascending: true }),
    ]);
    const error = ratesResult.error;
  if (error) {
    console.error('[admin/room-management] read failed:', error.code || 'unknown', error.message || 'Database request failed');
    const message = String(error.message || '').toLowerCase().includes('rate_type')
      || String(error.message || '').toLowerCase().includes('days_of_week')
      ? 'Kolom tarif baru belum tersedia. Jalankan migrasi 20261023000011_admin_room_rate_management.sql di Supabase.'
      : 'Gagal membaca data kamar dan tarif dari Supabase.';
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }

    return NextResponse.json({
      roomTypes: typesResult || [],
      rooms: roomsResult || [],
      rates: ratesResult.data || [],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membaca data kamar dan tarif dari Supabase.';
    console.error('[admin/room-management] read failed:', message);
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request, ['admin']);
  if ('response' in authResult) return authResult.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return databaseUnavailable();

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  const action = String(body.action || '');

  try {
    if (action === 'create_room') {
      const roomNumber = sanitizeString(body.room_number, 30).toUpperCase();
      const roomTypeId = sanitizeString(body.room_type_id, 64);
      const floor = Number(body.floor);
      const wing = sanitizeString(body.wing, 60) || 'Sayap Utama';
      if (!/^[A-Z0-9][A-Z0-9 -]{0,29}$/.test(roomNumber)) {
        return NextResponse.json({ error: 'Nomor kamar wajib diisi dan hanya boleh berisi huruf, angka, spasi, atau tanda hubung.' }, { status: 400 });
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomTypeId)) {
        return NextResponse.json({ error: 'Pilih tipe kamar yang valid.' }, { status: 400 });
      }
      if (!Number.isInteger(floor) || floor < 1 || floor > 100) return NextResponse.json({ error: 'Lantai harus antara 1 sampai 100.' }, { status: 400 });

      const { data: roomType, error: typeError } = await supabaseAdmin!
        .from('room_types').select('id,is_active').eq('id', roomTypeId).maybeSingle();
      if (typeError) throw typeError;
      if (!roomType || !roomType.is_active) return NextResponse.json({ error: 'Tipe kamar tidak ditemukan atau sedang nonaktif.' }, { status: 400 });

      const { data: existing, error: existingError } = await supabaseAdmin!
        .from('rooms').select('id').ilike('room_number', roomNumber).limit(1);
      if (existingError) throw existingError;
      if (existing?.length) return NextResponse.json({ error: `Nomor kamar ${roomNumber} sudah terdaftar.` }, { status: 409 });

      const { data, error } = await supabaseAdmin!
        .from('rooms')
        .insert({ room_type_id: roomTypeId, room_number: roomNumber, floor, wing, status: 'available' })
        .select('*').single();
      if (error) {
        if (error.code === '23505') return NextResponse.json({ error: `Nomor kamar ${roomNumber} sudah terdaftar.` }, { status: 409 });
        throw error;
      }
      await writeAdminAudit(request, authResult.user, 'room_created', 'room', data.id, { room_number: data.room_number, room_type_id: data.room_type_id, floor: data.floor, wing: data.wing });
      return NextResponse.json({ success: true, room: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'update_base_price') {
      const roomTypeId = sanitizeString(body.room_type_id, 64);
      const price = validPrice(body.price_idr);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomTypeId)) return NextResponse.json({ error: 'Tipe kamar tidak valid.' }, { status: 400 });
      if (price === null) return NextResponse.json({ error: 'Harga dasar harus Rp1 sampai Rp20.000.000 per malam.' }, { status: 400 });
      const { data, error } = await supabaseAdmin!
        .from('room_types')
        .update({ base_price_cents: price * 100, currency: 'IDR', updated_at: new Date().toISOString() })
        .eq('id', roomTypeId)
        .select('id,name,base_price_cents,currency')
        .single();
      if (error) throw error;
      await writeAdminAudit(request, authResult.user, 'room_base_price_updated', 'room_type', data.id, { room_type_name: data.name, price_idr: price });
      return NextResponse.json({ success: true, roomType: data });
    }

    if (action === 'create_rate') {
      const roomTypeId = sanitizeString(body.room_type_id, 64);
      const rateName = sanitizeString(body.rate_name, 100);
      const rateKind = String(body.rate_type || '') as RateKind;
      const startDate = body.start_date;
      const endDate = body.end_date;
      const price = validPrice(body.price_idr);
      const minStay = Number(body.min_stay_nights);
      const days = normaliseDays(body.days_of_week);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomTypeId)) return NextResponse.json({ error: 'Pilih tipe kamar yang valid.' }, { status: 400 });
      if (!rateName) return NextResponse.json({ error: 'Nama aturan tarif wajib diisi.' }, { status: 400 });
      if (!RATE_KINDS.includes(rateKind)) return NextResponse.json({ error: 'Pilih jenis aturan tarif yang valid.' }, { status: 400 });
      if (!validDateRange(startDate, endDate)) return NextResponse.json({ error: 'Tanggal akhir harus sama dengan atau setelah tanggal awal.' }, { status: 400 });
      if (price === null) return NextResponse.json({ error: 'Harga aturan harus Rp1 sampai Rp20.000.000 per malam.' }, { status: 400 });
      if (!Number.isInteger(minStay) || minStay < 1 || minStay > 30) return NextResponse.json({ error: 'Minimum menginap harus antara 1 sampai 30 malam.' }, { status: 400 });
      if (!days || (rateKind === 'weekend' && days.length === 0)) return NextResponse.json({ error: 'Pilih minimal satu hari untuk aturan akhir pekan.' }, { status: 400 });

      const { data: roomType, error: typeError } = await supabaseAdmin!
        .from('room_types').select('id,is_active').eq('id', roomTypeId).maybeSingle();
      if (typeError) throw typeError;
      if (!roomType || !roomType.is_active) return NextResponse.json({ error: 'Tipe kamar tidak ditemukan atau sedang nonaktif.' }, { status: 400 });

      const { data, error } = await supabaseAdmin!
        .from('room_rates')
        .insert({
          room_type_id: roomTypeId,
          rate_name: rateName,
          rate_type: rateKind,
          start_date: startDate as string,
          end_date: endDate as string,
          price_cents: price * 100,
          min_stay_nights: minStay,
          days_of_week: rateKind === 'weekend' ? days : [],
          priority: priorityFor(rateKind),
          is_active: true,
        })
        .select('*').single();
      if (error) throw error;
      await writeAdminAudit(request, authResult.user, 'room_rate_created', 'room_rate', data.id, { rate_name: rateName, rate_type: rateKind, price_idr: price, room_type_id: roomTypeId });
      return NextResponse.json({ success: true, rate: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'update_rate') return await updateRate(body, request, authResult.user);

    return NextResponse.json({ error: 'Aksi manajemen tidak dikenal.' }, { status: 400 });
  } catch (error) {
    const detail = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message || '') : '';
    console.error('[admin/room-management] mutation failed:', detail || 'Database request failed');
    return NextResponse.json({ error: 'Perubahan gagal disimpan ke Supabase. Periksa migrasi database dan nilai isian.' }, { status: 500 });
  }
}
