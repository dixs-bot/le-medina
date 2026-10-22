'use client';

import React, { useState } from 'react';
import { Offer } from '../lib/types';
import { formatDate } from '../lib/utils';
import { Tag, Sparkles, Copy, Check, Calendar, ArrowRight } from 'lucide-react';

interface OffersSectionProps {
  offers: Offer[];
  onApplyPromoCode: (code: string) => void;
}

export default function OffersSection({
  offers,
  onApplyPromoCode,
}: OffersSectionProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <section id="offers" className="py-24 bg-forest-900 text-ivory relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold-400 text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
            Privileged Stays
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-ivory leading-tight mb-4">
            Seasonal Packages & Special Offers
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <p className="text-ivory-200/80 text-sm sm:text-base leading-relaxed">
            Reserve directly with our boutique hotel to unlock privileged amenities, private airport limousine transfers, and bespoke wellness treatments.
          </p>
        </div>

        {/* Offers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-forest-950/90 rounded-xl overflow-hidden border border-gold/30 shadow-2xl flex flex-col justify-between group"
            >
              <div>
                {/* Offer Banner Photo */}
                {offer.image_url && (
                  <div className="relative h-56 w-full overflow-hidden bg-forest-900">
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-transparent" />

                    {/* Discount Badge */}
                    {offer.discount_percentage && (
                      <div className="absolute top-4 right-4 bg-gold text-charcoal font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded shadow-lg flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> Save {offer.discount_percentage}%
                      </div>
                    )}
                  </div>
                )}

                {/* Offer Details */}
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 text-gold-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" /> Limited Availability
                  </div>

                  <h3 className="font-editorial text-2xl font-bold text-ivory mb-2">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-gold-200 italic mb-4">{offer.tagline}</p>

                  <p className="text-xs sm:text-sm text-ivory-300 leading-relaxed mb-6">
                    {offer.description}
                  </p>

                  {/* Validity Dates */}
                  <div className="flex items-center gap-2 text-xs text-ivory-300/80 pb-4 border-b border-forest-800">
                    <Calendar className="w-4 h-4 text-gold-400" />
                    <span>
                      Valid: <strong className="text-ivory">{formatDate(offer.valid_from)}</strong> to{' '}
                      <strong className="text-ivory">{formatDate(offer.valid_to)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Promo Code & Action Button */}
              {offer.code && (
                <div className="p-6 sm:p-8 pt-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs uppercase tracking-wider text-ivory-300">Code:</span>
                    <button
                      onClick={() => handleCopy(offer.code!)}
                      className="flex items-center gap-2 bg-forest-900 hover:bg-forest-800 text-gold px-3 py-1.5 rounded border border-gold/40 text-xs font-mono font-bold tracking-wider transition-all"
                      title="Click to copy code"
                    >
                      <span>{offer.code}</span>
                      {copiedCode === offer.code ? (
                        <Check className="w-3.5 h-3.5 text-status-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gold/70" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => onApplyPromoCode(offer.code!)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-600 text-charcoal font-semibold text-xs uppercase tracking-widest px-5 py-2.5 rounded shadow transition-all"
                  >
                    <span>Apply & Book</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
