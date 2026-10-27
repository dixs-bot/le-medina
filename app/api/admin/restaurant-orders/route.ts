import { NextRequest,NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { isSupabaseAdminConfigured,supabaseAdmin } from '../../../../lib/supabaseClient';
export const dynamic='force-dynamic';
const roles=['super_admin','admin','reservation_staff'] as const;
export async function GET(req:NextRequest){
 const auth=await requireAdminAuth(req,[...roles]); if('response' in auth)return auth.response;
 if(!supabaseAdmin||!isSupabaseAdminConfigured)return NextResponse.json({error:'Supabase service role belum dikonfigurasi.'},{status:503});
 const {data,error}=await supabaseAdmin.from('restaurant_orders').select('*,restaurant_order_items(*)').order('created_at',{ascending:false}).limit(200);
 if(error)return NextResponse.json({error:'Gagal membaca pesanan restoran.'},{status:500});
 return NextResponse.json({orders:data||[]},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(req:NextRequest){
 const auth=await requireAdminAuth(req,[...roles]); if('response' in auth)return auth.response;
 if(!supabaseAdmin||!isSupabaseAdminConfigured)return NextResponse.json({error:'Supabase service role belum dikonfigurasi.'},{status:503});
 try{const body=await req.json();const id=String(body.id||'');const status=String(body.status||'');
 if(!id||!['received','processing','ready','completed','cancelled'].includes(status))return NextResponse.json({error:'Data status tidak valid.'},{status:400});
 const {data,error}=await supabaseAdmin.from('restaurant_orders').update({order_status:status,updated_at:new Date().toISOString(),...(status==='completed'?{payment_status:'paid_at_restaurant'}:{})}).eq('id',id).select('*').single();
 if(error)throw error;return NextResponse.json({order:data});
 }catch{return NextResponse.json({error:'Status pesanan gagal diperbarui.'},{status:500});}
}
