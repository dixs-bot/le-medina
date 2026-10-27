import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const noStore = { 'Cache-Control': 'no-store' };
const TZ = 'Asia/Jakarta';
function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function plusDays(value: string, days: number) { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
function start(value: string) { return new Date(`${value}T00:00:00+07:00`).getTime(); }
function inRange(value: string, a: number, b: number) { const t = new Date(value).getTime(); return Number.isFinite(t) && t >= a && t < b; }
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, ['super_admin', 'admin', 'reservation_staff']);
  if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return NextResponse.json({ error: 'Supabase service role belum dikonfigurasi.' }, { status: 503, headers: noStore });
  try {
    const today = localDate();
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const monday = plusDays(today, -(weekday === 0 ? 6 : weekday - 1));
    const nextDay = plusDays(today, 1);
    const nextMonday = plusDays(monday, 7);
    const month = today.slice(0, 7);
    const nextMonth = (() => { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 7); })();
    const { data, error } = await supabaseAdmin.from('restaurant_orders').select('total_idr,created_at,payment_method,payment_status,order_status,order_source').neq('order_status', 'cancelled').order('created_at', { ascending: false }).limit(5000);
    if (error) throw error;
    const orders: any[] = data || [];
    const received = orders.filter(o => o.payment_status === 'paid_at_restaurant');
    const sum = (rows: any[]) => rows.reduce((n, o) => n + Math.max(0, Number(o.total_idr || 0)), 0);
    const rangeSum = (a: string, b: string) => sum(received.filter(o => inRange(o.created_at, start(a), start(b))));
    return NextResponse.json({
      generatedAt: new Date().toISOString(), today, weekStart: monday, month,
      dailyIdr: rangeSum(today, nextDay), weeklyIdr: rangeSum(monday, nextMonday), monthlyIdr: rangeSum(`${month}-01`, `${nextMonth}-01`),
      totalReceivedIdr: sum(received), totalOrders: orders.length,
      paidOrders: received.length,
      pendingSimulationCount: orders.filter(o => o.payment_status === 'simulated').length,
      bySource: { pos: sum(received.filter(o => o.order_source === 'pos')), online: sum(received.filter(o => o.order_source !== 'pos')) },
    }, { headers: noStore });
  } catch (error: any) {
    console.error('[admin/restaurant-revenue]', error?.message || 'failed');
    return NextResponse.json({ error: 'Gagal memuat laporan pendapatan restoran.' }, { status: 500, headers: noStore });
  }
}
