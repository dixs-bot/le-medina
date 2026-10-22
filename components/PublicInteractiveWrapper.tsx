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
import KamarCatalog from './KamarCatalog';
import RestaurantSection from './RestaurantSection';
import FacilitiesSection from './FacilitiesSection';
import OffersSection from './OffersSection';
import GaleriSection from './GaleriSection';
import ReviewsSection from './ReviewsSection';
import KontakBookingSection from './KontakBookingSection';

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
      <KamarCatalog
        rooms={roomTypes}
        onSelectRoomForBooking={handleSelectRoomForBooking}
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

      <GaleriSection images={galleryImages} />

      <ReviewsSection reviews={reviews} />

      <KontakBookingSection
        roomTypes={roomTypes}
        preselectedRoomId={preselectedRoomId}
        appliedPromoCode={appliedPromoCode}
        whatsappNumber={whatsappNumber}
      />
    </>
  );
}
