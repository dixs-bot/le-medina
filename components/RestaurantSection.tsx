'use client';

import React from 'react';
import { ShoppingBag, Utensils, MessageSquare } from 'lucide-react';

interface RestaurantSectionProps {
  categories: unknown[];
  menuItems: unknown[];
  whatsappNumber: string;
}

/**
 * Homepage restaurant teaser only. Menu cards are intentionally rendered on
 * /pesan-makanan so a growing CMS menu cannot make the homepage too long.
 */
export default function RestaurantSection({ whatsappNumber }: RestaurantSectionProps) {
  const cleanWhatsAppNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const dinnerInquiryText = encodeURIComponent(
    'Halo! Saya ingin menanyakan ketersediaan dan reservasi meja di Restoran Le Medina untuk makan siang/malam.'
  );
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${dinnerInquiryText}`;

  return (
    <section id="dining" className="relative overflow-hidden bg-forest-950 py-24 text-ivory">
      <div className="pointer-events-none absolute inset-0 bg-radial-gradient opacity-20" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
            Pilihan Hidangan
          </span>
          <h2 className="mb-4 font-editorial text-3xl font-bold leading-tight text-ivory sm:text-5xl">
            Restoran Le Medina
          </h2>
          <div className="mx-auto mb-6 h-0.5 w-16 bg-gold" />
          <p className="text-sm leading-relaxed text-ivory-200/80 sm:text-base">
            Nikmati pilihan hidangan Restoran Le Medina. Seluruh menu, harga, dan ketersediaan
            hidangan dapat dilihat di halaman pemesanan online khusus.
          </p>
        </div>

        <div className="mx-auto mb-14 max-w-3xl rounded-xl border border-gold/30 bg-forest-900/70 p-7 text-center shadow-xl sm:p-10">
          <Utensils className="mx-auto mb-4 h-9 w-9 text-gold-400" />
          <h3 className="mb-3 font-editorial text-2xl font-bold text-ivory sm:text-3xl">
            Lihat Menu & Pesan Makanan
          </h3>
          <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-ivory-200/75">
            Buka halaman khusus untuk melihat semua menu yang tersedia, menambahkan hidangan ke
            keranjang, mengirim pesanan, dan memantau status pesanan menggunakan kode pelacakan.
          </p>
          <a
            href="/pesan-makanan"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-charcoal shadow-lg transition hover:brightness-110"
          >
            <ShoppingBag className="h-4 w-4" /> Pesan Makanan Online
          </a>
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 rounded-xl border border-gold/30 bg-gradient-to-r from-forest-900 to-forest-800 p-8 shadow-2xl md:flex-row">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
              <Utensils className="h-4 w-4" /> Terbuka untuk Umum & Tamu Menginap
            </div>
            <h4 className="mb-2 font-editorial text-2xl font-bold text-ivory">
              Reservasi Meja Restoran
            </h4>
            <p className="max-w-xl text-xs text-ivory-300 sm:text-sm">
              Untuk reservasi meja, perayaan khusus, atau permintaan menu khusus, silakan hubungi
              tim restoran melalui WhatsApp.
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-2.5 rounded bg-status-success px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Reservasi via WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
