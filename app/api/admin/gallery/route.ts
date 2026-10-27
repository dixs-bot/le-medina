import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { writeAdminAudit } from '../../../../lib/adminAudit';
import { isSupabaseAdminConfigured, isSupabaseConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUCKET = 'hotel-gallery';
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const CATEGORIES = ['architecture', 'suites', 'dining', 'wellness', 'experiences'] as const;

function dbUnavailable() {
  return NextResponse.json({ error: 'Galeri membutuhkan Supabase dan SUPABASE_SERVICE_ROLE_KEY yang valid di environment server.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
function clean(value: FormDataEntryValue | null, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validUuid(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (auth.user.role !== 'super_admin') return NextResponse.json({ error: 'Galeri hanya dapat dikelola Super Admin.' }, { status: 403 });
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();
  const { data, error } = await supabaseAdmin.from('gallery_images').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) {
    console.error('[admin/gallery] list failed:', error.message);
    return NextResponse.json({ error: 'Gagal membaca galeri. Pastikan migrasi galeri sudah dijalankan.' }, { status: 500 });
  }
  return NextResponse.json({ images: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (auth.user.role !== 'super_admin') return NextResponse.json({ error: 'Hanya Super Admin yang boleh menambah foto galeri.' }, { status: 403 });
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();

  let uploadedPath = '';
  try {
    const form = await request.formData();
    const title = clean(form.get('title'), 120);
    const caption = clean(form.get('caption'), 500);
    const category = clean(form.get('category'), 32);
    const image = form.get('image');
    if (!title) return NextResponse.json({ error: 'Judul foto wajib diisi.' }, { status: 400 });
    if (!CATEGORIES.includes(category as typeof CATEGORIES[number])) return NextResponse.json({ error: 'Kategori galeri tidak valid.' }, { status: 400 });
    if (!image || typeof image === 'string' || typeof image.arrayBuffer !== 'function' || image.size <= 0) return NextResponse.json({ error: 'Pilih file gambar terlebih dahulu.' }, { status: 400 });
    if (image.size > MAX_BYTES) return NextResponse.json({ error: 'Ukuran gambar maksimal 8 MB.' }, { status: 400 });
    const extension = TYPES[image.type];
    if (!extension) return NextResponse.json({ error: 'Format gambar harus JPG, PNG, atau WebP.' }, { status: 400 });

    uploadedPath = `gallery/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(uploadedPath, Buffer.from(await image.arrayBuffer()), { contentType: image.type, cacheControl: '3600', upsert: false });
    if (uploadError) {
      console.error('[admin/gallery] upload failed:', uploadError.message);
      return NextResponse.json({ error: 'Upload foto gagal. Jalankan migrasi SQL galeri dan pastikan bucket hotel-gallery tersedia.' }, { status: 500 });
    }
    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(uploadedPath);
    const { data: last, error: lastError } = await supabaseAdmin.from('gallery_images').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    if (lastError) throw lastError;
    const { data, error } = await supabaseAdmin.from('gallery_images').insert({ category, title, image_url: publicUrlData.publicUrl, caption: caption || null, sort_order: Number(last?.sort_order || 0) + 1 }).select('*').single();
    if (error || !data) throw error || new Error('Data foto tidak berhasil disimpan.');
    await writeAdminAudit(request, auth.user, 'gallery_image_created', 'gallery_images', data.id, { title, category });
    return NextResponse.json({ success: true, image: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (uploadedPath && supabaseAdmin) await supabaseAdmin.storage.from(BUCKET).remove([uploadedPath]).catch(() => undefined);
    // Supabase PostgREST errors are plain objects, not always Error instances.
    // Log safe diagnostics so production logs reveal the actual database failure.
    const dbError = error && typeof error === 'object'
      ? error as { message?: string; code?: string; details?: string; hint?: string }
      : null;
    console.error('[admin/gallery] create failed:', {
      message: error instanceof Error ? error.message : dbError?.message || String(error || 'unknown'),
      code: dbError?.code || null,
      details: dbError?.details || null,
      hint: dbError?.hint || null,
    });
    return NextResponse.json({ error: 'Foto gagal disimpan ke galeri. Periksa izin database, tabel gallery_images, dan bucket Storage.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (auth.user.role !== 'super_admin') return NextResponse.json({ error: 'Hanya Super Admin yang boleh menghapus foto galeri.' }, { status: 403 });
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (!validUuid(body?.id)) return NextResponse.json({ error: 'ID foto tidak valid.' }, { status: 400 });
  const { data: image, error: readError } = await supabaseAdmin.from('gallery_images').select('id,title,image_url').eq('id', body.id).maybeSingle();
  if (readError || !image) return NextResponse.json({ error: 'Foto tidak ditemukan.' }, { status: 404 });
  const { error: deleteError } = await supabaseAdmin.from('gallery_images').delete().eq('id', body.id);
  if (deleteError) {
    console.error('[admin/gallery] delete row failed:', {
      message: deleteError.message,
      code: deleteError.code,
      details: deleteError.details,
      hint: deleteError.hint,
    });
    return NextResponse.json({ error: 'Foto gagal dihapus dari database.' }, { status: 500 });
  }
  const marker = `/${BUCKET}/`;
  const pathStart = image.image_url.indexOf(marker);
  if (pathStart >= 0) {
    const path = image.image_url.slice(pathStart + marker.length).split('?')[0];
    if (path) {
      const { error: storageError } = await supabaseAdmin.storage.from(BUCKET).remove([decodeURIComponent(path)]);
      if (storageError) console.error('[admin/gallery] storage cleanup failed:', storageError.message);
    }
  }
  await writeAdminAudit(request, auth.user, 'gallery_image_deleted', 'gallery_images', image.id, { title: image.title });
  return NextResponse.json({ success: true });
}
