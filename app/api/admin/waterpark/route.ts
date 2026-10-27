import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
const roles = ['waterpark_cashier'] as const;

function rupiah(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, [...roles]);
  if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return NextResponse.json({ error: 'Supabase service role belum dikonfigurasi.' }, { status: 503, headers: noStore });
  try {
    const { data: tickets, error: ticketError } = await supabaseAdmin.from('waterpark_ticket_prices').select('*').order('ticket_type');
    if (ticketError) throw ticketError;
    const from = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const { data: transactions, error: txError } = await supabaseAdmin.from('waterpark_transactions')
      .select('*').gte('created_at', from).order('created_at', { ascending: false }).limit(1000);
    if (txError) throw txError;

    // Pesanan tiket online harus ikut dihitung ke pendapatan divisi waterpark.
    // Pendapatan online hanya dihitung jika pembayaran berstatus paid, memiliki paid_at,
    // dan pesanan tidak dibatalkan. Query paid_at dipisah agar pembayaran baru tetap
    // terhitung meskipun pesanan dibuat lebih dari 45 hari sebelumnya.
    const { data: onlineOrders, error: onlineOrdersError } = await supabaseAdmin
      .from('waterpark_online_orders')
      .select('id,order_code,validation_code,customer_name,adult_count,child_count,total_idr,payment_method,payment_status,order_status,created_at,paid_at')
      .gte('created_at', from)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (onlineOrdersError) throw onlineOrdersError;

    const { data: onlinePaidOrders, error: onlinePaidError } = await supabaseAdmin
      .from('waterpark_online_orders')
      .select('id,total_idr,paid_at,payment_status,order_status')
      .eq('payment_status', 'paid')
      .gte('paid_at', from)
      .limit(2000);
    if (onlinePaidError) throw onlinePaidError;

    const now = new Date();
    const jakarta = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const startToday = new Date(jakarta.getFullYear(), jakarta.getMonth(), jakarta.getDate()).getTime();
    const startWeek = startToday - ((jakarta.getDay() + 6) % 7) * 86400000;
    const startMonth = new Date(jakarta.getFullYear(), jakarta.getMonth(), 1).getTime();
    const paidCounterTransactions = (transactions || []).filter((x: any) => x.payment_status === 'paid');
    const paidOnlineOrders = (onlinePaidOrders || []).filter((x: any) => x.payment_status === 'paid' && x.order_status !== 'cancelled' && x.paid_at);
    const allPaidForRevenue = [
      ...paidCounterTransactions.map((x: any) => ({ total_idr: x.total_idr, revenue_at: x.created_at })),
      ...paidOnlineOrders.map((x: any) => ({ total_idr: x.total_idr, revenue_at: x.paid_at })),
    ];
    const sumSince = (start: number) => allPaidForRevenue
      .filter((x: any) => new Date(x.revenue_at).getTime() >= start)
      .reduce((sum: number, x: any) => sum + Number(x.total_idr || 0), 0);

    // Satukan transaksi loket dan pesanan online pada daftar transaksi terbaru.
    const recentOnlineOrders = (onlineOrders || []).map((x: any) => ({
      ...x,
      source: 'online',
      transaction_code: x.order_code,
      payment_method: x.payment_method === 'counter' ? 'counter' : x.payment_method,
    }));
    const recentCounterTransactions = (transactions || []).map((x: any) => ({ ...x, source: 'counter' }));
    const recentTransactions = [...recentCounterTransactions, ...recentOnlineOrders]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 1000);

    return NextResponse.json({
      tickets: tickets || [], transactions: recentTransactions,
      revenue: {
        daily: sumSince(startToday), weekly: sumSince(startWeek), monthly: sumSince(startMonth),
        paidTransactions: allPaidForRevenue.length,
        onlinePaidTransactions: paidOnlineOrders.filter((x: any) => new Date(x.paid_at).getTime() >= startMonth).length,
      },
    }, { headers: noStore });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat data waterpark.' }, { status: 500, headers: noStore });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, [...roles]);
  if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return NextResponse.json({ error: 'Supabase service role belum dikonfigurasi.' }, { status: 503, headers: noStore });
  try {
    const body = await req.json();
    const adult = rupiah(body.adultPrice);
    const child = rupiah(body.childPrice);
    if (adult < 1 || child < 1) return NextResponse.json({ error: 'Harga tiket harus lebih dari Rp0.' }, { status: 400, headers: noStore });
    for (const [ticket_type, price_idr] of [['adult', adult], ['child', child]] as const) {
      const { error } = await supabaseAdmin.from('waterpark_ticket_prices').upsert({
        ticket_type, label: ticket_type === 'adult' ? 'Dewasa' : 'Anak-anak', price_idr, updated_at: new Date().toISOString(),
      }, { onConflict: 'ticket_type' });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal menyimpan harga tiket.' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, [...roles]);
  if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return NextResponse.json({ error: 'Supabase service role belum dikonfigurasi.' }, { status: 503, headers: noStore });
  try {
    const body = await req.json();
    const customerName = String(body.customerName || '').trim().slice(0, 120);
    const adultCount = Number(body.adultCount);
    const childCount = Number(body.childCount);
    const paymentMethod = String(body.paymentMethod || 'cash');
    const note = String(body.note || '').trim().slice(0, 500);
    if (customerName.length < 2) return NextResponse.json({ error: 'Nama pembeli minimal 2 karakter.' }, { status: 400, headers: noStore });
    if (!Number.isInteger(adultCount) || !Number.isInteger(childCount) || adultCount < 0 || childCount < 0 || adultCount + childCount < 1 || adultCount + childCount > 1000) return NextResponse.json({ error: 'Jumlah pengunjung tidak valid.' }, { status: 400, headers: noStore });
    if (!['cash', 'transfer_dummy', 'qris_dummy'].includes(paymentMethod)) return NextResponse.json({ error: 'Metode pembayaran tidak valid.' }, { status: 400, headers: noStore });
    const { data: tickets, error: priceError } = await supabaseAdmin.from('waterpark_ticket_prices').select('ticket_type,price_idr');
    if (priceError) throw priceError;
    const priceMap = new Map((tickets || []).map((t: any) => [t.ticket_type, Number(t.price_idr)]));
    const adultPrice = priceMap.get('adult');
    const childPrice = priceMap.get('child');
    if (!adultPrice || !childPrice) throw new Error('Harga tiket belum disiapkan. Jalankan migrasi SQL waterpark terlebih dahulu.');
    const total = adultCount * adultPrice + childCount * childPrice;
    const { data, error } = await supabaseAdmin.from('waterpark_transactions').insert({
      customer_name: customerName, adult_count: adultCount, child_count: childCount,
      adult_price_idr: adultPrice, child_price_idr: childPrice, total_idr: total,
      payment_method: paymentMethod, payment_status: paymentMethod === 'cash' ? 'paid' : 'simulated',
      note, created_by: auth.user?.id || null,
    }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ transaction: data }, { status: 201, headers: noStore });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal menyimpan transaksi waterpark.' }, { status: 400, headers: noStore });
  }
}
