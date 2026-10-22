'use client';

import React from 'react';
import { ArrowRight, Star, ShieldCheck, Sparkles, UtensilsCrossed } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center bg-forest-950 overflow-hidden text-ivory">
      {/* Background with Darkened Luxe Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=2000&q=85')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/80 to-forest-950/60" />
        <div className="absolute inset-0 bg-radial-gradient opacity-40 mix-blend-multiply" />
      </div>

      {/* Decorative Traditional Arabesque Corner Borders */}
      <div className="absolute top-6 left-6 w-24 h-24 border-t-2 border-l-2 border-gold/40 pointer-events-none hidden md:block" />
      <div className="absolute top-6 right-6 w-24 h-24 border-t-2 border-r-2 border-gold/40 pointer-events-none hidden md:block" />
      <div className="absolute bottom-6 left-6 w-24 h-24 border-b-2 border-l-2 border-gold/40 pointer-events-none hidden md:block" />
      <div className="absolute bottom-6 right-6 w-24 h-24 border-b-2 border-r-2 border-gold/40 pointer-events-none hidden md:block" />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12 pb-20">
        {/* Rating and Five Star Heritage Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-800/80 border border-gold/40 text-xs tracking-widest uppercase text-gold-300 mb-6 backdrop-blur-sm">
          <div className="flex text-gold">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />
            ))}
          </div>
          <span className="font-semibold text-ivory">5-Star Luxury Riad & Historic Haven</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-ivory leading-[1.1] mb-6">
          An Andalusian Sanctuary of <br />
          <span className="italic font-normal text-gold-300">Timeless Elegance</span> in Marrakech
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-ivory-200/90 font-light leading-relaxed mb-10">
          Behind modest Medina walls lies an authentic palace of tranquil emerald courtyards, hand-carved cedarwood salons, Michelin-inspired Moroccan gastronomy, and ancestral hammam rituals.
        </p>

        {/* Dual Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-16">
          <a
            href="#suites"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gold hover:bg-gold-600 text-charcoal-900 font-semibold px-8 py-4 rounded text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            <span>Explore Suites & Stays</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#dining"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-forest-800/80 hover:bg-forest-700/90 border border-gold/50 text-ivory font-medium px-8 py-4 rounded text-xs uppercase tracking-widest backdrop-blur-sm transition-all"
          >
            <UtensilsCrossed className="w-4 h-4 text-gold" />
            <span>Restaurant & Gastronomy</span>
          </a>
        </div>

        {/* Key Features / Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-forest-700/60 text-left">
          <div className="p-3 bg-forest-900/60 rounded border border-forest-800/80 backdrop-blur-sm">
            <div className="text-gold flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Suites Only
            </div>
            <p className="text-xs text-ivory-300">4 bespoke suites & rooms with zellige tile & cedar details</p>
          </div>
          <div className="p-3 bg-forest-900/60 rounded border border-forest-800/80 backdrop-blur-sm">
            <div className="text-gold flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Michelin Curated
            </div>
            <p className="text-xs text-ivory-300">Organic rooftop orchards & authentic slow tagine artistry</p>
          </div>
          <div className="p-3 bg-forest-900/60 rounded border border-forest-800/80 backdrop-blur-sm">
            <div className="text-gold flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Private Hammam
            </div>
            <p className="text-xs text-ivory-300">Carved warm marble steam rooms and black soap rituals</p>
          </div>
          <div className="p-3 bg-forest-900/60 rounded border border-forest-800/80 backdrop-blur-sm">
            <div className="text-gold flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1">
              <Star className="w-3.5 h-3.5 fill-gold text-gold" /> Medina Heart
            </div>
            <p className="text-xs text-ivory-300">5-minute private stroll to Jemaa el-Fnaa & royal palaces</p>
          </div>
        </div>
      </div>
    </section>
  );
}
