import crypto from 'crypto';
import {
  RoomType,
  Room,
  RoomRate,
  Reservation,
  ReservationStatus,
  RestaurantCategory,
  RestaurantMenuItem,
  Facility,
  Offer,
  GaleriImage,
  TamuReview,
  SitePengaturan,
} from '../types';
import {
  initialSitePengaturan,
  initialRoomTypes,
  initialKamar,
  initialRoomTarif,
  initialReservasi,
  initialRestaurantCategories,
  initialMenuItems,
  initialFacilities,
  initialOffers,
  initialGaleriImages,
  initialTamuReviews,
} from './seed';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

// Persistent in-memory global state across Route Handlers in serverless/Node process
interface GlobalState {
  sitePengaturan: SitePengaturan;
  roomTypes: RoomType[];
  rooms: Room[];
  roomTarif: RoomRate[];
  reservations: Reservation[];
  restaurantCategories: RestaurantCategory[];
  menuItems: RestaurantMenuItem[];
  facilities: Facility[];
  offers: Offer[];
  galleryImages: GaleriImage[];
  guestReviews: TamuReview[];
}

const globalForStore = globalThis as unknown as {
  hotelStore?: GlobalState;
  reservationMutex?: Promise<unknown>;
};

if (!globalForStore.hotelStore) {
  globalForStore.hotelStore = {
    sitePengaturan: { ...initialSitePengaturan },
    roomTypes: JSON.parse(JSON.stringify(initialRoomTypes)),
    rooms: JSON.parse(JSON.stringify(initialKamar)),
    roomTarif: JSON.parse(JSON.stringify(initialRoomTarif)),
    reservations: JSON.parse(JSON.stringify(initialReservasi)),
    restaurantCategories: JSON.parse(JSON.stringify(initialRestaurantCategories)),
    menuItems: JSON.parse(JSON.stringify(initialMenuItems)),
    facilities: JSON.parse(JSON.stringify(initialFacilities)),
    offers: JSON.parse(JSON.stringify(initialOffers)),
    galleryImages: JSON.parse(JSON.stringify(initialGaleriImages)),
    guestReviews: JSON.parse(JSON.stringify(initialTamuReviews)),
  };
}

const store = globalForStore.hotelStore;

// Concurrency mutex lock to prevent race conditions during booking
if (!globalForStore.reservationMutex) {
  globalForStore.reservationMutex = Promise.resolve();
}

function withReservationLock<T>(fn: () => Promise<T>): Promise<T> {
  const current = globalForStore.reservationMutex!;
  const next = current.then(fn, fn);
  globalForStore.reservationMutex = next.then(
    () => {},
    () => {}
  );
  return next;
}

// Date helpers
export function parseDate(dStr: string): Date {
  return new Date(dStr + 'T00:00:00Z');
}

export function formatISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function getDatesBetween(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  while (curr < end) {
    dates.push(formatISODate(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

// 1. Site Pengaturan
export async function getSitePengaturan(): Promise<SitePengaturan> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          name: data.name || store.sitePengaturan.name,
          tagline: data.tagline || store.sitePengaturan.tagline,
          stars: data.stars || store.sitePengaturan.stars,
          address: data.address || store.sitePengaturan.address,
          phone: data.phone || store.sitePengaturan.phone,
          whatsapp: data.whatsapp || store.sitePengaturan.whatsapp,
          email: data.email || store.sitePengaturan.email,
          check_in_time: data.check_in_time || store.sitePengaturan.check_in_time,
          check_out_time: data.check_out_time || store.sitePengaturan.check_out_time,
          currency: data.currency || store.sitePengaturan.currency,
        };
      }
    } catch {
      // Fallback to store
    }
  }
  return store.sitePengaturan;
}

export async function updateSitePengaturan(partial: Partial<SitePengaturan>): Promise<SitePengaturan> {
  store.sitePengaturan = { ...store.sitePengaturan, ...partial };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('site_settings')
        .update({
          ...partial,
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('Failed to sync site_settings update to Supabase', err);
    }
  }

  return store.sitePengaturan;
}

