import React from 'react';
import {
  getAdminMetrics,
  getReservations,
  getAllRoomTypesAdmin,
  getRooms,
  getAllRestaurantMenuAdmin,
  getRestaurantCategories,
  getSiteSettings,
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
    siteSettings,
    offers,
  ] = await Promise.all([
    getAdminMetrics(),
    getReservations(),
    getAllRoomTypesAdmin(),
    getRooms(),
    getAllRestaurantMenuAdmin(),
    getRestaurantCategories(),
    getSiteSettings(),
    getOffers(),
  ]);

  return (
    <AdminDashboardClient
      initialMetrics={metrics}
      initialReservations={reservations}
      roomTypes={roomTypes}
      rooms={rooms}
      initialMenuItems={menuItems}
      categories={categories}
      initialSiteSettings={siteSettings}
      offers={offers}
    />
  );
}
