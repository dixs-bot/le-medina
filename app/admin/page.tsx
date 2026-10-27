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
      .from('profiles').select('id,full_name,email,avatar_url,is_active').eq('auth_user_id', user.id).maybeSingle();
    if (profileError || !profile || profile.is_active === false) {
      user = null;
    } else {
      const { data: assignedRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles').select('role').eq('user_id', profile.id);
      const rolePriority: AdminUser['role'][] = ['super_admin', 'receptionist_staff', 'restaurant_cashier', 'waterpark_cashier', 'admin', 'reservation_staff', 'content_editor'];
      const liveRole = !rolesError ? rolePriority.find((role) => (assignedRoles || []).some((item) => item.role === role)) : null;
      if (!liveRole) {
        user = null;
      } else {
        user = { ...user, role: liveRole, name: profile.full_name || user.name, email: profile.email || user.email, avatarUrl: profile.avatar_url || undefined };
      }
    }
  } else if (user && process.env.NODE_ENV === 'production' && /^[0-9a-f-]{36}$/i.test(user.id)) {
    user = null;
  }

  // If unauthenticated, show server-guarded login screen
  if (!user) {
    return <AdminLoginView />;
  }

  const isSuperAdmin = user.role === 'super_admin';
  const canLoadReception = isSuperAdmin || ['receptionist_staff', 'reservation_staff', 'admin'].includes(user.role);
  const canLoadRestaurant = isSuperAdmin || ['restaurant_cashier', 'content_editor'].includes(user.role);

  const [metrics, reservations, roomTypes, rooms, menuItems, categories, sitePengaturan, offers] = await Promise.all([
    canLoadReception ? getAdminMetrics() : Promise.resolve({ totalReservasi: 0, pendingReservasi: 0, confirmedReservasi: 0, occupancyRatePercentage: 0, totalRevenueCents: 0, activeOffersCount: 0, totalKamarInventory: 0 }),
    canLoadReception ? getReservasi() : Promise.resolve([]),
    canLoadReception ? getAllRoomTypesAdmin() : Promise.resolve([]),
    canLoadReception ? getKamar() : Promise.resolve([]),
    canLoadRestaurant ? getAllRestaurantMenuAdmin() : Promise.resolve([]),
    canLoadRestaurant ? getRestaurantCategories() : Promise.resolve([]),
    isSuperAdmin ? getSitePengaturan() : getSitePengaturan(),
    canLoadReception ? getOffers() : Promise.resolve([]),
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
