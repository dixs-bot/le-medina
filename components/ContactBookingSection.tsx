'use client';

import React, { useState, useEffect } from 'react';
import { RoomType, Reservation } from '../lib/types';
import { formatPrice } from '../lib/utils';
import {
  Calendar,
  Users,
  BedDouble,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface ContactBookingSectionProps {
  roomTypes: RoomType[];
  preselectedRoomId?: string;
  appliedPromoCode?: string;
  whatsappNumber: string;
}

export default function ContactBookingSection({
  roomTypes,
  preselectedRoomId,
  appliedPromoCode,
  whatsappNumber,
}: ContactBookingSectionProps) {
  // Booking Form State
  const todayStr = '2026-10-22';
  const tomorrowStr = '2026-10-24';

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(
    preselectedRoomId || roomTypes[0]?.id || ''
  );
  const [promoCode, setPromoCode] = useState(appliedPromoCode || '');

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Reservation | null>(null);

  // Sync external preselected room or promo code if changed
  useEffect(() => {
    if (preselectedRoomId) setSelectedRoomTypeId(preselectedRoomId);
  }, [preselectedRoomId]);

  useEffect(() => {
    if (appliedPromoCode) setPromoCode(appliedPromoCode);
  }, [appliedPromoCode]);

  // Pricing calculation preview
  const selectedRoom = roomTypes.find((r) => r.id === selectedRoomTypeId);
  const calcNights = () => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };
  const nights = calcNights();
  const baseRateCents = selectedRoom ? selectedRoom.base_price_cents : 42000;
  const rawSubtotalCents = baseRateCents * nights;
  const discountRate = promoCode.toUpperCase() === 'ATLASWINTER' ? 0.2 : promoCode.toUpperCase() === 'ROMANCE26' ? 0.15 : 0;
  const discountCents = Math.round(rawSubtotalCents * discountRate);
  const estimatedTotalCents = rawSubtotalCents - discountCents;

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (new Date(checkOut) <= new Date(checkIn)) {
      setErrorMsg('Check-out date must be strictly after check-in date.');
      return;
    }

    if (!guestName || !guestEmail || !guestPhone) {
      setErrorMsg('Please complete your full name, email, and contact phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children,
          room_type_id: selectedRoomTypeId,
          special_requests: specialRequests,
          promo_code: promoCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete reservation');
      }

      setCompletedBooking(data.reservation);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during booking creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanWhatsAppNumber = whatsappNumber.replace(/[^0-9]/g, '');

  return (
    <section id="booking" className="py-24 bg-ivory-50 text-charcoal border-t border-bordercolor relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold-600 text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
            Reservations & Concierge
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-forest leading-tight mb-4">
            Reserve Your Sanctuary in Marrakech
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <p className="text-mutedgray text-sm sm:text-base leading-relaxed">
            Direct web bookings receive complimentary bespoke Moroccan breakfast, VIP arrival mint tea ceremony, and preferred choice of courtyard or garden-facing chambers.
          </p>
        </div>

        {/* If booking confirmed, show elegant success screen */}
        {completedBooking ? (
          <div className="max-w-3xl mx-auto bg-ivory p-8 sm:p-12 rounded-2xl shadow-luxury-lg border border-gold/40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-forest text-gold flex items-center justify-center mx-auto mb-6 shadow-md">
              <CheckCircle2 className="w-10 h-10 text-status-success" />
            </div>

            <span className="text-xs uppercase tracking-widest text-gold-600 font-bold block mb-1">
              Reservation Confirmed & Pending Arrival
            </span>
            <h3 className="font-editorial text-3xl font-bold text-forest mb-4">
              Shukran, {completedBooking.guest_name}!
            </h3>

            <div className="bg-forest-950 text-ivory p-6 rounded-xl border border-gold/30 mb-8 max-w-md mx-auto">
              <span className="text-xs text-ivory-300 uppercase tracking-widest block mb-1">
                Your Confirmation Code
              </span>
              <span className="font-mono text-3xl font-bold text-gold tracking-widest block">
                {completedBooking.reservation_code}
              </span>
              <span className="text-[11px] text-ivory-300 mt-2 block">
                A confirmation has been dispatched to {completedBooking.guest_email}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-xs bg-ivory-100 p-4 rounded-lg border border-bordercolor mb-8">
              <div>
                <span className="text-mutedgray block">Check-in</span>
                <strong className="text-forest">{completedBooking.check_in}</strong>
              </div>
              <div>
                <span className="text-mutedgray block">Check-out</span>
                <strong className="text-forest">{completedBooking.check_out}</strong>
              </div>
              <div>
                <span className="text-mutedgray block">Suite Category</span>
                <strong className="text-forest truncate block">
                  {completedBooking.room_type?.name || 'Selected Suite'}
                </strong>
              </div>
              <div>
                <span className="text-mutedgray block">Total Amount</span>
                <strong className="text-gold-700 font-bold">
                  {formatPrice(completedBooking.total_amount_cents / 100, completedBooking.currency)}
                </strong>
              </div>
            </div>

            {/* Direct WhatsApp Handoff CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(
                  `Salam! I just confirmed booking ${completedBooking.reservation_code} for ${completedBooking.guest_name} from ${completedBooking.check_in} to ${completedBooking.check_out}. Could you assist with airport transfer details?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-status-success hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest px-8 py-4 rounded shadow-md transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Notify Concierge on WhatsApp</span>
              </a>

              <button
                onClick={() => setCompletedBooking(null)}
                className="w-full sm:w-auto text-xs text-forest hover:text-gold uppercase tracking-wider py-3 px-6 rounded border border-bordercolor"
              >
                Make Another Booking
              </button>
            </div>
          </div>
        ) : (
          /* Main 2-Column Booking Engine Form */
          <div className="max-w-5xl mx-auto bg-ivory rounded-2xl shadow-luxury-lg border border-bordercolor overflow-hidden">
            <form onSubmit={handleBookingSubmit} className="p-6 sm:p-10">
              {errorMsg && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-status-error/30 text-status-error text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: Stay Details */}
              <div className="mb-8">
                <h3 className="font-editorial text-xl font-bold text-forest mb-4 pb-2 border-b border-bordercolor flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold" />
                  <span>1. Stay Dates & Party Size</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Check-In Date
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Check-Out Date
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Adults (12+ yrs)
                    </label>
                    <select
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                    >
                      <option value={1}>1 Adult</option>
                      <option value={2}>2 Adults</option>
                      <option value={3}>3 Adults</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Children (0-11 yrs)
                    </label>
                    <select
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                    >
                      <option value={0}>0 Children</option>
                      <option value={1}>1 Child</option>
                      <option value={2}>2 Children</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Choose Suite */}
              <div className="mb-8">
                <h3 className="font-editorial text-xl font-bold text-forest mb-4 pb-2 border-b border-bordercolor flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-gold" />
                  <span>2. Select Suite or Residence</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roomTypes.map((room) => (
                    <label
                      key={room.id}
                      className={`relative flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedRoomTypeId === room.id
                          ? 'border-gold bg-gold-50/50 shadow-sm'
                          : 'border-bordercolor bg-ivory hover:border-gold/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="room_type"
                        value={room.id}
                        checked={selectedRoomTypeId === room.id}
                        onChange={() => setSelectedRoomTypeId(room.id)}
                        className="mt-1 text-gold focus:ring-gold"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <h4 className="font-editorial text-sm font-bold text-forest">
                            {room.name}
                          </h4>
                          <span className="font-bold text-xs text-gold-700">
                            {formatPrice(room.base_price_cents / 100, room.currency)}/nt
                          </span>
                        </div>
                        <p className="text-[11px] text-mutedgray mt-0.5 line-clamp-1">{room.tagline}</p>
                        <span className="text-[10px] text-forest font-medium mt-1 inline-block">
                          {room.size_sqm} m² • {room.bed_type}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 3: Guest Contact Information & Special Requests */}
              <div className="mb-8">
                <h3 className="font-editorial text-xl font-bold text-forest mb-4 pb-2 border-b border-bordercolor flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold" />
                  <span>3. Guest Contact & Special Requests</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Eleanor Vance"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. eleanor@travel.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Mobile / WhatsApp Phone *
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +44 7911 123456"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Special Requests (Airport Greeting, Dietary, Anniversary)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Please let us know your flight arrival number, dietary needs, or bedding preferences..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-charcoal mb-1.5">
                      Promo / Privilege Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. ROMANCE26"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded bg-ivory-50 border border-bordercolor text-xs uppercase font-mono focus:ring-2 focus:ring-gold focus:outline-none"
                      />
                      <Tag className="w-3.5 h-3.5 text-gold absolute left-2.5 top-3" />
                    </div>
                    {discountRate > 0 && (
                      <span className="text-[10px] text-status-success font-semibold mt-1 block">
                        ✓ {Math.round(discountRate * 100)}% privilege discount active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rate Summary and Submit Button */}
              <div className="bg-ivory-100 p-6 rounded-xl border border-bordercolor flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-mutedgray block">
                    Estimated Total for {nights} Night{nights > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-editorial text-3xl font-bold text-forest">
                      {formatPrice(estimatedTotalCents / 100, 'EUR')}
                    </span>
                    {discountCents > 0 && (
                      <span className="text-xs text-mutedgray line-through">
                        {formatPrice(rawSubtotalCents / 100, 'EUR')}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-mutedgray block mt-0.5">
                    *Taxes and gourmet breakfast included. Payment due upon arrival.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-forest hover:bg-forest-900 text-ivory text-xs uppercase tracking-widest font-semibold px-8 py-4 rounded shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Securing Suite...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-gold" />
                      <span>Confirm Direct Booking</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
