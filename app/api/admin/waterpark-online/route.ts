import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const roles = ['super_admin', 'admin', 'reservation_staff'] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, [...roles]); if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return json({ error: 'Supabase service role belum dikonfigurasi.' }, 503);
  try {
    const { data, error } = await supabaseAdmin.from('waterpark_online_orders').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return json({ orders: data || [] });
  } catch (e: any) { return json({ error: e?.message || 'Gagal memuat pesanan tiket online.' }, 500); }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, [...roles]); if ('response' in auth) return auth.response;
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return json({ error: 'Supabase service role belum dikonfigurasi.' }, 503);
  try {
    const body = await req.json();
    const code = String(body.validationCode || '').trim().toUpperCase();
    const action = String(body.action || '');
    if (!/^[A-Z0-9-]{6,40}$/.test(code)) return json({ error: 'Kode validasi tidak valid.' }, 400);
    const { data: order, error: findError } = await supabaseAdmin.from('waterpark_online_orders').select('*').eq('validation_code', code).maybeSingle();
    if (findError) throw findError;
    if (!order) return json({ error: 'Pesanan dengan kode tersebut tidak ditemukan.' }, 404);
    if (action === 'mark_paid') {
      if (order.order_status === 'used' || order.order_status === 'cancelled') return json({ error: 'Tiket sudah digunakan atau dibatalkan.' }, 409);
      const { data, error } = await supabaseAdmin.from('waterpark_online_orders').update({ payment_status: 'paid', order_status: 'confirmed', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', order.id).select('*').single();
      if (error) throw error;
      return json({ order: data, message: 'Pembayaran ditandai lunas.' });
    }
    if (action === 'validate_entry') {
      if (order.payment_status !== 'paid') return json({ error: 'Tiket belum lunas. Verifikasi pembayaran sebelum validasi masuk.' }, 409);
      if (order.order_status === 'used') return json({ error: 'Kode ini sudah pernah digunakan.' }, 409);
      if (order.order_status === 'cancelled') return json({ error: 'Pesanan sudah dibatalkan.' }, 409);
      const { data, error } = await supabaseAdmin.from('waterpark_online_orders').update({ order_status: 'used', validated_at: new Date().toISOString(), validated_by: auth.user?.id || null, updated_at: new Date().toISOString() }).eq('id', order.id).eq('order_status', 'confirmed').select('*').maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'Status tiket berubah atau sudah divalidasi. Muat ulang daftar.' }, 409);
      return json({ order: data, message: 'Tiket berhasil divalidasi. Pengunjung dapat masuk.' });
    }
    if (action === 'cancel') {
      if (order.order_status === 'used') return json({ error: 'Tiket yang sudah digunakan tidak dapat dibatalkan.' }, 409);
      const { data, error } = await supabaseAdmin.from('waterpark_online_orders').update({ order_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id).select('*').single();
      if (error) throw error;
      return json({ order: data, message: 'Pesanan dibatalkan.' });
    }
    return json({ error: 'Aksi tidak dikenal.' }, 400);
  } catch (e: any) { return json({ error: e?.message || 'Gagal memproses tiket.' }, 500); }
}
