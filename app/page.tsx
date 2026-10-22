import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import RoomsCatalog from '../components/RoomsCatalog';
import RestaurantSection from '../components/RestaurantSection';
import FacilitiesSection from '../components/FacilitiesSection';
import OffersSection from '../components/OffersSection';
import GallerySection from '../components/GallerySection';
import ReviewsSection from '../components/ReviewsSection';
import LocationSection from '../components/LocationSection';
import ContactBookingSection from '../components/ContactBookingSection';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import Footer from '../components/Footer';

import {
  getRoomTypes,
  getRestaurantCategories,
  getRestaurantMenu,
  getFacilities,
  getOffers,
  getGaleriImages,
  getTamuReviews,
  getSitePengaturan,
} from '../lib/data/store';
import PublicInteractiveWrapper from '../components/PublicInteractiveWrapper';

export const revalidate = 0; // Ensure fresh data on every request

export default async function HomePage() {
  const [
    roomTypes,
    restaurantCategories,
    restaurantMenu,
    facilities,
    offers,
    galleryImages,
    guestReviews,
    sitePengaturan,
  ] = await Promise.all([
    getRoomTypes(),
    getRestaurantCategories(),
    getRestaurantMenu(),
    getFacilities(),
    getOffers(),
    getGaleriImages(),
    getTamuReviews(),
    getSitePengaturan(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      <Navbar />

      <main className="flex-grow">
        <Hero />
        <About />

        {/* Public interactive coordinator for room selection & promo code syncing */}
        <PublicInteractiveWrapper
          roomTypes={roomTypes}
          categories={restaurantCategories}
          menuItems={restaurantMenu}
          facilities={facilities}
          offers={offers}
          galleryImages={galleryImages}
          reviews={guestReviews}
          whatsappNumber={sitePengaturan.whatsapp}
        />

        <LocationSection />
      </main>

      <Footer />
      <FloatingWhatsApp phoneNumber={sitePengaturan.whatsapp} />
    </div>
  );
}
