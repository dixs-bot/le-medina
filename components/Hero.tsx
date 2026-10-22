
'use client';

import React from 'react';
import {
  ArrowRight,
  Star,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-forest-950 text-ivory">
      {/* Background with Darkened Luxe Overlay */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat transition-transform duration-1000 ease-out"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=2000&q=85')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/80 to-forest-950/60" />
        <div className="absolute inset-0 bg-radial-gradient opacity-40 mix-blend-multiply" />
      </div>

      {/* Decorative Traditional Arabesque Corner Borders */}
      <div className="pointer-events-none absolute left-6 top-6 hidden h-24 w-24 border-l-2 border-t-2 border-gold/40 md:block" />
      <div className="pointer-events-none absolute right-6 top-6 hidden h-24 w-24 border-r-2 border-t-2 border-gold/40 md:block" />
      <div className="pointer-events-none absolute bottom-6 left-6 hidden h-24 w-24 border-b-2 border-l-2 border-gold/40 md:block" />
      <div className="pointer-events-none absolute bottom-6 right-6 hidden h-24 w-24 border-b-2 border-r-2 border-gold/40 md:block" />

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-12 text-center sm:px-6 lg:px-8">
        {/* Hotel Highlight */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-forest-800/80 px-4 py-1.5 text-xs uppercase tracking-widest text-gold-300 backdrop-blur-sm">
          <div className="flex text-gold">
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                className="h-3.5 w-3.5 fill-gold text-gold"
                aria-hidden="true"
              />
            ))}
          </div>

          <span className="font-semibold text-ivory">
            Hotel & Restoran di Singkawang
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="mb-6 font-editorial text-4xl font-bold leading-[1.1] tracking-tight text-ivory sm:text-6xl md:text-7xl">
          Pengalaman Menginap Nyaman & Istimewa
          <br />
          <span className="font-normal italic text-gold-300">
            Hôtel Le Médina & Resto
          </span>{' '}
          Singkawang
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-2xl text-base font-light leading-relaxed text-ivory-200/90 sm:text-lg">
          Nikmati suasana menginap yang tenang dengan desain berkarakter,
          sentuhan elegan, kamar yang nyaman, serta sajian kuliner istimewa
          untuk menghadirkan pengalaman berkesan selama berada di Singkawang.
        </p>

        {/* Primary Actions */}
        <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <a
            href="#suites"
            className="inline-flex w-full transform items-center justify-center gap-3 rounded bg-gold px-8 py-4 text-xs font-semibold uppercase tracking-widest text-charcoal-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-gold-600 hover:shadow-xl sm:w-auto"
          >
            <span>Jelajahi Kamar</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>

          <a
            href="#dining"
            className="inline-flex w-full items-center justify-center gap-3 rounded border border-gold/50 bg-forest-800/80 px-8 py-4 text-xs font-medium uppercase tracking-widest text-ivory backdrop-blur-sm transition-all hover:bg-forest-700/90 sm:w-auto"
          >
            <UtensilsCrossed
              className="h-4 w-4 text-gold"
              aria-hidden="true"
            />
            <span>Restoran & Hidangan</span>
          </a>
        </div>

        {/* Key Features */}
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 border-t border-forest-700/60 pt-6 text-left sm:grid-cols-4">
          <div className="rounded border border-forest-800/80 bg-forest-900/60 p-3 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Kamar Eksklusif
            </div>
            <p className="text-xs text-ivory-300">
              Pilihan kamar nyaman dengan desain elegan dan detail interior
              yang menawan.
            </p>
          </div>

          <div className="rounded border border-forest-800/80 bg-forest-900/60 p-3 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
              <UtensilsCrossed
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
              Kuliner Istimewa
            </div>
            <p className="text-xs text-ivory-300">
              Sajian pilihan dengan cita rasa yang menggugah selera.
            </p>
          </div>

          <div className="rounded border border-forest-800/80 bg-forest-900/60 p-3 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Kenyamanan Tamu
            </div>
            <p className="text-xs text-ivory-300">
              Suasana yang mendukung waktu istirahat lebih nyaman dan
              menyenangkan.
            </p>
          </div>

          <div className="rounded border border-forest-800/80 bg-forest-900/60 p-3 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
              <Star
                className="h-3.5 w-3.5 fill-gold text-gold"
                aria-hidden="true"
              />
              Lokasi Strategis
            </div>
            <p className="text-xs text-ivory-300">
              Jelajahi pusat kota Singkawang, destinasi budaya, dan kuliner
              lokal.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
