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
  GalleryImage,
  GuestReview,
  SiteSettings,
} from '../types';
import {
  initialSiteSettings,
  initialRoomTypes,
  initialRooms,
  initialRoomRates,
  initialReservations,
  initialRestaurantCategories,
  initialMenuItems,
  initialFacilities,
  initialOffers,
  initialGalleryImages,
  initialGuestReviews,
} from './seed';

// Persistent in-memory global state across Route Handlers in serverless/Node process
interface GlobalState {
  siteSettings: SiteSettings;
  roomTypes: RoomType[];
  rooms: Room[];
  roomRates: RoomRate[];
  reservations: Reservation[];
  restaurantCategories: RestaurantCategory[];
  menuItems: RestaurantMenuItem[];
  facilities: Facility[];
  offers: Offer[];
  galleryImages: GalleryImage[];
  guestReviews: GuestReview[];
}

const globalForStore = globalThis as unknown as {
  hotelStore?: GlobalState;
};

if (!globalForStore.hotelStore) {
  globalForStore.hotelStore = {
    siteSettings: { ...initialSiteSettings },
    roomTypes: JSON.parse(JSON.stringify(initialRoomTypes)),
    rooms: JSON.parse(JSON.stringify(initialRooms)),
    roomRates: JSON.parse(JSON.stringify(initialRoomRates)),
    reservations: JSON.parse(JSON.stringify(initialReservations)),
    restaurantCategories: JSON.parse(JSON.stringify(initialRestaurantCategories)),
    menuItems: JSON.parse(JSON.stringify(initialMenuItems)),
    facilities: JSON.parse(JSON.stringify(initialFacilities)),
    offers: JSON.parse(JSON.stringify(initialOffers)),
    galleryImages: JSON.parse(JSON.stringify(initialGalleryImages)),
    guestReviews: JSON.parse(JSON.stringify(initialGuestReviews)),
  };
}

const store = globalForStore.hotelStore;

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

// 1. Site Settings
export async function getSiteSettings(): Promise<SiteSettings> {
  return store.siteSettings;
}

export async function updateSiteSettings(partial: Partial<SiteSettings>): Promise<SiteSettings> {
  store.siteSettings = { ...store.siteSettings, ...partial };
  return store.siteSettings;
}

// 2. Room Types & Rooms
export async function getRoomTypes(): Promise<RoomType[]> {
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

export async function getRooms(): Promise<Room[]> {
  return store.rooms;
}

// 3. Dynamic Pricing Engine
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
    throw new Error(`Room type with ID ${roomTypeId} not found`);
  }

  const nights = getDatesBetween(checkIn, checkOut);
  if (nights.length === 0) {
    throw new Error('Check-out date must be strictly after check-in date');
  }

  const rates: NightRateDetail[] = nights.map((nightDate) => {
    // Check if custom seasonal rate applies
    const customRate = store.roomRates.find(
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
      rateName: 'Base Nightly Rate',
    };
  });

  const rawTotalCents = rates.reduce((sum, item) => sum + item.priceCents, 0);

  // Apply promo code if valid
  let discountCents = 0;
  let discountPercentage = 0;

  if (promoCode) {
    const promo = store.offers.find(
      (o) =>
        o.is_active &&
        o.code &&
        o.code.toUpperCase() === promoCode.toUpperCase() &&
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
    currency: roomType.currency || 'EUR',
  };
}

