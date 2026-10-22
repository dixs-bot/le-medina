'use client';

import React from 'react';
import Image from 'next/image';
import { Compass, Sparkles, Feather, Clock } from 'lucide-react';

export default function About() {
  return (
    <section id="about" className="py-24 bg-ivory text-charcoal relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold-600 text-xs uppercase tracking-[0.25em] font-semibold block mb-3">
            Tentang Hotel
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-forest leading-tight mb-6">
            Kenyamanan Menginap dengan Pelayanan yang Ramah
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <p className="text-mutedgray text-base leading-relaxed">
            Dibangun dengan memadukan kehangatan budaya dan arsitektur berkelas, Hôtel Le Médina & Resto dirancang secara teliti oleh para pengrajin terampil guna menghadirkan suaka peristirahatan yang memadukan keindahan seni dan kenyamanan modern di Singkawang.
          </p>
        </div>

        {/* 2-Column Story Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Left: Imagery Composition */}
          <div className="relative">
            <div className="relative h-[480px] sm:h-[540px] rounded-lg overflow-hidden shadow-luxury-lg border border-bordercolor">
              <img
                src="https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80"
                alt="Halaman Beratap Lengkung Hôtel Le Médina"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-ivory">
                <span className="text-xs uppercase tracking-widest text-gold-300 font-semibold block mb-1">
                  Desain dan Kenyamanan
                </span>
                <p className="font-editorial text-xl italic font-normal">
                  “Gemericik air mancur yang menenangkan di pelataran kolam adalah denyut ketenangan di hotel kami.”
                </p>
              </div>
            </div>

            {/* Overlapping Small Card */}
            <div className="absolute -bottom-8 -right-4 sm:-right-8 bg-forest text-ivory p-6 rounded-lg shadow-2xl border border-gold/40 max-w-xs hidden sm:block">
              <div className="flex items-center gap-2 text-gold mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Detail yang Diperhatikan</span>
              </div>
              <p className="text-xs text-ivory-200 leading-relaxed">
                Ornamen ukiran bernilai seni tinggi, mosaik geometris yang menawan, serta kayu alami berpadu menciptakan suasana yang elegan dan tenang.
              </p>
            </div>
          </div>

          {/* Right: The Four Pillars of Le Medina */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-forest-50 border border-forest-100 flex items-center justify-center text-forest flex-shrink-0">
                <Compass className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h3 className="font-editorial text-xl font-bold text-forest mb-2">
                  Lokasi Bernuansa Bersejarah
                </h3>
                <p className="text-sm text-charcoal/80 leading-relaxed">
                  Terletak di kawasan yang nyaman dan tenang di Singkawang, hotel kami menawarkan akses mudah ke berbagai destinasi budaya sekaligus menjamin ketenangan privasi istirahat Anda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-forest-50 border border-forest-100 flex items-center justify-center text-forest flex-shrink-0">
                <Feather className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h3 className="font-editorial text-xl font-bold text-forest mb-2">
                  Keramahan Pelayanan Personal
                </h3>
                <p className="text-sm text-charcoal/80 leading-relaxed">
                  Dengan jumlah kamar dan suite yang eksklusif, staf kami siap memberikan perhatian penuh untuk setiap kebutuhan Anda—mulai dari sambutan hangat, layanan antar barang, hingga rekomendasi wisata lokal.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-forest-50 border border-forest-100 flex items-center justify-center text-forest flex-shrink-0">
                <Clock className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h3 className="font-editorial text-xl font-bold text-forest mb-2">
                  Ketenangan Jiwa & Raga
                </h3>
                <p className="text-sm text-charcoal/80 leading-relaxed">
                  Hirup kesegaran udara taman yang asri, nikmati alunan musik yang menyejukkan hati di kala senja, dan bersantailah di area kolam renang bernuansa alami.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