// 2. Room Types & Physical Rooms
export async function getRoomTypes(): Promise<RoomType[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*, room_images(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          tagline: item.tagline || '',
          description: item.description || '',
          base_price_cents: item.base_price_cents,
          currency: item.currency || 'IDR',
          max_adults: item.max_adults,
          max_children: item.max_children,
          size_sqm: item.size_sqm,
          bed_type: item.bed_type,
          view_type: item.view_type,
          amenities: Array.isArray(item.amenities) ? item.amenities : [],
          is_active: item.is_active,
          sort_order: item.sort_order,
          images: Array.isArray(item.room_images) ? item.room_images : [],
        }));
      }
    } catch {
      // Fallback
    }
  }
  return store.roomTypes.filter((rt) => rt.is_active);
}

export async function getAllRoomTypesAdmin(): Promise<RoomType[]> {
  return store.roomTypes;
}

export async function getRoomTypeBySlug(slug: string): Promise<RoomType | null> {
  const rt = store.roomTypes.find((r) => r.slug === slug);
  return rt || null;
}

export async function getRoomTypeById(id: string): Promise<RoomType | null> {
  const rt = store.roomTypes.find((r) => r.id === id);
  return rt || null;
}

export async function getKamar(): Promise<Room[]> {
  return store.rooms;
}

// 3. Dynamic Pricing Engine (Strict Server-Side Price Calculation)
export interface NightRateDetail {
  date: string;
  priceCents: number;
  rateName: string;
}

export interface PricingResult {
  nightsCount: number;
  rates: NightRateDetail[];
  totalPriceCents: number;
  basePriceCents: number;
  discountCents: number;
  discountPercentage?: number;
  currency: string;
}

export async function calculateStayPricing(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  promoCode?: string
): Promise<PricingResult> {
  const roomType = await getRoomTypeById(roomTypeId);
  if (!roomType) {
    throw new Error(`Tipe kamar dengan ID '${roomTypeId}' tidak ditemukan.`);
  }

  const nights = getDatesBetween(checkIn, checkOut);
  if (nights.length === 0) {
    throw new Error('Tanggal check-out harus setelah tanggal check-in.');
  }

  const rates: NightRateDetail[] = nights.map((nightDate) => {
    // Check if custom seasonal rate applies
    const customRate = store.roomTarif.find(
      (r) =>
        r.room_type_id === roomTypeId &&
        r.is_active &&
        nightDate >= r.start_date &&
        nightDate <= r.end_date
    );

    if (customRate) {
      return {
        date: nightDate,
        priceCents: customRate.price_cents,
        rateName: customRate.rate_name,
      };
    }

    return {
      date: nightDate,
      priceCents: roomType.base_price_cents,
      rateName: 'Tarif Dasar Standar',
    };
  });

  const rawTotalCents = rates.reduce((sum, item) => sum + item.priceCents, 0);

  // Apply promo code if valid
  let discountCents = 0;
  let discountPercentage = 0;

  if (promoCode) {
    const cleanPromo = promoCode.trim().toUpperCase();
    const promo = store.offers.find(
      (o) =>
        o.is_active &&
        o.code &&
        o.code.toUpperCase() === cleanPromo &&
        checkIn >= o.valid_from &&
        checkIn <= o.valid_to
    );

    if (promo && promo.discount_percentage) {
      discountPercentage = promo.discount_percentage;
      discountCents = Math.round((rawTotalCents * promo.discount_percentage) / 100);
    }
  }

  const totalPriceCents = Math.max(0, rawTotalCents - discountCents);

  return {
    nightsCount: nights.length,
    rates,
    basePriceCents: roomType.base_price_cents,
    totalPriceCents,
    discountCents,
    discountPercentage: discountPercentage || undefined,
    currency: roomType.currency || 'IDR',
  };
}