// 4. Server-Side Availability Check with [check_in, check_out) Interval Logic
export async function checkRoomAvailability(
  roomTypeId: string,
  checkIn: string,
  checkOut: string
): Promise<{ isAvailable: boolean; availableRoomsCount: number; assignedRoomId?: string }> {
  const reqNights = getDatesBetween(checkIn, checkOut);
  if (reqNights.length === 0) {
    return { isAvailable: false, availableRoomsCount: 0 };
  }

  // Get physical rooms for this room type
  const physicalRooms = store.rooms.filter(
    (r) => r.room_type_id === roomTypeId && r.status === 'available'
  );

  // Active reservations that could overlap
  const activeReservations = store.reservations.filter(
    (res) =>
      res.status === 'confirmed' ||
      res.status === 'pending' ||
      res.status === 'checked_in'
  );

  const availableRooms = physicalRooms.filter((physRoom) => {
    // Check if this room is booked on ANY of the requested nights
    const hasConflict = activeReservations.some((res) => {
      if (res.assigned_room_number !== physRoom.room_number) return false;
      // Interval overlap check: [res.check_in, res.check_out) overlaps with [checkIn, checkOut)
      return !(res.check_out <= checkIn || res.check_in >= checkOut);
    });

    return !hasConflict;
  });

  return {
    isAvailable: availableRooms.length > 0,
    availableRoomsCount: availableRooms.length,
    assignedRoomId: availableRooms[0]?.id,
  };
}

// 5. Atomic Reservation Creation
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
    throw new Error('Selected room type does not exist');
  }

  // 1. Verify availability
  const availability = await checkRoomAvailability(room_type_id, check_in, check_out);
  if (!availability.isAvailable) {
    throw new Error(
      'Sorry, no rooms of this category are available for the selected dates. Please select alternative dates or a different suite.'
    );
  }

  // 2. Find assigned room
  const physicalRooms = store.rooms.filter(
    (r) => r.room_type_id === room_type_id && r.status === 'available'
  );
  const activeReservations = store.reservations.filter(
    (res) => res.status === 'confirmed' || res.status === 'pending' || res.status === 'checked_in'
  );

  const assignedRoom = physicalRooms.find((physRoom) => {
    const hasConflict = activeReservations.some((res) => {
      if (res.assigned_room_number !== physRoom.room_number) return false;
      return !(res.check_out <= check_in || res.check_in >= check_out);
    });
    return !hasConflict;
  });

  // 3. Dynamic pricing computation
  const pricing = await calculateStayPricing(room_type_id, check_in, check_out, promo_code);

  // 4. Generate unique reservation code e.g. MED-8X92Q
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  const reservation_code = `MED-${randomChars}`;

  const newReservation: Reservation = {
    id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    internal_notes: promo_code ? `Booked with promo code: ${promo_code}` : undefined,
  };

  // Atomic prepend to reservations list
  store.reservations.unshift(newReservation);

  return newReservation;
}

// 6. Reservation Management
export async function getReservations(filter?: {
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
    throw new Error(`Reservation ${id} not found`);
  }

  store.reservations[index] = {
    ...store.reservations[index],
    status,
    internal_notes: internalNotes !== undefined ? internalNotes : store.reservations[index].internal_notes,
  };

  return store.reservations[index];
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

// 8. Facilities, Offers, Gallery, Reviews
export async function getFacilities(): Promise<Facility[]> {
  return store.facilities.filter((f) => f.is_active);
}

export async function getOffers(): Promise<Offer[]> {
  return store.offers.filter((o) => o.is_active);
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  return store.galleryImages;
}

export async function getGuestReviews(): Promise<GuestReview[]> {
  return store.guestReviews.filter((r) => r.is_featured);
}

// 9. Admin KPI Overview Metrics
export interface AdminMetrics {
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  occupancyRatePercentage: number;
  totalRevenueCents: number;
  activeOffersCount: number;
  totalRoomsInventory: number;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const totalReservations = store.reservations.length;
  const pendingReservations = store.reservations.filter((r) => r.status === 'pending').length;
  const confirmedReservations = store.reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in'
  ).length;

  const totalRevenueCents = store.reservations
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.total_amount_cents, 0);

  const totalRoomsInventory = store.rooms.length;
  const occupiedCount = store.reservations.filter((r) => r.status === 'checked_in' || r.status === 'confirmed').length;
  const occupancyRatePercentage = totalRoomsInventory > 0
    ? Math.min(100, Math.round((occupiedCount / totalRoomsInventory) * 100))
    : 78;

  const activeOffersCount = store.offers.filter((o) => o.is_active).length;

  return {
    totalReservations,
    pendingReservations,
    confirmedReservations,
    occupancyRatePercentage,
    totalRevenueCents,
    activeOffersCount,
    totalRoomsInventory,
  };
}
