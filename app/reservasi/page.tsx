import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import FloatingWhatsApp from '../../components/FloatingWhatsApp';
import ReservationCheckoutPage from '../../components/ReservationCheckoutPage';
import { getRoomTypes, getSitePengaturan } from '../../lib/data/store';

export const revalidate = 0;

type SearchParams = {
  roomTypeId?: string;
  checkIn?: string;
  checkOut?: string;
  promoCode?: string;
};

export default async function ReservationPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const [roomTypes, sitePengaturan] = await Promise.all([
    getRoomTypes(),
    getSitePengaturan(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <Navbar />
      <main className="flex-grow">
        <ReservationCheckoutPage
          roomTypes={roomTypes}
          initialRoomTypeId={searchParams?.roomTypeId || ''}
          initialCheckIn={searchParams?.checkIn || ''}
          initialCheckOut={searchParams?.checkOut || ''}
          initialPromoCode={searchParams?.promoCode || ''}
          whatsappNumber={sitePengaturan.whatsapp}
        />
      </main>
      <Footer />
      <FloatingWhatsApp phoneNumber={sitePengaturan.whatsapp} />
    </div>
  );
}