// 4. Server-Side Availability Check with [check_in, check_out) Interval Logic
export async function checkRoomAvailability(
  roomTypeId: string,
  checkIn: string,
  checkOut: string
): Promise<{ isTersedia: boolean; availableKamarCount: number; assignedRoomId?: string }> {
  const reqNights = getDatesBetween(checkIn, checkOut);
  if (reqNights.length === 0) {
    return { isTersedia: false, availableKamarCount: 0 };
  }

  // Get physical rooms for this room type
  const physicalKamar = store.rooms.filter(
    (r) => r.room_type_id === roomTypeId && r.status === 'available'
  );

  // Active reservations that could overlap
  const activeReservasi = store.reservations.filter(
    (res) =>
      res.status === 'confirmed' ||
      res.status === 'pending' ||
      res.status === 'checked_in'
  );

  const availableKamar = physicalKamar.filter((physRoom) => {
    // Check if this room is booked on ANY of the requested nights
    const hasConflict = activeReservasi.some((res) => {
      if (res.assigned_room_number !== physRoom.room_number) return false;
      // Interval overlap check: [res.check_in, res.check_out) overlaps with [checkIn, checkOut)
      return !(res.check_out <= checkIn || res.check_in >= checkOut);
    });

    return !hasConflict;
  });

  return {
    isTersedia: availableKamar.length > 0,
    availableKamarCount: availableKamar.length,
    assignedRoomId: availableKamar[0]?.id,
  };
}

// 5. Atomic Reservation Creation with Concurrency Lock & Crypto Random Code
export interface CreateReservationInput {
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  room_type_id: string;
  special_requests?: string;
  promo_code?: string;
}

