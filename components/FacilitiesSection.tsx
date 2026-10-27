'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, CheckCircle2, Ticket, Waves } from 'lucide-react';
import { Facility } from '../lib/types';

interface FacilitiesSectionProps {
  // Kept for compatibility with PublicInteractiveWrapper; the old hotel-facility
  // cards are intentionally replaced by the Mini Waterpark ticket CTA.
  facilities: Facility[];
}

export default function FacilitiesSection({ facilities: _facilities }: FacilitiesSectionProps) {
  return (
    <section id="facilities" className="relative overflow-hidden bg-[#101b17] py-20 text-[#f7f3ea] sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#b99762]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-emerald-800/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a56b]">
              <Waves className="h-4 w-4" /> Hiburan untuk keluarga
            </span>
            <h2 className="font-editorial text-3xl font-bold leading-tight text-[#f7f3ea] sm:text-5xl">
              Pesan Tiket <span className="text-[#c9a56b]">Mini Waterpark</span>
            </h2>
            <div className="mt-5 h-0.5 w-16 bg-[#b99762]" />
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Rencanakan waktu bermain bersama keluarga di Mini Waterpark Hôtel Le Médina. Pesan tiket secara online, pilih jumlah tiket dewasa dan anak-anak, lalu simpan kode validasi untuk ditunjukkan kepada petugas saat tiba.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="rounded-lg bg-[#c9a56b]/15 p-2 text-[#c9a56b]"><Ticket className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-[#f7f3ea]">Tiket Dewasa & Anak</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">Harga dan jumlah tiket dihitung otomatis saat pemesanan.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="rounded-lg bg-[#c9a56b]/15 p-2 text-[#c9a56b]"><CalendarCheck className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-[#f7f3ea]">Kode Validasi Tiket</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">Simpan kode pesanan untuk pemeriksaan di loket.</p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/65">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#c9a56b]" /> Pesan online kapan saja</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#c9a56b]" /> Bayar di loket tersedia</span>
            </div>

            <Link
              href="/tiket-waterpark"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#b99762] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#14231c] shadow-lg transition hover:bg-[#d0b17c] focus:outline-none focus:ring-2 focus:ring-[#d0b17c] focus:ring-offset-2 focus:ring-offset-[#101b17]"
            >
              Pesan Tiket Mini Waterpark <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-2xl border border-[#b99762]/25" />
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#192a23] p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#c9a56b]">Pengalaman keluarga</p>
                  <h3 className="mt-2 font-editorial text-2xl font-bold sm:text-3xl">Siap untuk bermain?</h3>
                </div>
                <div className="rounded-full border border-[#b99762]/40 bg-[#b99762]/10 p-3 text-[#c9a56b]"><Waves className="h-7 w-7" /></div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-[#0f1b16] px-4 py-4">
                  <div><p className="font-semibold">Tiket Dewasa</p><p className="mt-1 text-xs text-white/55">Pilih jumlah pengunjung dewasa</p></div>
                  <Ticket className="h-5 w-5 text-[#c9a56b]" />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#0f1b16] px-4 py-4">
                  <div><p className="font-semibold">Tiket Anak-anak</p><p className="mt-1 text-xs text-white/55">Harga mengikuti pengaturan tiket aktif</p></div>
                  <Ticket className="h-5 w-5 text-[#c9a56b]" />
                </div>
                <div className="rounded-lg border border-dashed border-[#b99762]/35 p-4 text-sm leading-6 text-white/65">
                  Pilih transfer, QRIS, atau pembayaran di loket. Metode transfer dan QRIS saat ini masih simulasi dan menunggu verifikasi petugas.
                </div>
              </div>
              <Link href="/tiket-waterpark" className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-[#b99762]/50 px-5 py-3 text-sm font-semibold text-[#e6c991] transition hover:bg-[#b99762]/10">
                Lihat Pemesanan Tiket <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
