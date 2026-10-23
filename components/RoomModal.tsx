'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Users, Maximize, BedDouble, Eye, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { RoomAvailabilityDetail, RoomType } from '../lib/types';
import { formatPrice } from '../lib/utils';

interface RoomModalProps {
  room: RoomType | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectForBooking: (room: RoomType) => void;
  checkIn: string;
  checkOut: string;
}

export default function RoomModal({
  room,
  isOpen,
  onClose,
  onSelectForBooking,
  checkIn,
  checkOut,
}: RoomModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [roomAvailability, setRoomAvailability] = useState<RoomAvailabilityDetail[] | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !room) return;
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setRoomAvailability(null);
      setAvailabilityError('Pilih tanggal check-in dan check-out yang valid untuk melihat nomor kamar.');
      return;
    }

    const controller = new AbortController();
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    setRoomAvailability(null);
    fetch(`/api/availability?roomTypeId=${encodeURIComponent(room.id)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Ketersediaan kamar tidak dapat diperiksa.');
        return payload;
      })
      .then((payload) => {
        setRoomAvailability(Array.isArray(payload?.rooms) ? payload.rooms : []);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setAvailabilityError(error instanceof Error ? error.message : 'Ketersediaan kamar tidak dapat diperiksa.');
      })
      .finally(() => setAvailabilityLoading(false));

    return () => controller.abort();
  }, [isOpen, room?.id, checkIn, checkOut]);

  if (!isOpen || !room) return null;

  const images = room.images && room.images.length > 0 ? room.images : [];
  const availableRoomCount = (roomAvailability || []).filter((item) => item.is_available).length;
  const formatDateLabel = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const currentImage = images[activeImageIndex]?.image_url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto bg-forest-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-room-title"
    >
      {/* Backdrop overlay click */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Card Container */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-ivory rounded-xl shadow-2xl border border-bordercolor max-w-5xl w-full max-h-[92vh] overflow-y-auto no-scrollbar z-10 flex flex-col focus:outline-none"
      >
        {/* Sticky Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-forest-900/80 hover:bg-forest text-ivory transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-gold"
          aria-label="Tutup detail kamar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left Column: Image Showcase (7 Cols) */}
          <div className="lg:col-span-7 bg-forest-950 flex flex-col justify-between p-6 text-ivory">
            {/* Primary Main Image Frame */}
            <div className="relative h-72 sm:h-96 w-full rounded-lg overflow-hidden border border-gold/20 shadow-inner">
              <img
                src={currentImage}
                alt={room.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute top-3 left-3 bg-forest-900/90 text-gold-300 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold border border-gold/30">
                {room.bed_type}
              </div>
            </div>

            {/* Thumbnail Selectors */}
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activeImageIndex === idx
                        ? 'border-gold scale-105 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Suite Specifications Strip */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-forest-800 text-xs">
              <div className="flex items-center gap-2">
                <Maximize className="w-4 h-4 text-gold" />
                <span>{room.size_sqm} m² ({Math.round(room.size_sqm * 10.764)} sq ft)</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gold" />
                <span>Maksimal {room.max_adults} Dewasa</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gold" />
                <span className="truncate">{room.view_type}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Details, Rate Breakdown & Booking Action (5 Cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Category & Title */}
              <div className="flex items-center gap-2 text-gold-600 text-xs font-semibold uppercase tracking-widest mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Pilihan Kamar Hôtel Le Médina
              </div>
              <h3 id="modal-room-title" className="font-editorial text-2xl sm:text-3xl font-bold text-forest mb-2">
                {room.name}
              </h3>
              <p className="text-xs italic text-mutedgray mb-4">{room.tagline}</p>

              {/* Description */}
              <p className="text-xs sm:text-sm text-charcoal/85 leading-relaxed mb-5">
                {room.description}
              </p>

              {/* Room numbers and date-specific reservations */}
              <div className="mb-6 rounded-lg border border-bordercolor bg-white/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest">Nomor Kamar & Ketersediaan</h4>
                    <p className="text-[11px] text-mutedgray mt-1">Tanggal: {formatDateLabel(checkIn)} – {formatDateLabel(checkOut)}</p>
                  </div>
                  {!availabilityLoading && !availabilityError && roomAvailability && (
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${availableRoomCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {availableRoomCount} kamar tersedia
                    </span>
                  )}
                </div>

                {availabilityLoading ? (
                  <p className="text-xs text-mutedgray py-3">Sedang memeriksa jadwal setiap kamar...</p>
                ) : availabilityError ? (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3">{availabilityError}</p>
                ) : roomAvailability && roomAvailability.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {roomAvailability.map((item) => (
                      <div key={item.room_id} className={`rounded-md border p-2.5 ${item.is_available ? 'border-emerald-200 bg-emerald-50/70' : item.status === 'maintenance' || item.status === 'blocked' ? 'border-slate-200 bg-slate-100' : 'border-red-200 bg-red-50/80'}`}>
                        {!item.is_available && (item.status === 'reserved' || item.status === 'occupied') && (
                          <p className="text-[9px] leading-tight font-semibold text-red-700 mb-1.5">⚠ Kamar ini sudah dipesan orang.</p>
                        )}
                        <span className="text-[9px] uppercase tracking-wider text-mutedgray block">Nomor Kamar</span>
                        <strong className="text-lg leading-tight text-forest block">{item.room_number}</strong>
                        <span className={`text-[10px] font-semibold ${item.is_available ? 'text-emerald-700' : 'text-red-700'}`}>
                          {item.status === 'available' ? 'Tersedia' : item.status === 'reserved' ? 'Sudah dipesan' : item.status === 'occupied' ? 'Sedang ditempati' : item.status === 'maintenance' ? 'Pemeliharaan' : 'Ditutup'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : roomAvailability ? (
                  <p className="text-xs text-mutedgray py-2">Belum ada nomor kamar aktif untuk tipe ini. Silakan hubungi pihak hotel.</p>
                ) : null}

                {!availabilityLoading && !availabilityError && roomAvailability && availableRoomCount === 0 && roomAvailability.length > 0 && (
                  <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-900">Semua kamar {room.name} sudah dipesan atau tidak tersedia untuk tanggal ini.</p>
                    <p className="text-[11px] text-amber-800 mt-1">Silakan pilih tipe kamar lain di daftar kamar agar tidak terjadi bentrok reservasi.</p>
                    <button
                      type="button"
                      onClick={() => onClose()}
                      className="mt-2 text-[11px] font-bold underline text-amber-900"
                    >
                      Kembali ke pilihan tipe kamar
                    </button>
                  </div>
                )}
              </div>

              {/* Amenities Grid */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-forest mb-3 border-b border-bordercolor pb-1">
                  Fasilitas Kamar
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-charcoal/80">
                  {room.amenities.map((amenity, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-status-success flex-shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate Breakdown Box */}
              <div className="bg-ivory-200/60 p-4 rounded-lg border border-bordercolor mb-6">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-mutedgray uppercase tracking-wider">Tarif Dasar Per Malam</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-editorial text-forest">
                      {formatPrice(room.base_price_cents / 100, room.currency)}
                    </span>
                    <span className="text-xs text-mutedgray ml-1">/ malam</span>
                  </div>
                </div>
                <p className="text-[11px] text-mutedgray">
                  *Sudah termasuk sarapan pagi, akses Wi-Fi berkecepatan tinggi, dan layanan informasi hotel.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  onSelectForBooking(room);
                  onClose();
                }}
                disabled={availabilityLoading || Boolean(availabilityError) || availableRoomCount < 1}
                className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-900 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed text-ivory text-xs uppercase tracking-widest font-semibold py-3.5 px-6 rounded shadow-md hover:shadow-lg transition-all"
              >
                <Calendar className="w-4 h-4 text-gold" />
                <span>{availabilityLoading ? 'Memeriksa Kamar...' : availabilityError ? 'Ketersediaan Belum Terverifikasi' : availableRoomCount < 1 ? 'Tanggal Ini Penuh' : `Pesan ${room.name}`}</span>
                {!availabilityLoading && !availabilityError && availableRoomCount > 0 && <ArrowRight className="w-4 h-4 ml-1" />}
              </button>

              <button
                onClick={onClose}
                className="w-full text-center text-xs text-mutedgray hover:text-charcoal py-1 transition-colors"
              >
                Kembali ke daftar kamar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
