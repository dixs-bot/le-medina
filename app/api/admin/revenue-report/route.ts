import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HOTEL_TIME_ZONE = 'Asia/Jakarta';
const ALLOWED_ROLES = ['admin', 'reservation_staff'] as const;

type PaymentRow = {
  id: string;
  reservation_id: string;
  status: string;
  amount_idr: number | string | null;
  paid_at: string | null;
  created_at: string;
  payment_method: string | null;
  provider?: string | null;
  currency?: string | null;
};

type ReservationRow = {
  id: string;
  reservation_code: string;
  guest_name: string;
  guest_phone: string | null;
  adults: number | null;
  children: number | null;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  total_amount_cents: number | string | null;
  currency: string | null;
  source: string | null;
  created_at: string;
  updated_at: string | null;
};

function dateInJakarta(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOTEL_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthStartFor(isoMonth: string): string {
  return `${isoMonth}-01`;
}

function startAtJakarta(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00+07:00`).getTime();
}

function timestampInRange(value: string | null | undefined, start: number, end: number): boolean {
  if (!value) return false;
  const stamp = new Date(value).getTime();
  return Number.isFinite(stamp) && stamp >= start && stamp < end;
}

function dateInMonth(value: string | null | undefined, startDate: string, endDate: string): boolean {
  return Boolean(value && value >= startDate && value < endDate);
}

function paidTimestamp(payment: PaymentRow): string | null {
  return payment.paid_at || payment.created_at || null;
}

function sumPayments(payments: PaymentRow[], start: number, end: number): number {
  return payments.reduce((sum, payment) => {
    const paidAt = paidTimestamp(payment);
    return timestampInRange(paidAt, start, end)
      ? sum + Math.max(0, Number(payment.amount_idr || 0))
      : sum;
  }, 0);
}

function errorResponse() {
  return NextResponse.json(
    { error: 'Laporan pendapatan memerlukan koneksi Supabase service-role yang benar dan tabel pembayaran yang tersedia.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...ALLOWED_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return errorResponse();

  const requestedMonth = new URL(request.url).searchParams.get('month') || dateInJakarta().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) {
    return NextResponse.json({ error: 'Format bulan tidak valid. Gunakan YYYY-MM.' }, { status: 400 });
  }

  try {
    const currentDate = dateInJakarta();
    const currentMonth = currentDate.slice(0, 7);
    const currentMonthStart = monthStartFor(currentMonth);
    const currentMonthEnd = monthStartFor(nextMonth(currentMonth));
    const currentWeekday = new Date(`${currentDate}T00:00:00Z`).getUTCDay();
    const daysSinceMonday = currentWeekday === 0 ? 6 : currentWeekday - 1;
    const weekStart = addDays(currentDate, -daysSinceMonday);
    const weekEnd = addDays(weekStart, 7);
    const tomorrow = addDays(currentDate, 1);

    const requestedMonthStart = monthStartFor(requestedMonth);
    const requestedMonthEnd = monthStartFor(nextMonth(requestedMonth));
    const requestedStartTs = startAtJakarta(requestedMonthStart);
    const requestedEndTs = startAtJakarta(requestedMonthEnd);

    const [reservationsResult, paymentsResult] = await Promise.all([
      supabaseAdmin
        .from('reservations')
        .select('id,reservation_code,guest_name,guest_phone,adults,children,check_in,check_out,status,payment_status,payment_method,total_amount_cents,currency,source,created_at,updated_at')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('payments')
        .select('id,reservation_id,status,amount_idr,paid_at,created_at,payment_method,provider,currency')
        .eq('status', 'paid'),
    ]);

    if (reservationsResult.error || paymentsResult.error) {
      console.error('[admin/revenue-report] read failed:', reservationsResult.error?.code || paymentsResult.error?.code || 'unknown');
      return NextResponse.json({ error: 'Gagal membaca data reservasi atau pembayaran dari Supabase.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    const reservations = (reservationsResult.data || []) as ReservationRow[];
    const paidPayments = (paymentsResult.data || []) as PaymentRow[];
    const currentDayStartTs = startAtJakarta(currentDate);
    const tomorrowStartTs = startAtJakarta(tomorrow);
    const weekStartTs = startAtJakarta(weekStart);
    const weekEndTs = startAtJakarta(weekEnd);
    const currentMonthStartTs = startAtJakarta(currentMonthStart);
    const currentMonthEndTs = startAtJakarta(currentMonthEnd);

    const periodAmounts = {
      currentDate,
      currentMonth,
      weekStart,
      weekEnd: addDays(weekEnd, -1),
      monthStart: currentMonthStart,
      monthEnd: addDays(currentMonthEnd, -1),
      dailyIdr: sumPayments(paidPayments, currentDayStartTs, tomorrowStartTs),
      weeklyIdr: sumPayments(paidPayments, weekStartTs, weekEndTs),
      monthlyIdr: sumPayments(paidPayments, currentMonthStartTs, currentMonthEndTs),
    };

    const reservationIds = reservations.map((row) => row.id).filter(Boolean);
    const [itemsResult, eventsResult] = await Promise.all([
      reservationIds.length
        ? supabaseAdmin.from('reservation_items').select('reservation_id,room_type_id,assigned_room_id').in('reservation_id', reservationIds)
        : Promise.resolve({ data: [], error: null } as any),
      supabaseAdmin.from('reservation_events')
        .select('reservation_id,event_type,payload,created_at')
        .gte('created_at', new Date(requestedStartTs).toISOString())
        .lt('created_at', new Date(requestedEndTs).toISOString()),
    ]);

    if (itemsResult.error || eventsResult.error) {
      console.error('[admin/revenue-report] detail read failed:', itemsResult.error?.code || eventsResult.error?.code || 'unknown');
      return NextResponse.json({ error: 'Gagal membaca detail kamar atau riwayat perubahan status.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    const itemRows = itemsResult.data || [];
    const roomTypeIds = Array.from(new Set(itemRows.map((item: any) => item.room_type_id).filter(Boolean)));
    const roomIds = Array.from(new Set(itemRows.map((item: any) => item.assigned_room_id).filter(Boolean)));
    const [typesResult, roomsResult] = await Promise.all([
      roomTypeIds.length
        ? supabaseAdmin.from('room_types').select('id,name').in('id', roomTypeIds)
        : Promise.resolve({ data: [], error: null } as any),
      roomIds.length
        ? supabaseAdmin.from('rooms').select('id,room_number').in('id', roomIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (typesResult.error || roomsResult.error) {
      console.error('[admin/revenue-report] room labels read failed:', typesResult.error?.code || roomsResult.error?.code || 'unknown');
      return NextResponse.json({ error: 'Gagal membaca label tipe atau nomor kamar.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    const typeMap = new Map<string, string>((typesResult.data || []).map((row: any) => [row.id, row.name || '—'] as [string, string]));
    const roomMap = new Map<string, string>((roomsResult.data || []).map((row: any) => [row.id, row.room_number || '—'] as [string, string]));
    const itemMap = new Map<string, any>();
    for (const item of itemRows) if (!itemMap.has(item.reservation_id)) itemMap.set(item.reservation_id, item);

    const monthPayments = paidPayments.filter((payment) => timestampInRange(paidTimestamp(payment), requestedStartTs, requestedEndTs));
    const paidThisMonth = new Map<string, number>();
    for (const payment of monthPayments) {
      paidThisMonth.set(payment.reservation_id, (paidThisMonth.get(payment.reservation_id) || 0) + Math.max(0, Number(payment.amount_idr || 0)));
    }

    const eventRows = eventsResult.data || [];
    const idsForStatus = (status: string) => new Set<string>(eventRows
      .filter((event: any) => {
        const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
        return payload.status === status || payload.new_status === status || event.event_type === status;
      })
      .map((event: any) => event.reservation_id)
      .filter(Boolean));
    const checkInEventIds = idsForStatus('checked_in');
    const checkOutEventIds = idsForStatus('checked_out');
    const cancelledEventIds = idsForStatus('cancelled');

    const reportReservations = reservations.filter((row) => {
      const createdThisMonth = timestampInRange(row.created_at, requestedStartTs, requestedEndTs);
      const updatedThisMonth = timestampInRange(row.updated_at, requestedStartTs, requestedEndTs);
      const stayedDuringMonth = row.check_in < requestedMonthEnd && row.check_out > requestedMonthStart;
      const paidThisMonthFlag = paidThisMonth.has(row.id);
      const statusEventThisMonth = checkInEventIds.has(row.id) || checkOutEventIds.has(row.id) || cancelledEventIds.has(row.id);
      return createdThisMonth || updatedThisMonth || stayedDuringMonth || paidThisMonthFlag || statusEventThisMonth;
    });

    const reportRows = reportReservations.map((row) => {
      const item = itemMap.get(row.id);
      return {
        id: row.id,
        reservation_code: row.reservation_code || '',
        guest_name: row.guest_name || '',
        guest_phone: row.guest_phone || '',
        adults: Math.max(0, Number(row.adults || 0)),
        children: Math.max(0, Number(row.children || 0)),
        check_in: row.check_in,
        check_out: row.check_out,
        room_number: item?.assigned_room_id ? (roomMap.get(item.assigned_room_id) || 'Belum Ditentukan') : 'Belum Ditentukan',
        room_type: item?.room_type_id ? (typeMap.get(item.room_type_id) || '—') : '—',
        status: row.status || 'pending',
        payment_status: row.payment_status || 'unpaid',
        payment_method: row.payment_method || (row.currency === 'IDR' ? 'pay_at_hotel' : '—'),
        source: row.source || 'direct_web',
        total_idr: Math.max(0, Math.round(Number(row.total_amount_cents || 0) / 100)),
        paid_this_month_idr: paidThisMonth.get(row.id) || 0,
        created_at: row.created_at,
      };
    });

    const checkInIds = new Set<string>([
      ...Array.from(checkInEventIds),
      ...reportRows.filter((row) => ['checked_in', 'checked_out'].includes(row.status) && dateInMonth(row.check_in, requestedMonthStart, requestedMonthEnd)).map((row) => row.id),
    ]);
    const checkOutIds = new Set<string>([
      ...Array.from(checkOutEventIds),
      ...reportRows.filter((row) => row.status === 'checked_out' && dateInMonth(row.check_out, requestedMonthStart, requestedMonthEnd)).map((row) => row.id),
    ]);
    const cancelledIds = new Set<string>([
      ...Array.from(cancelledEventIds),
      ...reportRows.filter((row) => row.status === 'cancelled').map((row) => row.id),
    ]);

    const report = {
      month: requestedMonth,
      revenueIdr: sumPayments(paidPayments, requestedStartTs, requestedEndTs),
      totalTransactions: reportRows.length,
      guestCount: reportRows.filter((row) => row.status !== 'cancelled').reduce((sum, row) => sum + row.adults + row.children, 0),
      checkIns: checkInIds.size,
      checkOuts: checkOutIds.size,
      cancelled: cancelledIds.size,
      pending: reportRows.filter((row) => row.status === 'pending').length,
      confirmed: reportRows.filter((row) => row.status === 'confirmed').length,
      checkedIn: reportRows.filter((row) => row.status === 'checked_in').length,
      checkedOut: reportRows.filter((row) => row.status === 'checked_out').length,
      paidTransactions: reportRows.filter((row) => row.payment_status === 'paid').length,
      unpaidTransactions: reportRows.filter((row) => row.payment_status !== 'paid').length,
      rows: reportRows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))),
    };

    return NextResponse.json({ periods: periodAmounts, report }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/revenue-report] unexpected error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Laporan pendapatan tidak dapat dimuat saat ini.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
