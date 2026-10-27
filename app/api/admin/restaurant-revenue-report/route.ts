import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const noStore = { 'Cache-Control': 'no-store' };

function validMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  // WIB is UTC+7; the first day of the month at 00:00 WIB is 17:00 UTC the previous day.
  const startUtc = new Date(Date.UTC(year, monthNumber - 1, 1) - 7 * 60 * 60 * 1000);
  const endUtc = new Date(Date.UTC(year, monthNumber, 1) - 7 * 60 * 60 * 1000);
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, ['super_admin', 'admin', 'reservation_staff']);
  if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase service role belum dikonfigurasi.' }, { status: 503, headers: noStore });
  }

  const month = String(req.nextUrl.searchParams.get('month') || '');
  if (!validMonth(month)) {
    return NextResponse.json({ error: 'Format bulan harus YYYY-MM.' }, { status: 400, headers: noStore });
  }

  try {
    const { startUtc, endUtc } = monthBounds(month);
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('restaurant_orders')
      .select('id,order_code,customer_name,created_at,total_idr,payment_method,payment_status,order_status,order_source,is_hotel_guest,room_number')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc)
      .order('created_at', { ascending: true })
      .limit(10000);
    if (ordersError) throw ordersError;

    const orders = ordersData || [];
    const ids = orders.map((order: any) => order.id);
    let itemsByOrder = new Map<string, any[]>();
    if (ids.length) {
      const { data: itemData, error: itemsError } = await supabaseAdmin
        .from('restaurant_order_items')
        .select('id,order_id,menu_name,quantity,unit_price_idr,line_total_idr')
        .in('order_id', ids);
      if (itemsError) throw itemsError;
      itemsByOrder = new Map<string, any[]>();
      for (const item of itemData || []) {
        const group = itemsByOrder.get(item.order_id) || [];
        group.push(item);
        itemsByOrder.set(item.order_id, group);
      }
    }

    const enrichedOrders = orders.map((order: any) => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
    }));
    const received = enrichedOrders.filter((order: any) => order.payment_status === 'paid_at_restaurant' && order.order_status !== 'cancelled');
    const sum = (rows: any[]) => rows.reduce((total, order) => total + Math.max(0, Number(order.total_idr || 0)), 0);

    return NextResponse.json({
      month,
      generatedAt: new Date().toISOString(),
      totalOrders: enrichedOrders.length,
      paidOrders: received.length,
      simulatedOrders: enrichedOrders.filter((order: any) => order.payment_status === 'simulated' && order.order_status !== 'cancelled').length,
      revenueIdr: sum(received),
      bySource: {
        pos: sum(received.filter((order: any) => order.order_source === 'pos')),
        online: sum(received.filter((order: any) => order.order_source !== 'pos')),
      },
      orders: enrichedOrders,
    }, { headers: noStore });
  } catch (error: any) {
    console.error('[admin/restaurant-revenue-report]', error?.message || 'failed');
    return NextResponse.json({ error: 'Gagal memuat laporan pendapatan bulanan restoran.' }, { status: 500, headers: noStore });
  }
}
