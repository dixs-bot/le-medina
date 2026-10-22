import React from 'react';
import { cookies } from 'next/headers';
import { verifySessionToken } from '../../lib/auth';
import AdminLoginView from '../../components/AdminLoginView';
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
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  const user = sessionToken ? verifySessionToken(sessionToken) : null;

  // If unauthenticated, show server-guarded login screen
  if (!user) {
    return <AdminLoginView />;
  }

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
      currentUser={user}
    />
  );
}
