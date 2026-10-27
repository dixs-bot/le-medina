'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import { RoomType } from '../lib/types';
import ContactBookingSection from './ContactBookingSection';

interface ReservationCheckoutPageProps {
  roomTypes: RoomType[];
  initialRoomTypeId: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialPromoCode: string;
  whatsappNumber: string;
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ReservationCheckoutPage({
  roomTypes,
  initialRoomTypeId,
  initialCheckIn,
  initialCheckOut,
  initialPromoCode,
  whatsappNumber,
}: ReservationCheckoutPageProps) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [checkIn, setCheckIn] = useState(
    initialCheckIn || localDateString(today)
  );
  const [checkOut, setCheckOut] = useState(
    initialCheckOut || localDateString(tomorrow)
  );

  const validInitialRoom = roomTypes.some((room) => room.id === initialRoomTypeId);
  const [preselectedRoomId] = useState(
    validInitialRoom ? initialRoomTypeId : undefined
  );
  const [appliedPromoCode] = useState(initialPromoCode);

  return (
    <div className="bg-ivory-50 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 max-w-5xl">
          <Link
            href="/#suites"
            className="inline-flex items-center gap-2 rounded-lg border border-bordercolor bg-ivory px-4 py-2 text-xs font-semibold text-forest transition hover:border-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke pilihan kamar
          </Link>
          <div className="mt-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
            <CalendarCheck className="h-4 w-4" />
            Checkout Reservasi Kamar
          </div>
        </div>

        {roomTypes.length === 0 ? (
          <div className="mx-auto max-w-5xl rounded-xl border border-bordercolor bg-white p-8 text-center text-sm text-mutedgray">
            Tipe kamar belum tersedia. Silakan kembali beberapa saat lagi atau hubungi hotel.
          </div>
        ) : (
          <ContactBookingSection
            roomTypes={roomTypes}
            checkIn={checkIn}
            checkOut={checkOut}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            preselectedRoomId={preselectedRoomId}
            appliedPromoCode={appliedPromoCode || undefined}
            whatsappNumber={whatsappNumber}
          />
        )}
      </div>
    </div>
  );
}
