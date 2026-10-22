'use client';

import React from 'react';
import { Facility } from '../lib/types';
import { Sparkles, Waves, Moon, Utensils, Clock, CheckCircle } from 'lucide-react';

interface FacilitiesSectionProps {
  facilities: Facility[];
}

export default function FacilitiesSection({ facilities }: FacilitiesSectionProps) {
  const getIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-gold" />;
      case 'waves':
        return <Waves className="w-5 h-5 text-gold" />;
      case 'moon':
        return <Moon className="w-5 h-5 text-gold" />;
      case 'utensils':
        return <Utensils className="w-5 h-5 text-gold" />;
      default:
        return <Sparkles className="w-5 h-5 text-gold" />;
    }
  };

  return (
    <section id="facilities" className="py-24 bg-ivory text-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold-600 text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
            Kenyamanan dan Layanan
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-forest leading-tight mb-4">
            Fasilitas dan Layanan Hotel
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <p className="text-mutedgray text-sm sm:text-base leading-relaxed">
            Every corner of Le Médina has been curated as a sanctuary for the senses, from ancient steam purification to heated plunge pools and panoramic rooftop stargazing.
          </p>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {facilities.map((fac) => (
            <div
              key={fac.id}
              className="bg-ivory-50 rounded-lg overflow-hidden border border-bordercolor shadow-luxury flex flex-col sm:flex-row group hover:shadow-luxury-lg transition-all"
            >
              {/* Image Frame */}
              {fac.image_url && (
                <div className="sm:w-5/12 h-60 sm:h-auto relative overflow-hidden bg-forest-950 flex-shrink-0">
                  <img
                    src={fac.image_url}
                    alt={fac.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-forest-950/20" />
                </div>
              )}

              {/* Text Body */}
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded bg-forest-50 border border-forest-100">
                        {getIcon(fac.icon_name)}
                      </div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-gold-600">
                        Fasilitas Unggulan
                      </span>
                    </div>

                    <span className="text-[11px] text-mutedgray flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gold" /> {fac.opening_hours}
                    </span>
                  </div>

                  <h3 className="font-editorial text-xl font-bold text-forest mb-1">
                    {fac.name}
                  </h3>

                  <p className="text-xs text-mutedgray italic mb-3">{fac.tagline}</p>
                  <p className="text-xs sm:text-sm text-charcoal/80 leading-relaxed mb-4">
                    {fac.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-bordercolor/60 flex items-center gap-2 text-xs text-forest font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-status-success" />
                  <span>Complimentary for Resident Tamus</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
