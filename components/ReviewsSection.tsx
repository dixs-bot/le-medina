'use client';

import React from 'react';
import { TamuReview } from '../lib/types';
import { Star, ShieldCheck, Quote } from 'lucide-react';

interface ReviewsSectionProps {
  reviews: TamuReview[];
}

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  return (
    <section className="py-24 bg-ivory-50 text-charcoal border-t border-bordercolor">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold-600 text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
            Ulasan Tamu
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-forest leading-tight mb-4">
            Cerita dari Para Tamu
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex text-gold">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-gold text-gold" />
              ))}
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-forest">
              Nilai Sempurna 5.0 / 5.0
            </span>
          </div>
          <p className="text-mutedgray text-xs sm:text-sm">
            Kesan dan ulasan tulus dari para tamu yang telah menikmati kenyamanan menginap dan pelayanan kami.
          </p>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-ivory rounded-xl p-8 border border-bordercolor shadow-luxury flex flex-col justify-between relative group hover:shadow-luxury-lg transition-all"
            >
              <Quote className="w-8 h-8 text-gold-300/40 absolute top-6 right-6 pointer-events-none" />

              <div>
                {/* Rating stars */}
                <div className="flex text-gold mb-4">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />
                  ))}
                </div>

                <h3 className="font-editorial text-lg font-bold text-forest mb-3">
                  “{rev.title}”
                </h3>

                <p className="text-xs sm:text-sm text-charcoal/80 leading-relaxed italic mb-6">
                  {rev.comment}
                </p>
              </div>

              {/* Tamu metadata */}
              <div className="pt-4 border-t border-bordercolor/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-forest uppercase tracking-wider">
                    {rev.guest_name}
                  </h4>
                  <p className="text-[11px] text-mutedgray">
                    {rev.origin_city ? `${rev.origin_city}, ` : ''}{rev.country}
                  </p>
                </div>

                {rev.is_verified && (
                  <span className="flex items-center gap-1 text-[11px] text-status-success font-medium bg-forest-50 px-2 py-0.5 rounded border border-forest-100">
                    <ShieldCheck className="w-3 h-3" /> Tamu Terverifikasi
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
