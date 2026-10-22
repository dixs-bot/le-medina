'use client';

import React from 'react';
import { MapPin, Navigation, Car, Compass, Clock, ExternalLink } from 'lucide-react';

export default function LokasiSection() {
  const landmarks = [
    { name: 'Pusat Kota Singkawang', distance: 'Informasi jarak perlu dikonfirmasi', time: 'Hubungi hotel' },
    { name: 'Tempat wisata sekitar', distance: 'Informasi jarak perlu dikonfirmasi', time: 'Hubungi hotel' },
    { name: 'Akses transportasi', distance: 'Informasi jarak perlu dikonfirmasi', time: 'Hubungi hotel' },
  ];

  return (
    <section id="location" className="py-24 bg-ivory text-charcoal relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold-600 text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
            Informasi Lokasi
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-forest leading-tight mb-4">
            Temukan Lokasi Hotel Kami
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <p className="text-mutedgray text-sm sm:text-base leading-relaxed">
            Berlokasi di Singkawang, Kalimantan Barat. Silakan hubungi pihak hotel untuk petunjuk arah dan informasi akses terbaru.
          </p>
        </div>

        {/* 2-Column Lokasi & Map Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Address, Kedatangan Guide & Distances (5 Cols) */}
          <div className="lg:col-span-5 bg-forest text-ivory p-8 sm:p-10 rounded-xl shadow-luxury-lg border border-gold/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-gold-400 text-xs font-semibold uppercase tracking-widest mb-3">
                <MapPin className="w-4 h-4" /> Alamat
              </div>
              <h3 className="font-editorial text-2xl font-bold text-ivory mb-2">
                Hôtel Le Médina & Resto
              </h3>
              <p className="text-sm text-ivory-200/90 leading-relaxed mb-6 font-light">
                <br />
                Singkawang, Kalimantan Barat, Indonesia
              </p>

              {/* Coordinates */}
              <div className="bg-forest-900/90 p-3.5 rounded border border-forest-800 text-xs text-gold-300 font-mono mb-8 flex items-center justify-between">
                <span>Kalimantan Barat, Indonesia</span>
                <span className="text-[10px] text-ivory-400 uppercase tracking-wider">Singkawang</span>
              </div>

              {/* Proximity Distances */}
              <h4 className="text-xs uppercase tracking-widest text-gold-400 font-semibold mb-4 border-b border-forest-800 pb-2">
                Tempat di Sekitar
              </h4>
              <div className="space-y-3 text-xs mb-8">
                {landmarks.map((l, i) => (
                  <div key={i} className="flex justify-between items-center text-ivory-200">
                    <span className="font-medium text-ivory">{l.name}</span>
                    <span className="text-gold-300 font-mono">{l.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Airport Transfer Note */}
            <div className="pt-4 border-t border-forest-800 text-xs text-ivory-300">
              <div className="flex items-center gap-2 text-gold font-semibold mb-1">
                <Car className="w-4 h-4" /> Private Chauffeur Greeting
              </div>
              <p className="text-[11px] leading-relaxed">
                We provide Mercedes chauffeur airport pickups with a dedicated riad porter greeting you at the nearest gate to escort your luggage seamlessly.
              </p>
            </div>
          </div>

          {/* Right: Interactive Styled Map View (7 Cols) */}
          <div className="lg:col-span-7 bg-ivory-100 rounded-xl overflow-hidden border border-bordercolor shadow-luxury flex flex-col justify-between min-h-[420px] relative">
            {/* Visual Medina Map Canvas */}
            <div className="relative flex-1 w-full min-h-[340px] bg-forest-950 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=1400&q=80"
                alt="Singkawang Medina Map Landscape"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/40 to-transparent" />

              {/* Map Marker Pin Card */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-ivory p-5 rounded-lg shadow-2xl border-2 border-gold text-charcoal text-center max-w-xs animate-bounce-subtle">
                <div className="w-8 h-8 rounded-full bg-forest text-gold flex items-center justify-center mx-auto mb-2 shadow">
                  <MapPin className="w-4 h-4" />
                </div>
                <h4 className="font-editorial text-sm font-bold text-forest">Hôtel Le Médina</h4>
                <p className="text-[11px] text-mutedgray mt-0.5">Derb Sidi Bouloukate, Singkawang</p>
                <span className="inline-block mt-2 text-[10px] bg-forest-50 text-status-success font-semibold px-2 py-0.5 rounded border border-forest-100">
                  Pedestrian Sanctuary
                </span>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 sm:p-5 bg-ivory flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-bordercolor">
              <span className="text-xs text-mutedgray">
                Need directions on arrival? Our concierge is available 24/7 on WhatsApp.
              </span>
              <a
                href="https://maps.google.com/?q=Singkawang+Medina"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-forest hover:bg-forest-900 text-ivory text-xs uppercase tracking-widest px-4 py-2.5 rounded font-medium transition-all shadow-sm"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-gold" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