export async function createAtomicReservation(
  input: CreateReservationInput
): Promise<Reservation> {
  return withReservationLock(async () => {
    const {
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults,
      children,
      room_type_id,
      special_requests,
      promo_code,
    } = input;

    const roomType = await getRoomTypeById(room_type_id);
    if (!roomType) {
      throw new Error('Tipe kamar yang dipilih tidak ditemukan.');
    }

    // 1. Verify availability under mutex lock
    const availability = await checkRoomAvailability(room_type_id, check_in, check_out);
    if (!availability.isTersedia) {
      throw new Error(
        'Mohon maaf, tidak ada kamar yang tersedia pada kategori ini untuk tanggal yang dipilih. Silakan pilih tanggal lain atau tipe kamar berbeda.'
      );
    }

    // 2. Find assigned room
    const physicalKamar = store.rooms.filter(
      (r) => r.room_type_id === room_type_id && r.status === 'available'
    );
    const activeReservasi = store.reservations.filter(
      (res) => res.status === 'confirmed' || res.status === 'pending' || res.status === 'checked_in'
    );

    const assignedRoom = physicalKamar.find((physRoom) => {
      const hasConflict = activeReservasi.some((res) => {
        if (res.assigned_room_number !== physRoom.room_number) return false;
        return !(res.check_out <= check_in || res.check_in >= check_out);
      });
      return !hasConflict;
    });

    // 3. Dynamic pricing computation (Server-side calculation)
    const pricing = await calculateStayPricing(room_type_id, check_in, check_out, promo_code);

    // 4. Generate cryptographically secure reservation code: MED-XXXXXXXX (8 hex chars)
    const secureRandomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const reservation_code = `MED-${secureRandomHex}`;

    const newReservation: Reservation = {
      id: `res-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      reservation_code,
      guest_name,
      guest_email,
      guest_phone,
      special_requests,
      check_in,
      check_out,
      adults,
      children,
      status: 'pending',
      total_amount_cents: pricing.totalPriceCents,
      currency: pricing.currency,
      source: 'direct_web',
      whatsapp_notified: false,
      created_at: new Date().toISOString(),
      assigned_room_number: assignedRoom ? assignedRoom.room_number : 'Assigned Upon Check-in',
      room_type: roomType,
      internal_notes: promo_code ? `Dipesan dengan kode promo: ${promo_code}` : undefined,
    };

    // Prepend atomically to reservations
    store.reservations.unshift(newReservation);

    // Sync to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('reservations').insert({
          reservation_code: newReservation.reservation_code,
          guest_name: newReservation.guest_name,
          guest_email: newReservation.guest_email,
          guest_phone: newReservation.guest_phone,
          check_in: newReservation.check_in,
          check_out: newReservation.check_out,
          adults: newReservation.adults,
          children: newReservation.children,
          status: newReservation.status,
          total_amount_cents: newReservation.total_amount_cents,
          currency: newReservation.currency,
          source: newReservation.source,
          special_requests: newReservation.special_requests,
          internal_notes: newReservation.internal_notes,
          assigned_room_number: newReservation.assigned_room_number,
          created_at: newReservation.created_at,
        });
      } catch (err) {
        console.warn('Failed to insert reservation into Supabase', err);
      }
    }

    return newReservation;
  });
}

// 6. Reservation Management
export async function getReservasi(filter?: {
  status?: ReservationStatus;
  search?: string;
}): Promise<Reservation[]> {
  let list = [...store.reservations];

  if (filter?.status) {
    list = list.filter((r) => r.status === filter.status);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.reservation_code.toLowerCase().includes(q) ||
        r.guest_name.toLowerCase().includes(q) ||
        r.guest_email.toLowerCase().includes(q)
    );
  }

  return list;
}

export async function getReservationByCode(code: string): Promise<Reservation | null> {
  const cleanCode = code.trim().toUpperCase();
  const res = store.reservations.find(
    (r) => r.reservation_code.toUpperCase() === cleanCode
  );
  return res || null;
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
  internalNotes?: string
): Promise<Reservation> {
  const index = store.reservations.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error(`Reservasi dengan ID ${id} tidak ditemukan.`);
  }

  store.reservations[index] = {
    ...store.reservations[index],
    status,
    internal_notes: internalNotes !== undefined ? internalNotes : store.reservations[index].internal_notes,
  };

  const updatedRecord = store.reservations[index];

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('reservations')
        .update({
          status,
          internal_notes: updatedRecord.internal_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('reservation_code', updatedRecord.reservation_code);
    } catch (err) {
      console.warn('Failed to sync status update to Supabase', err);
    }
  }

  return updatedRecord;
}

// 7. Restaurant & Menu
export async function getRestaurantCategories(): Promise<RestaurantCategory[]> {
  return store.restaurantCategories.filter((c) => c.is_active);
}

export async function getRestaurantMenu(): Promise<RestaurantMenuItem[]> {
  return store.menuItems.filter((item) => item.is_available);
}

export async function getAllRestaurantMenuAdmin(): Promise<RestaurantMenuItem[]> {
  return store.menuItems;
}

export async function updateMenuItem(
  id: string,
  partial: Partial<RestaurantMenuItem>
): Promise<RestaurantMenuItem> {
  const index = store.menuItems.findIndex((m) => m.id === id);
  if (index === -1) throw new Error(`Menu item ${id} not found`);
  store.menuItems[index] = { ...store.menuItems[index], ...partial };
  return store.menuItems[index];
}

// 8. Facilities, Offers, Galeri, Reviews
export async function getFacilities(): Promise<Facility[]> {
  return store.facilities.filter((f) => f.is_active);
}

export async function getOffers(): Promise<Offer[]> {
  return store.offers.filter((o) => o.is_active);
}

export async function getGaleriImages(): Promise<GaleriImage[]> {
  return store.galleryImages;
}

export async function getTamuReviews(): Promise<TamuReview[]> {
  return store.guestReviews.filter((r) => r.is_featured);
}

// 9. Admin KPI Ringkasan Metrics
export interface AdminMetrics {
  totalReservasi: number;
  pendingReservasi: number;
  confirmedReservasi: number;
  occupancyRatePercentage: number;
  totalRevenueCents: number;
  activeOffersCount: number;
  totalKamarInventory: number;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const totalReservasi = store.reservations.length;
  const pendingReservasi = store.reservations.filter((r) => r.status === 'pending').length;
  const confirmedReservasi = store.reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in'
  ).length;

  const totalRevenueCents = store.reservations
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.total_amount_cents, 0);

  const totalKamarInventory = store.rooms.length;
  const occupiedCount = store.reservations.filter((r) => r.status === 'checked_in' || r.status === 'confirmed').length;
  const occupancyRatePercentage = totalKamarInventory > 0
    ? Math.min(100, Math.round((occupiedCount / totalKamarInventory) * 100))
    : 78;

  const activeOffersCount = store.offers.filter((o) => o.is_active).length;

  return {
    totalReservasi,
    pendingReservasi,
    confirmedReservasi,
    occupancyRatePercentage,
    totalRevenueCents,
    activeOffersCount,
    totalKamarInventory,
  };
}
