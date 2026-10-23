'use client';

import React, { useState } from 'react';
import { RoomType } from '../lib/types';
import { formatPrice } from '../lib/utils';
import { Users, Maximize, BedDouble, Eye, Sparkles, Calendar, Filter, ArrowRight } from 'lucide-react';
import RoomModal from './RoomModal';

interface KamarCatalogProps {
  rooms: RoomType[];
  onSelectRoomForBooking: (room: RoomType) => void;
  checkIn: string;
  checkOut: string;
}

export default function KamarCatalog({
  rooms,
  onSelectRoomForBooking,
  checkIn,
  checkOut,
}: KamarCatalogProps) {
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestFilter, setTamuFilter] = useState<'all' | '2' | '3'>('all');

  const filteredKamar = rooms.filter((r) => {
    if (guestFilter === '2') return r.max_adults === 2;
    if (guestFilter === '3') return r.max_adults >= 3;
    return true;
  });

  const handleOpenModal = (room: RoomType) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  return (
    <section id="suites" className="py-24 bg-ivory-50 text-charcoal border-t border-bordercolor">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-gold-600 text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
              Pilihan Kamar
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-forest">
              Pilihan Kamar Hotel
            </h2>
          </div>

          {/* Tamu Filter Buttons */}
          <div className="mt-6 md:mt-0 flex items-center gap-2">
            <span className="text-xs text-mutedgray uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter Kapasitas:
            </span>
            <button
              onClick={() => setTamuFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
                guestFilter === 'all'
                  ? 'bg-forest text-ivory shadow-sm'
                  : 'bg-ivory text-charcoal border border-bordercolor hover:border-gold'
              }`}
            >
              Semua Kamar ({rooms.length})
            </button>
            <button
              onClick={() => setTamuFilter('2')}
              className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
                guestFilter === '2'
                  ? 'bg-forest text-ivory shadow-sm'
                  : 'bg-ivory text-charcoal border border-bordercolor hover:border-gold'
              }`}
            >
              2 Tamu
            </button>
            <button
              onClick={() => setTamuFilter('3')}
              className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
                guestFilter === '3'
                  ? 'bg-forest text-ivory shadow-sm'
                  : 'bg-ivory text-charcoal border border-bordercolor hover:border-gold'
              }`}
            >
              3+ Tamu
            </button>
          </div>
        </div>

        {/* Kamar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {filteredKamar.map((room) => {
            const primaryImage =
              room.images?.find((img) => img.is_primary)?.image_url ||
              room.images?.[0]?.image_url ||
              'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';

            return (
              <div
                key={room.id}
                className="group bg-ivory rounded-lg overflow-hidden border border-bordercolor shadow-luxury hover:shadow-luxury-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Image Container with Badges */}
                  <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-forest-950">
                    <img
                      src={primaryImage}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent opacity-80" />

                    {/* Bed Type Badge */}
                    <div className="absolute top-4 left-4 bg-forest-900/90 text-gold-300 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold border border-gold/30 backdrop-blur-sm">
                      {room.bed_type}
                    </div>

                    {/* Price Pill */}
                    <div className="absolute bottom-4 right-4 bg-ivory text-forest px-3.5 py-1.5 rounded shadow-lg border border-bordercolor text-right">
                      <span className="text-xs text-mutedgray block -mb-1">Mulai dari</span>
                      <span className="font-editorial text-lg font-bold text-forest">
                        {formatPrice(room.base_price_cents / 100, room.currency)}
                      </span>
                      <span className="text-[10px] text-mutedgray ml-1">/ malam</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-xs text-mutedgray mb-2">
                      <span className="flex items-center gap-1">
                        <Maximize className="w-3.5 h-3.5 text-gold" /> {room.size_sqm} m²
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gold" /> Maksimal {room.max_adults} Dewasa
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate">
                        <Eye className="w-3.5 h-3.5 text-gold" /> {room.view_type}
                      </span>
                    </div>

                    <h3 className="font-editorial text-2xl font-bold text-forest mb-2 group-hover:text-gold-600 transition-colors">
                      {room.name}
                    </h3>

                    <p className="text-xs text-mutedgray italic mb-3">{room.tagline}</p>
                    <p className="text-xs sm:text-sm text-charcoal/80 line-clamp-2 leading-relaxed mb-4">
                      {room.description}
                    </p>

                    {/* Top Amenities Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {room.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-ivory-200 text-forest-700 px-2.5 py-1 rounded-sm border border-bordercolor/60 font-medium"
                        >
                          {amenity}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[11px] bg-ivory-200/50 text-mutedgray px-2 py-1 rounded-sm">
                          +{room.amenities.length - 3} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="p-6 pt-0 border-t border-bordercolor/50 flex items-center gap-3 mt-auto">
                  <button
                    onClick={() => handleOpenModal(room)}
                    className="flex-1 text-center py-2.5 px-4 rounded border border-forest text-forest hover:bg-forest hover:text-ivory text-xs uppercase tracking-widest font-semibold transition-all"
                  >
                    Lihat Detail & Tarif
                  </button>
                  <button
                    onClick={() => onSelectRoomForBooking(room)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded bg-gold hover:bg-gold-600 text-charcoal font-semibold text-xs uppercase tracking-widest shadow transition-all"
                  >
                    <span>Reservasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessible Detail Modal */}
      <RoomModal
        room={selectedRoom}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectForBooking={onSelectRoomForBooking}
        checkIn={checkIn}
        checkOut={checkOut}
      />
    </section>
  );
}
