'use client';

import React, { useState } from 'react';
import { RestaurantCategory, RestaurantMenuItem } from '../lib/types';
import { formatPrice } from '../lib/utils';
import { Utensils, Sparkles, Leaf, Check, MessageSquare } from 'lucide-react';

interface RestaurantSectionProps {
  categories: RestaurantCategory[];
  menuItems: RestaurantMenuItem[];
  whatsappNumber: string;
}

export default function RestaurantSection({
  categories,
  menuItems,
  whatsappNumber,
}: RestaurantSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories[0]?.id || ''
  );

  const filteredItems = menuItems.filter(
    (item) => !selectedCategory || item.category_id === selectedCategory
  );

  const cleanWhatsAppNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const dinnerInquiryText = encodeURIComponent(
    'Halo! Saya ingin menanyakan ketersediaan dan reservasi meja di Restoran Le Medina untuk makan siang/malam.'
  );
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${dinnerInquiryText}`;

  return (
    <section id="dining" className="py-24 bg-forest-950 text-ivory relative overflow-hidden">
      {/* Subtle Indonesia background pattern */}
      <div className="absolute inset-0 bg-radial-gradient opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold-400 text-xs uppercase tracking-[0.25em] font-semibold block mb-3">
            Pilihan Hidangan
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-ivory leading-tight mb-4">
            Restoran Le Medina
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <p className="text-ivory-200/80 text-sm sm:text-base leading-relaxed">
            Menyajikan perpaduan hidangan istimewa kaya rempah dan bahan-bahan segar berkualitas pilihan, diolah dengan teknik memasak otentik untuk menghadirkan cita rasa yang tak terlupakan di Singkawang.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-14">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs uppercase tracking-widest px-5 py-2.5 rounded-full font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gold text-charcoal shadow-lg font-semibold'
                  : 'bg-forest-900/80 text-ivory-200 hover:text-gold border border-forest-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="mb-16 rounded-xl border border-forest-800 bg-forest-900/50 px-6 py-12 text-center">
            <Utensils className="mx-auto h-9 w-9 text-gold-400" />
            <h3 className="mt-4 font-editorial text-2xl font-bold text-ivory">Menu restoran segera hadir</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ivory-200/75">
              Tim manajemen sedang memperbarui daftar hidangan, harga, dan foto produk asli. Silakan hubungi restoran untuk informasi menu terbaru.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-forest-900/70 border border-forest-800/80 rounded-lg p-5 sm:p-6 flex gap-4 sm:gap-6 hover:border-gold/40 transition-all shadow-md group"
            >
              {/* Dish Photo Thumbnail */}
              {item.image_url && (
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden flex-shrink-0 bg-forest-950 border border-gold/20">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.is_signature && (
                    <div className="absolute top-1 left-1 bg-gold text-charcoal text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold">
                      Andalan
                    </div>
                  )}
                </div>
              )}

              {/* Dish Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-editorial text-lg sm:text-xl font-bold text-ivory group-hover:text-gold-300 transition-colors">
                      {item.name}
                    </h3>
                    <span className="font-editorial text-gold font-bold text-lg flex-shrink-0">
                      {formatPrice(item.price_cents / 100, item.currency)}
                    </span>
                  </div>

                  <p className="text-xs text-ivory-300/80 leading-relaxed mb-3">
                    {item.description}
                  </p>
                </div>

                {/* Dietary Badges */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {item.is_vegetarian && (
                    <span className="bg-forest-800 text-status-success px-2 py-0.5 rounded border border-status-success/30 flex items-center gap-1">
                      <Leaf className="w-2.5 h-2.5" /> Vegetarian
                    </span>
                  )}
                  {item.is_vegan && (
                    <span className="bg-forest-800 text-status-success px-2 py-0.5 rounded border border-status-success/30 flex items-center gap-1">
                      <Leaf className="w-2.5 h-2.5" /> Vegan
                    </span>
                  )}
                  {item.is_gluten_free && (
                    <span className="bg-forest-800 text-gold-300 px-2 py-0.5 rounded border border-gold/30">
                      Bebas Gluten
                    </span>
                  )}
                  {item.is_signature && (
                    <span className="bg-gold/20 text-gold-300 px-2 py-0.5 rounded border border-gold/40 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Spesial Chef
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* WhatsApp Reservation Box */}
        <div className="bg-gradient-to-r from-forest-900 to-forest-800 rounded-xl p-8 border border-gold/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
          <div>
            <div className="flex items-center gap-2 text-gold-400 text-xs font-semibold uppercase tracking-widest mb-1">
              <Utensils className="w-4 h-4" /> Terbuka untuk Umum & Tamu Menginap
            </div>
            <h4 className="font-editorial text-2xl font-bold text-ivory mb-2">
              Santap Malam Romantis & Jamuan Minum Teh
            </h4>
            <p className="text-xs sm:text-sm text-ivory-300 max-w-xl">
              Kapasitas meja terbatas demi menjaga kenyamanan dan suasana hangat bersantap. Silakan lakukan reservasi lebih awal melalui WhatsApp untuk perayaan khusus atau permintaan menu khusus.
            </p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2.5 bg-status-success hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest px-6 py-3.5 rounded shadow-lg hover:shadow-xl transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Reservasi Meja via WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
