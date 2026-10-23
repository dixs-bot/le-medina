import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { writeAdminAudit } from '../../../../lib/adminAudit';
import { isSupabaseAdminConfigured, isSupabaseConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MENU_BUCKET = 'restaurant-menu';
const MANAGE_ROLES = ['super_admin', 'admin', 'content_editor'] as const;

function dbUnavailable() {
  return NextResponse.json(
    { error: 'CMS restoran memerlukan Supabase dan SUPABASE_SERVICE_ROLE_KEY yang valid di environment server.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

function textValue(value: FormDataEntryValue | null, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function checked(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on' || value === '1';
}

async function resolveCategory(categoryName: string) {
  if (!supabaseAdmin) throw new Error('Koneksi Supabase admin tidak tersedia.');
  const slug = slugify(categoryName);
  if (!categoryName || !slug) throw new Error('Kategori menu wajib diisi.');

  const { data: lastCategory, error: lastError } = await supabaseAdmin
    .from('restaurant_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { data, error } = await supabaseAdmin
    .from('restaurant_categories')
    .upsert({
      name: categoryName,
      slug,
      description: '',
      sort_order: Number(lastCategory?.sort_order || 0) + 1,
      is_active: true,
    }, { onConflict: 'slug' })
    .select('*')
    .single();
  if (error || !data) throw error || new Error('Kategori tidak dapat disimpan.');
  return data;
}

async function uploadMenuImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (!value || typeof value === 'string' || typeof value.arrayBuffer !== 'function' || value.size === 0) {
    return null;
  }
  if (value.size > MAX_IMAGE_BYTES) throw new Error('Ukuran gambar maksimal 4 MB.');
  const extension = ALLOWED_IMAGE_TYPES[value.type];
  if (!extension) throw new Error('Format gambar harus JPG, PNG, WebP, atau AVIF.');
  if (!supabaseAdmin) throw new Error('Koneksi Supabase admin tidak tersedia.');

  const objectPath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin.storage
    .from(MENU_BUCKET)
    .upload(objectPath, Buffer.from(await value.arrayBuffer()), {
      contentType: value.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) {
    console.error('[admin/restaurant-menu] image upload failed:', error.message || 'Storage request failed');
    throw new Error('Foto gagal diunggah. Pastikan migrasi CMS restoran sudah dijalankan di Supabase.');
  }
  const { data } = supabaseAdmin.storage.from(MENU_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function readMenuFields(form: FormData) {
  const name = textValue(form.get('name'), 120);
  const description = textValue(form.get('description'), 2000);
  const categoryName = textValue(form.get('category_name'), 80);
  const priceIdr = Number(textValue(form.get('price_idr'), 16));
  if (!name) throw new Error('Nama menu wajib diisi.');
  if (!categoryName) throw new Error('Kategori wajib diisi, misalnya Makanan, Minuman, atau Dessert.');
  if (!Number.isSafeInteger(priceIdr) || priceIdr < 1 || priceIdr > 20_000_000) {
    throw new Error('Harga harus berupa bilangan Rupiah antara Rp1 sampai Rp20.000.000.');
  }
  // The existing schema stores money in hundredths; IDR values are represented as IDR x 100.
  if (priceIdr * 100 > 2_147_483_647) throw new Error('Harga terlalu besar untuk disimpan.');

  return {
    name,
    description,
    price_cents: priceIdr * 100,
    currency: 'IDR',
    is_vegetarian: checked(form.get('is_vegetarian')),
    is_vegan: checked(form.get('is_vegan')),
    is_gluten_free: checked(form.get('is_gluten_free')),
    is_signature: checked(form.get('is_signature')),
    is_available: form.has('is_available') ? checked(form.get('is_available')) : true,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();

  const [itemsResult, categoriesResult] = await Promise.all([
    supabaseAdmin.from('restaurant_menu').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabaseAdmin.from('restaurant_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);
  if (itemsResult.error || categoriesResult.error) {
    console.error('[admin/restaurant-menu] read failed:', itemsResult.error?.message || categoriesResult.error?.message || 'Database request failed');
    return NextResponse.json({ error: 'Gagal membaca menu restoran dari Supabase.' }, { status: 500 });
  }
  return NextResponse.json({ items: itemsResult.data || [], categories: categoriesResult.data || [] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();

  try {
    const form = await request.formData();
    const fields = readMenuFields(form);
    const category = await resolveCategory(textValue(form.get('category_name'), 80));
    const uploadedImageUrl = await uploadMenuImage(form.get('image'));
    const lastItemResult = await supabaseAdmin
      .from('restaurant_menu')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastItemResult.error) throw lastItemResult.error;

    const { data, error } = await supabaseAdmin
      .from('restaurant_menu')
      .insert({
        ...fields,
        category_id: category.id,
        image_url: uploadedImageUrl,
        sort_order: Number(lastItemResult.data?.sort_order || 0) + 1,
      })
      .select('*')
      .single();
    if (error || !data) {
      console.error('[admin/restaurant-menu] create failed:', error?.code || 'unknown', error?.message || 'Database request failed');
      throw new Error('Menu gagal disimpan ke Supabase. Periksa izin tabel restaurant_menu.');
    }
    await writeAdminAudit(request, auth.user, 'restaurant_menu_created', 'restaurant_menu', data.id, { name: data.name, price_cents: data.price_cents, category: category.name });
    return NextResponse.json({ success: true, item: data, category }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan menu restoran.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null) as { id?: unknown; is_available?: unknown } | null;
      const id = typeof body?.id === 'string' ? body.id : '';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        || typeof body?.is_available !== 'boolean') {
        return NextResponse.json({ error: 'Data status menu tidak valid.' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('restaurant_menu')
        .update({ is_available: body.is_available })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error || !data) {
        console.error('[admin/restaurant-menu] availability update failed:', error?.message || 'Menu not found');
        return NextResponse.json({ error: 'Status ketersediaan menu gagal diperbarui.' }, { status: 500 });
      }
      await writeAdminAudit(request, auth.user, 'restaurant_menu_updated', 'restaurant_menu', data.id, { name: data.name, is_available: data.is_available });
      return NextResponse.json({ success: true, item: data });
    }

    const form = await request.formData();
    const id = textValue(form.get('id'), 64);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'ID menu tidak valid.' }, { status: 400 });
    }
    const fields = readMenuFields(form);
    const category = await resolveCategory(textValue(form.get('category_name'), 80));
    const uploadedImageUrl = await uploadMenuImage(form.get('image'));
    const existingImageUrl = textValue(form.get('existing_image_url'), 2000);
    const { data, error } = await supabaseAdmin
      .from('restaurant_menu')
      .update({
        ...fields,
        category_id: category.id,
        image_url: uploadedImageUrl || existingImageUrl || null,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error || !data) {
      console.error('[admin/restaurant-menu] update failed:', error?.code || 'unknown', error?.message || 'Menu not found');
      throw new Error('Perubahan menu gagal disimpan ke Supabase.');
    }
    await writeAdminAudit(request, auth.user, 'restaurant_menu_updated', 'restaurant_menu', data.id, { name: data.name, price_cents: data.price_cents, category: category.name });
    return NextResponse.json({ success: true, item: data, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui menu restoran.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();

  const id = request.nextUrl.searchParams.get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'ID menu tidak valid.' }, { status: 400 });
  }
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('restaurant_menu').select('category_id').eq('id', id).maybeSingle();
  if (lookupError || !existing) return NextResponse.json({ error: 'Menu tidak ditemukan di Supabase.' }, { status: 404 });

  const { error } = await supabaseAdmin.from('restaurant_menu').delete().eq('id', id);
  if (error) {
    console.error('[admin/restaurant-menu] delete failed:', error.message || 'Database request failed');
    return NextResponse.json({ error: 'Menu gagal dihapus dari Supabase.' }, { status: 500 });
  }
  // Avoid leaving an empty public category tab after its last menu has been removed.
  const { count, error: countError } = await supabaseAdmin
    .from('restaurant_menu').select('id', { count: 'exact', head: true }).eq('category_id', existing.category_id);
  if (!countError && count === 0) {
    await supabaseAdmin.from('restaurant_categories').update({ is_active: false }).eq('id', existing.category_id);
  }
  await writeAdminAudit(request, auth.user, 'restaurant_menu_deleted', 'restaurant_menu', id, { category_id: existing.category_id });
  return NextResponse.json({ success: true });
}
