import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import FloatingWhatsApp from '../../components/FloatingWhatsApp';
import RestaurantOrdering from '../../components/RestaurantOrdering';
import { getRestaurantMenu, getSitePengaturan } from '../../lib/data/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Pesan Makanan Online | Hôtel Le Médina & Resto',
  description: 'Pesan hidangan Restoran Le Médina dan pantau status pesanan secara online.',
};

export default async function PesanMakananPage() {
  const [menuItems, settings] = await Promise.all([getRestaurantMenu(), getSitePengaturan()]);
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <Navbar />
      <main className="flex-1 bg-forest-950 py-10 text-ivory sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold">Layanan Restoran</p>
            <h1 className="font-editorial text-3xl font-bold sm:text-5xl">Pesan Makanan Online</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-ivory-200/75">Pilih menu favorit, kirim pesanan, lalu pantau perkembangannya menggunakan kode pesanan.</p>
          </div>
          <RestaurantOrdering menuItems={menuItems} />
        </div>
      </main>
      <Footer />
      <FloatingWhatsApp phoneNumber={settings.whatsapp} />
    </div>
  );
}
