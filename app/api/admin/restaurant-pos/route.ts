import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
const roles = ['restaurant_cashier'] as const;

function makeCode() {
  return `POS${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, [...roles]);
  if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase service role belum dikonfigurasi.' }, { status: 503, headers: noStore });
  }
  try {
    const body = await req.json();
    const customerName = String(body.customerName || '').trim().slice(0, 120);
    const paymentMethod = String(body.paymentMethod || 'cash');
    const note = String(body.note || '').trim().slice(0, 500);
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (customerName.length < 2) return NextResponse.json({ error: 'Nama pembeli minimal 2 karakter.' }, { status: 400, headers: noStore });
    if (!['cash', 'transfer_dummy', 'qris_dummy'].includes(paymentMethod)) return NextResponse.json({ error: 'Metode pembayaran tidak valid.' }, { status: 400, headers: noStore });
    if (!rawItems.length || rawItems.length > 40) return NextResponse.json({ error: 'Pilih minimal satu menu.' }, { status: 400, headers: noStore });
    const ids = [...new Set(rawItems.map((item: any) => String(item.id || '')))];
    if (ids.some((id) => !id)) return NextResponse.json({ error: 'Menu tidak valid.' }, { status: 400, headers: noStore });
    const { data: menus, error: menuError } = await supabaseAdmin.from('restaurant_menu').select('id,name,price_cents,is_available').in('id', ids);
    if (menuError) throw menuError;
    const menuMap = new Map((menus || []).map((menu: any) => [menu.id, menu]));
    const items = rawItems.map((raw: any) => {
      const menu: any = menuMap.get(String(raw.id));
      const quantity = Number(raw.quantity);
      if (!menu || !menu.is_available || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Menu tidak tersedia atau jumlah tidak valid.');
      const price = Math.round(Number(menu.price_cents) / 100);
      return { menu_id: menu.id, menu_name: menu.name, quantity, unit_price_idr: price, line_total_idr: price * quantity };
    });
    const total = items.reduce((sum: number, item: any) => sum + item.line_total_idr, 0);
    const { data: order, error: orderError } = await supabaseAdmin.from('restaurant_orders').insert({
      order_code: makeCode(), customer_name: customerName, room_number: null, is_hotel_guest: false,
      customer_note: note, payment_method: paymentMethod,
      payment_status: paymentMethod === 'cash' ? 'paid_at_restaurant' : 'simulated',
      order_status: 'completed', order_source: 'pos', total_idr: total,
    }).select('*').single();
    if (orderError || !order) throw orderError || new Error('Pesanan tidak berhasil dibuat.');
    const { error: itemsError } = await supabaseAdmin.from('restaurant_order_items').insert(items.map((item: any) => ({ ...item, order_id: order.id })));
    if (itemsError) {
      await supabaseAdmin.from('restaurant_orders').delete().eq('id', order.id);
      throw itemsError;
    }
    return NextResponse.json({ order: { ...order, restaurant_order_items: items } }, { status: 201, headers: noStore });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan transaksi kasir.' }, { status: 400, headers: noStore });
  }
}
