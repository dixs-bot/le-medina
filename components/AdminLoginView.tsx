'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Lock, Mail, ArrowLeft, KeyRound, AlertCircle, Sparkles } from 'lucide-react';
import { Role } from '../lib/types';

export default function AdminLoginView() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@lemedina.id');
  const [password, setPassword] = useState('MedinaAdmin2026!');
  const [requestedRole, setRequestedRole] = useState<Role>('super_admin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          requestedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi gagal. Silakan periksa kembali email dan kata sandi Anda.');
      }

      // Success: reload the page so server-side page.tsx validates session cookie
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-forest-950 text-ivory border-b border-forest-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-gold-300 hover:text-white uppercase tracking-wider font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda Publik</span>
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gold-400" />
          <span className="text-[11px] uppercase tracking-widest text-ivory-300 font-medium">
            Portal Administrasi Aman
          </span>
        </div>
      </header>

      {/* Main Login Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full bg-ivory-50 rounded-2xl shadow-luxury-lg border border-bordercolor overflow-hidden">
          {/* Card Header */}
          <div className="bg-forest p-8 text-center text-ivory relative border-b border-gold/30">
            <div className="w-14 h-14 rounded-full bg-forest-900 border-2 border-gold flex items-center justify-center mx-auto mb-3 shadow-md">
              <Lock className="w-7 h-7 text-gold" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-gold-300 font-bold block mb-1">
              HÔTEL LE MÉDINA & RESTO
            </span>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-wide text-ivory">
              Masuk Panel Pengelola
            </h1>
            <p className="text-xs text-ivory-200/90 mt-1.5 font-light">
              Masukkan kredensial terdaftar untuk mengakses data reservasi, inventaris, dan konfigurasi hotel.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-status-error/10 border border-status-error/30 flex items-start gap-3 text-xs text-status-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-forest mb-1.5">
                Alamat Email Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-mutedgray absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lemedina.id"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-bordercolor bg-white text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-forest mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-mutedgray absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-bordercolor bg-white text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-forest mb-1.5">
                Peran Akses (RBAC Persona)
              </label>
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-bordercolor bg-white text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
              >
                <option value="super_admin">Super Administrator (Semua Izin Penuh)</option>
                <option value="admin">Administrator Operasional</option>
                <option value="reservation_staff">Staf Reservasi & Meja Depan</option>
                <option value="content_editor">Editor Konten & Restoran</option>
              </select>
              <p className="text-[10px] text-mutedgray mt-1">
                Kredensial demo: <code>admin@lemedina.id</code> / <code>MedinaAdmin2026!</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-forest hover:bg-forest-900 text-ivory font-semibold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-gold/40 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memverifikasi Kredensial...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span>Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Card */}
          <div className="px-6 py-4 bg-ivory border-t border-bordercolor text-center text-[11px] text-mutedgray">
            Dilindungi enkripsi sesi server & kebijakan otorisasi berbasis peran (RBAC).
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-mutedgray border-t border-bordercolor">
        &copy; {new Date().getFullYear()} Hôtel Le Médina & Resto Singkawang. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}
