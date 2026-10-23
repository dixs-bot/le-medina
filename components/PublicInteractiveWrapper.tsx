'use client';

import React, { useState } from 'react';
import {
  RoomType,
  RestaurantCategory,
  RestaurantMenuItem,
  Facility,
  Offer,
  GaleriImage,
  TamuReview,
} from '../lib/types';
import RoomsCatalog from './RoomsCatalog';
import RestaurantSection from './RestaurantSection';
import FacilitiesSection from './FacilitiesSection';
import OffersSection from './OffersSection';
import GallerySection from './GallerySection';
import ReviewsSection from './ReviewsSection';
import ContactBookingSection from './ContactBookingSection';

interface PublicInteractiveWrapperProps {
  roomTypes: RoomType[];
  categories: RestaurantCategory[];
  menuItems: RestaurantMenuItem[];
  facilities: Facility[];
  offers: Offer[];
  galleryImages: GaleriImage[];
  reviews: TamuReview[];
  whatsappNumber: string;
}

export default function PublicInteractiveWrapper({
  roomTypes,
  categories,
  menuItems,
  facilities,
  offers,
  galleryImages,
  reviews,
  whatsappNumber,
}: PublicInteractiveWrapperProps) {
  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const [checkIn, setCheckIn] = useState(formatDateInput(today));
  const [checkOut, setCheckOut] = useState(formatDateInput(tomorrow));

  const [preselectedRoomId, setPreselectedRoomId] = useState<string | undefined>(
    undefined
  );
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | undefined>(
    undefined
  );

  const handleSelectRoomForBooking = (room: RoomType) => {
    setPreselectedRoomId(room.id);
    const bookingElem = document.getElementById('booking');
    if (bookingElem) {
      bookingElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApplyPromoCode = (code: string) => {
    setAppliedPromoCode(code);
    const bookingElem = document.getElementById('booking');
    if (bookingElem) {
      bookingElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <RoomsCatalog
        rooms={roomTypes}
        onSelectRoomForBooking={handleSelectRoomForBooking}
        checkIn={checkIn}
        checkOut={checkOut}
      />

      <RestaurantSection
        categories={categories}
        menuItems={menuItems}
        whatsappNumber={whatsappNumber}
      />

      <FacilitiesSection facilities={facilities} />

      <OffersSection
        offers={offers}
        onApplyPromoCode={handleApplyPromoCode}
      />

      <GallerySection images={galleryImages} />

      <ReviewsSection reviews={reviews} />

      <ContactBookingSection
        roomTypes={roomTypes}
        checkIn={checkIn}
        checkOut={checkOut}
        onCheckInChange={setCheckIn}
        onCheckOutChange={setCheckOut}
        preselectedRoomId={preselectedRoomId}
        appliedPromoCode={appliedPromoCode}
        whatsappNumber={whatsappNumber}
      />
    </>
  );
}
