import React from 'react';
import {
  getAdminMetrics,
  getReservasi,
  getAllRoomTypesAdmin,
  getKamar,
  getAllRestaurantMenuAdmin,
  getRestaurantCategories,
  getSitePengaturan,
  getOffers,
} from '../../lib/data/store';
import AdminDashboardClient from './AdminDashboardClient';

export const revalidate = 0;

export default async function AdminPage() {
  const [
    metrics,
    reservations,
    roomTypes,
    rooms,
    menuItems,
    categories,
    sitePengaturan,
    offers,
  ] = await Promise.all([
    getAdminMetrics(),
    getReservasi(),
    getAllRoomTypesAdmin(),
    getKamar(),
    getAllRestaurantMenuAdmin(),
    getRestaurantCategories(),
    getSitePengaturan(),
    getOffers(),
  ]);

  return (
    <AdminDashboardClient
      initialMetrics={metrics}
      initialReservasi={reservations}
      roomTypes={roomTypes}
      rooms={rooms}
      initialMenuItems={menuItems}
      categories={categories}
      initialSitePengaturan={sitePengaturan}
      offers={offers}
    />
  );
}
