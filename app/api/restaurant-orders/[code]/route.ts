import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';
export const dynamic='force-dynamic';
export async function GET(_req:NextRequest,{params}:{params:{code:string}}){
 if(!supabaseAdmin||!isSupabaseAdminConfigured)return NextResponse.json({error:'Database belum siap.'},{status:503});
 const code=String(params.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,30);
 const {data:order,error}=await supabaseAdmin.from('restaurant_orders').select('order_code,customer_name,room_number,is_hotel_guest,customer_note,payment_method,payment_status,order_status,total_idr,created_at,updated_at,restaurant_order_items(menu_name,quantity,unit_price_idr,line_total_idr)').eq('order_code',code).maybeSingle();
 if(error)return NextResponse.json({error:'Gagal membaca status pesanan.'},{status:500});
 if(!order)return NextResponse.json({error:'Kode pesanan tidak ditemukan.'},{status:404});
 return NextResponse.json({order},{headers:{'Cache-Control':'no-store'}});
}
