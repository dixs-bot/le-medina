import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function GET(req: NextRequest) {
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return json({ error: 'Layanan tiket belum dikonfigurasi.' }, 503);
  try {
    const code = String(req.nextUrl.searchParams.get('code') || '').trim().toUpperCase();
    if (!code) {
      const { data, error } = await supabaseAdmin.from('waterpark_ticket_prices').select('ticket_type,label,price_idr').order('ticket_type');
      if (error) throw error;
      return json({ tickets: data || [] });
    }
    if (!/^[A-Z0-9-]{6,40}$/.test(code)) return json({ error: 'Kode validasi tidak valid.' }, 400);
    const { data, error } = await supabaseAdmin.from('waterpark_online_orders')
      .select('order_code,validation_code,customer_name,adult_count,child_count,adult_price_idr,child_price_idr,total_idr,payment_method,payment_status,order_status,created_at,paid_at,validated_at')
      .eq('validation_code', code).maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'Pesanan tidak ditemukan. Periksa kembali kode validasi.' }, 404);
    return json({ order: data });
  } catch (e: any) { return json({ error: e?.message || 'Gagal memuat tiket.' }, 500); }
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return json({ error: 'Layanan tiket belum dikonfigurasi.' }, 503);
  try {
    const body = await req.json();
    const customerName = String(body.customerName || '').trim().slice(0, 120);
    const adultCount = Number(body.adultCount);
    const childCount = Number(body.childCount);
    const paymentMethod = String(body.paymentMethod || 'counter');
    const note = String(body.note || '').trim().slice(0, 500);
    if (customerName.length < 2) return json({ error: 'Nama pemesan minimal 2 karakter.' }, 400);
    if (!Number.isInteger(adultCount) || !Number.isInteger(childCount) || adultCount < 0 || childCount < 0 || adultCount + childCount < 1 || adultCount + childCount > 1000) return json({ error: 'Jumlah tiket tidak valid.' }, 400);
    if (!['transfer_dummy', 'qris_dummy', 'counter'].includes(paymentMethod)) return json({ error: 'Metode pembayaran tidak valid.' }, 400);
    const { data: tickets, error: priceError } = await supabaseAdmin.from('waterpark_ticket_prices').select('ticket_type,price_idr');
    if (priceError) throw priceError;
    const prices = new Map((tickets || []).map((t: any) => [t.ticket_type, Number(t.price_idr)]));
    const adultPrice = prices.get('adult'); const childPrice = prices.get('child');
    if (!adultPrice || !childPrice) throw new Error('Harga tiket belum tersedia.');
    const total = adultCount * adultPrice + childCount * childPrice;
    const { data, error } = await supabaseAdmin.from('waterpark_online_orders').insert({
      customer_name: customerName, adult_count: adultCount, child_count: childCount,
      adult_price_idr: adultPrice, child_price_idr: childPrice, total_idr: total,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'counter' ? 'pending_counter' : 'pending_payment',
      order_status: paymentMethod === 'counter' ? 'waiting_counter' : 'waiting_payment', note,
    }).select('order_code,validation_code,customer_name,adult_count,child_count,adult_price_idr,child_price_idr,total_idr,payment_method,payment_status,order_status,created_at').single();
    if (error) throw error;
    return json({ order: data }, 201);
  } catch (e: any) { return json({ error: e?.message || 'Gagal membuat pesanan tiket.' }, 400); }
}
