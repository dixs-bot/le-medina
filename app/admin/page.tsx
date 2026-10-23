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
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../lib/supabaseClient';
import type { AdminUser } from '../../lib/auth';

export const revalidate = 0;

export default async function AdminPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  let user: AdminUser | null = sessionToken ? verifySessionToken(sessionToken) : null;

  // Resolve the live profile before rendering the admin panel. Disabled accounts cannot keep using an old cookie.
  if (user && isSupabaseAdminConfigured && supabaseAdmin && /^[0-9a-f-]{36}$/i.test(user.id)) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles').select('full_name,email,avatar_url,is_active').eq('auth_user_id', user.id).maybeSingle();
    if (profileError || !profile || profile.is_active === false) {
      user = null;
    } else {
      user = { ...user, name: profile.full_name || user.name, email: profile.email || user.email, avatarUrl: profile.avatar_url || undefined };
    }
  } else if (user && process.env.NODE_ENV === 'production' && /^[0-9a-f-]{36}$/i.test(user.id)) {
    user = null;
  }

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
