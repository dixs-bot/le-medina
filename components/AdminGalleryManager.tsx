'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import type { GaleriImage } from '../lib/types';

const CATEGORIES: { value: GaleriImage['category']; label: string }[] = [
  { value: 'architecture', label: 'Arsitektur' },
  { value: 'suites', label: 'Kamar & Ruang Tamu' },
  { value: 'dining', label: 'Restoran & Kuliner' },
  { value: 'wellness', label: 'Kolam Renang & Spa' },
  { value: 'experiences', label: 'Pesona Singkawang' },
];

export default function AdminGalleryManager() {
  const [images, setImages] = useState<GaleriImage[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<GaleriImage['category']>('architecture');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/gallery', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Galeri gagal dimuat.');
      setImages(Array.isArray(payload?.images) ? payload.images : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Galeri gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadImages(); }, [loadImages]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : '');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (!title.trim()) { setError('Judul foto wajib diisi.'); return; }
    if (!file) { setError('Pilih foto fasilitas hotel terlebih dahulu.'); return; }
    const form = new FormData();
    form.set('title', title.trim());
    form.set('caption', caption.trim());
    form.set('category', category);
    form.set('image', file);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/gallery', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Foto gagal disimpan.');
      setMessage('Foto berhasil diunggah dan akan ditampilkan di galeri website pelanggan.');
      setTitle(''); setCaption(''); setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview('');
      const input = document.getElementById('gallery-upload-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foto gagal disimpan.');
    } finally { setSaving(false); }
  };

  const removeImage = async (image: GaleriImage) => {
    if (!window.confirm(`Hapus foto “${image.title}” dari galeri website pelanggan?`)) return;
    setError(''); setMessage(''); setDeletingId(image.id);
    try {
      const response = await fetch('/api/admin/gallery', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: image.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Foto gagal dihapus.');
      setImages((current) => current.filter((item) => item.id !== image.id));
      setMessage('Foto berhasil dihapus dari galeri.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foto gagal dihapus.');
    } finally { setDeletingId(null); }
  };

  return (
    <div className="max-w-6xl space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-editorial text-3xl font-bold text-forest mb-1">Galeri Foto Hotel</h1>
          <p className="text-xs text-mutedgray">Unggah foto fasilitas asli hotel. Foto yang tersimpan akan digunakan pada bagian “Galeri Foto — Momen di Hotel Le Medina” di website pelanggan.</p>
        </div>
        <button type="button" onClick={() => void loadImages()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-bordercolor bg-white px-4 py-2.5 text-xs font-semibold text-forest disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

      <form onSubmit={submit} className="rounded-xl border border-bordercolor bg-white p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center gap-2"><ImagePlus className="h-5 w-5 text-gold-600" /><h2 className="font-editorial text-xl font-bold text-forest">Tambah Foto Galeri</h2></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="gallery-title" className="mb-1 block text-xs font-semibold text-charcoal">Judul foto *</label>
            <input id="gallery-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Contoh: Kolam Renang Hotel" className="w-full rounded-lg border border-bordercolor bg-ivory-50 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label htmlFor="gallery-category" className="mb-1 block text-xs font-semibold text-charcoal">Kategori *</label>
            <select id="gallery-category" value={category} onChange={(e) => setCategory(e.target.value as GaleriImage['category'])} className="w-full rounded-lg border border-bordercolor bg-ivory-50 px-3 py-2.5 text-sm">
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="gallery-caption" className="mb-1 block text-xs font-semibold text-charcoal">Keterangan (opsional)</label>
            <textarea id="gallery-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} rows={2} placeholder="Keterangan singkat tentang foto atau fasilitas" className="w-full rounded-lg border border-bordercolor bg-ivory-50 px-3 py-2.5 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="gallery-upload-file" className="mb-1 block text-xs font-semibold text-charcoal">File foto * (JPG, PNG, WebP, maksimal 8 MB)</label>
            <input id="gallery-upload-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="block w-full rounded-lg border border-bordercolor bg-ivory-50 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-forest file:px-3 file:py-2 file:text-white" />
          </div>
        </div>
        {preview && <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-bordercolor"><img src={preview} alt="Pratinjau foto galeri" className="h-56 w-full object-cover" /><button type="button" onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(''); setFile(null); const input = document.getElementById('gallery-upload-file') as HTMLInputElement | null; if (input) input.value = ''; }} className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-charcoal" aria-label="Hapus pratinjau"><X className="h-4 w-4" /></button></div>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-3 text-xs font-bold uppercase tracking-wider text-ivory disabled:opacity-50"><Upload className="h-4 w-4" />{saving ? 'Mengunggah foto...' : 'Unggah & Tampilkan di Website'}</button>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-editorial text-xl font-bold text-forest">Foto yang Tersimpan</h2><span className="text-xs text-mutedgray">{images.length} foto</span></div>
        {loading && images.length === 0 ? <div className="rounded-xl border border-bordercolor bg-white p-8 text-center text-sm text-mutedgray">Memuat galeri...</div> : images.length === 0 ? <div className="rounded-xl border border-bordercolor bg-white p-8 text-center text-sm text-mutedgray">Belum ada foto di database.</div> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => <article key={image.id} className="overflow-hidden rounded-xl border border-bordercolor bg-white shadow-sm">
              <img src={image.image_url} alt={image.title} className="h-48 w-full bg-ivory-100 object-cover" loading="lazy" />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3"><h3 className="font-editorial font-bold text-forest">{image.title}</h3><span className="shrink-0 rounded-full bg-ivory-100 px-2 py-1 text-[10px] text-charcoal">{CATEGORIES.find((item) => item.value === image.category)?.label || image.category}</span></div>
                {image.caption && <p className="line-clamp-2 text-xs text-mutedgray">{image.caption}</p>}
                <button type="button" onClick={() => void removeImage(image)} disabled={deletingId === image.id} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />{deletingId === image.id ? 'Menghapus...' : 'Hapus Foto'}</button>
              </div>
            </article>)}
          </div>
        )}
      </section>
    </div>
  );
}
