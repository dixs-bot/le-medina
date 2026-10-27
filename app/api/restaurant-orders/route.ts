import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../lib/supabaseClient';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
function code() { return `LM${Date.now().toString().slice(-8)}${Math.floor(Math.random()*90+10)}`; }
export async function POST(req: NextRequest) {
  if (!supabaseAdmin || !isSupabaseAdminConfigured) return NextResponse.json({error:'Database pesanan belum siap. Pastikan SUPABASE_SERVICE_ROLE_KEY terpasang.'},{status:503,headers:noStore});
  try {
    const body = await req.json();
    const name = String(body.customerName || '').trim().slice(0,120);
    const room = String(body.roomNumber || '').trim().slice(0,30);
    const isHotelGuest = body.isHotelGuest !== false;
    const note = String(body.note || '').trim().slice(0,500);
    const payment = String(body.paymentMethod || 'restaurant');
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (name.length < 2) return NextResponse.json({error:'Nama pemesan wajib diisi.'},{status:400});
    if (isHotelGuest && !room) return NextResponse.json({error:'Nomor kamar wajib diisi untuk tamu menginap.'},{status:400});
    if (!['restaurant','transfer_dummy','qris_dummy'].includes(payment)) return NextResponse.json({error:'Metode pembayaran tidak valid.'},{status:400});
    if (!rawItems.length || rawItems.length > 40) return NextResponse.json({error:'Keranjang pesanan kosong atau terlalu banyak item.'},{status:400});
    const ids = [...new Set(rawItems.map((i:any)=>String(i.id || '')))];
    if (ids.some((id)=>!id)) return NextResponse.json({error:'Item menu tidak valid.'},{status:400});
    const {data: menus,error:menuError}=await supabaseAdmin.from('restaurant_menu').select('id,name,price_cents,is_available').in('id',ids);
    if(menuError) throw menuError;
    const menuMap = new Map((menus||[]).map((m:any)=>[m.id,m]));
    const items = rawItems.map((raw:any)=>{
      const menu:any=menuMap.get(String(raw.id)); const qty=Number(raw.quantity);
      if(!menu || !menu.is_available || !Number.isInteger(qty) || qty<1 || qty>99) throw new Error('Menu tidak tersedia atau jumlah pesanan tidak valid.');
      const unit = Math.round(Number(menu.price_cents)/100);
      return {menu_id:menu.id,menu_name:menu.name,quantity:qty,unit_price_idr:unit,line_total_idr:unit*qty};
    });
    const total=items.reduce((sum:any,item:any)=>sum+item.line_total_idr,0);
    const orderCode=code();
    const {data:order,error:orderError}=await supabaseAdmin.from('restaurant_orders').insert({order_code:orderCode,customer_name:name,room_number:room||null,is_hotel_guest:isHotelGuest,customer_note:note,payment_method:payment,payment_status:payment==='restaurant'?'pending':'simulated',total_idr:total,order_status:'received'}).select('*').single();
    if(orderError || !order) throw orderError || new Error('Pesanan gagal disimpan.');
    const {error:itemError}=await supabaseAdmin.from('restaurant_order_items').insert(items.map((i:any)=>({...i,order_id:order.id})));
    if(itemError){ await supabaseAdmin.from('restaurant_orders').delete().eq('id',order.id); throw itemError; }
    return NextResponse.json({order:{orderCode:order.order_code,status:order.order_status,total:order.total_idr,paymentMethod:order.payment_method},message:'Pesanan berhasil dicatat.'},{status:201,headers:noStore});
  } catch(e:any) { return NextResponse.json({error:e?.message||'Pesanan gagal disimpan.'},{status:400,headers:noStore}); }
}
