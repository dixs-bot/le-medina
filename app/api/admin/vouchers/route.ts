import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { writeAdminAudit } from '../../../../lib/adminAudit';
import { isSupabaseAdminConfigured, isSupabaseConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MANAGE_ROLES = ['super_admin', 'admin', 'content_editor'] as const;
const VOUCHER_BUCKET = 'voucher-images';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

type VoucherFields = {
  title: string;
  code: string;
  tagline: string;
  description: string;
  discount_percentage: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
};

function unavailable() {
  return NextResponse.json(
    { error: 'CMS voucher memerlukan Supabase dan SUPABASE_SERVICE_ROLE_KEY yang valid pada environment server.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

function textValue(value: FormDataEntryValue | null, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function checked(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on' || value === '1';
}

function validISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readVoucherFields(form: FormData): VoucherFields {
  const title = textValue(form.get('title'), 120);
  const code = textValue(form.get('code'), 32).toUpperCase();
  const tagline = textValue(form.get('tagline'), 240);
  const description = textValue(form.get('description'), 2000);
  const discountPercentage = Number(textValue(form.get('discount_percentage'), 3));
  const validFrom = textValue(form.get('valid_from'), 10);
  const validTo = textValue(form.get('valid_to'), 10);

  if (!title) throw new Error('Nama voucher wajib diisi.');
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
    throw new Error('Kode voucher harus 3–32 karakter, berisi huruf besar, angka, tanda hubung, atau garis bawah.');
  }
  if (!Number.isInteger(discountPercentage) || discountPercentage < 1 || discountPercentage > 100) {
    throw new Error('Diskon harus berupa angka bulat antara 1% dan 100%.');
  }
  if (!validISODate(validFrom) || !validISODate(validTo)) {
    throw new Error('Tanggal mulai dan akhir voucher harus valid.');
  }
  if (validTo < validFrom) throw new Error('Tanggal akhir voucher tidak boleh sebelum tanggal mulai.');

  return {
    title,
    code,
    tagline,
    description,
    discount_percentage: discountPercentage,
    valid_from: validFrom,
    valid_to: validTo,
    is_active: checked(form.get('is_active')),
  };
}

async function uploadVoucherImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (!value || typeof value === 'string' || typeof value.arrayBuffer !== 'function' || value.size === 0) return null;
  if (value.size > MAX_IMAGE_BYTES) throw new Error('Ukuran foto voucher maksimal 4 MB.');
  const extension = ALLOWED_IMAGE_TYPES[value.type];
  if (!extension) throw new Error('Format foto harus JPG, PNG, WebP, atau AVIF.');
  if (!supabaseAdmin) throw new Error('Koneksi Supabase admin tidak tersedia.');

  const objectPath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin.storage
    .from(VOUCHER_BUCKET)
    .upload(objectPath, Buffer.from(await value.arrayBuffer()), {
      contentType: value.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) {
    console.error('[admin/vouchers] image upload failed:', error.message || 'Storage request failed');
    throw new Error('Foto voucher gagal diunggah. Pastikan migrasi CMS voucher sudah dijalankan.');
  }
  return supabaseAdmin.storage.from(VOUCHER_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

function extractBucketPath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl || !supabaseAdmin) return null;
  const marker = `/storage/v1/object/public/${VOUCHER_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index < 0) return null;
  const path = publicUrl.slice(index + marker.length);
  return path && !path.includes('..') ? path : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[admin/vouchers] list failed:', error.code || 'unknown');
    return NextResponse.json({ error: 'Daftar voucher gagal dibaca dari Supabase.' }, { status: 500 });
  }
  return NextResponse.json({ vouchers: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  try {
    const form = await request.formData();
    const fields = readVoucherFields(form);
    const imageUrl = await uploadVoucherImage(form.get('image'));
    if (!imageUrl) throw new Error('Foto voucher wajib diunggah sebelum voucher dibuat.');

    const { data, error } = await supabaseAdmin
      .from('offers')
      .insert({ ...fields, image_url: imageUrl })
      .select('*')
      .single();
    if (error || !data) {
      if (error?.code === '23505') throw new Error('Kode voucher sudah digunakan. Silakan buat kode unik lain.');
      console.error('[admin/vouchers] create failed:', error?.code || 'unknown');
      throw new Error('Voucher gagal disimpan ke Supabase.');
    }
    await writeAdminAudit(request, auth.user, 'voucher_created', 'offer', String(data.id), {
      code: data.code,
      discount_percentage: data.discount_percentage,
      valid_from: data.valid_from,
      valid_to: data.valid_to,
    });
    return NextResponse.json({ success: true, voucher: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Voucher gagal dibuat.';
    const status = message.includes('sudah digunakan') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null) as { id?: unknown; is_active?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || typeof body?.is_active !== 'boolean') {
      return NextResponse.json({ error: 'Data status voucher tidak valid.' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.from('offers').update({ is_active: body.is_active }).eq('id', id).select('*').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Status voucher gagal diperbarui.' }, { status: 500 });
    await writeAdminAudit(request, auth.user, body.is_active ? 'voucher_activated' : 'voucher_deactivated', 'offer', id, { code: data.code });
    return NextResponse.json({ success: true, voucher: data });
  }

  try {
    const form = await request.formData();
    const id = textValue(form.get('id'), 64);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'ID voucher tidak valid.' }, { status: 400 });
    }
    const fields = readVoucherFields(form);
    const { data: existing, error: lookupError } = await supabaseAdmin.from('offers').select('id,image_url').eq('id', id).maybeSingle();
    if (lookupError || !existing) return NextResponse.json({ error: 'Voucher tidak ditemukan di Supabase.' }, { status: 404 });

    const uploadedImageUrl = await uploadVoucherImage(form.get('image'));
    const removeImage = checked(form.get('remove_image'));
    const nextImageUrl = uploadedImageUrl || (removeImage ? null : existing.image_url);
    if (!nextImageUrl) throw new Error('Foto voucher wajib tersedia. Silakan unggah foto sebelum menyimpan.');

    const { data, error } = await supabaseAdmin.from('offers').update({ ...fields, image_url: nextImageUrl }).eq('id', id).select('*').maybeSingle();
    if (error || !data) {
      if (error?.code === '23505') throw new Error('Kode voucher sudah digunakan. Silakan buat kode unik lain.');
      console.error('[admin/vouchers] update failed:', error?.code || 'unknown');
      throw new Error('Perubahan voucher gagal disimpan ke Supabase.');
    }
    if (uploadedImageUrl && existing.image_url && existing.image_url !== uploadedImageUrl) {
      const oldPath = extractBucketPath(existing.image_url);
      if (oldPath) await supabaseAdmin.storage.from(VOUCHER_BUCKET).remove([oldPath]).catch(() => undefined);
    }
    await writeAdminAudit(request, auth.user, 'voucher_updated', 'offer', String(data.id), {
      code: data.code,
      discount_percentage: data.discount_percentage,
      valid_from: data.valid_from,
      valid_to: data.valid_to,
    });
    return NextResponse.json({ success: true, voucher: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Perubahan voucher gagal disimpan.';
    const status = message.includes('sudah digunakan') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request, [...MANAGE_ROLES]);
  if ('response' in auth) return auth.response;
  if (!isSupabaseConfigured || !isSupabaseAdminConfigured || !supabaseAdmin) return unavailable();

  const id = request.nextUrl.searchParams.get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'ID voucher tidak valid.' }, { status: 400 });
  }
  const { data: existing, error: lookupError } = await supabaseAdmin.from('offers').select('title,code,image_url').eq('id', id).maybeSingle();
  if (lookupError || !existing) return NextResponse.json({ error: 'Voucher tidak ditemukan di Supabase.' }, { status: 404 });

  const { error } = await supabaseAdmin.from('offers').delete().eq('id', id);
  if (error) {
    console.error('[admin/vouchers] delete failed:', error.code || 'unknown');
    return NextResponse.json({ error: 'Voucher gagal dihapus dari Supabase.' }, { status: 500 });
  }
  const imagePath = extractBucketPath(existing.image_url);
  if (imagePath) await supabaseAdmin.storage.from(VOUCHER_BUCKET).remove([imagePath]).catch(() => undefined);
  await writeAdminAudit(request, auth.user, 'voucher_deleted', 'offer', id, { code: existing.code, title: existing.title });
  return NextResponse.json({ success: true });
}
