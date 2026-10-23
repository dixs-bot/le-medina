import crypto from 'crypto';
import {
  RoomType,
  Room,
  RoomRate,
  Reservation,
  ReservationStatus,
  ReservationPaymentMethod,
  PaymentStatus,
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
import {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from '../supabaseClient';

/**
 * Database access rules
 * - Public catalogue reads use the anon client and remain subject to RLS.
 * - Admin/operational reads and writes use the server-only service-role client.
 * - The in-memory store is only a development fallback. It is never used as
 *   production truth and never reports a successful production booking.
 */
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
const isProduction = process.env.NODE_ENV === 'production';

function requireAdminDb() {
  if (!isSupabaseConfigured) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY wajib dikonfigurasi.');
  }
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tidak tersedia atau belum dikonfigurasi dengan benar di server.');
  }
  return supabaseAdmin;
}

function logDbError(context: string, error: { code?: string; message?: string }) {
  // Do not log API keys, tokens, or request bodies.
  console.error(`[hotel-store] ${context}:`, error.code || 'unknown', error.message || 'Database request failed');
}

function mapRoomType(row: any): RoomType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline || '',
    description: row.description || '',
    base_price_cents: Number(row.base_price_cents || 0),
    currency: row.currency || 'IDR',
    max_adults: Number(row.max_adults || 2),
    max_children: Number(row.max_children || 0),
    size_sqm: Number(row.size_sqm || 0),
    bed_type: row.bed_type || '',
    view_type: row.view_type || '',
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order || 0),
    images: Array.isArray(row.room_images)
      ? row.room_images
      : Array.isArray(row.images)
        ? row.images
        : [],
  };
}

function mapReservationRow(row: any, extras?: {
  roomType?: RoomType;
  assignedRoomNumber?: string;
}): Reservation {
  return {
    id: row.id,
    reservation_code: row.reservation_code,
    guest_name: row.guest_name,
    guest_email: row.guest_email || '',
    guest_phone: row.guest_phone || '',
    special_requests: row.special_requests || undefined,
    check_in: row.check_in,
    check_out: row.check_out,
    adults: Number(row.adults || 1),
    children: Number(row.children || 0),
    status: row.status as ReservationStatus,
    payment_method: (row.payment_method || (row.currency === 'IDR' ? 'pay_at_hotel' : null)) as ReservationPaymentMethod | null,
    payment_status: (row.payment_status || 'unpaid') as PaymentStatus,
    paid_at: row.paid_at || null,
    total_amount_cents: Number(row.total_amount_cents || 0),
    currency: row.currency || 'IDR',
    source: row.source || 'direct_web',
    whatsapp_notified: Boolean(row.whatsapp_notified),
    internal_notes: row.internal_notes || undefined,
    created_at: row.created_at,
    assigned_room_number: extras?.assignedRoomNumber || 'Belum Ditentukan',
    room_type: extras?.roomType,
  };
}

// A lightweight mutex is only for local development; database reservations use
// the transactional create_atomic_reservation PostgreSQL function instead.
if (!globalForStore.reservationMutex) {
  globalForStore.reservationMutex = Promise.resolve();
}

function withReservationLock<T>(fn: () => Promise<T>): Promise<T> {
  const current = globalForStore.reservationMutex!;
  const next = current.then(fn, fn);
  globalForStore.reservationMutex = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
export function parseDate(dStr: string): Date {
  return new Date(`${dStr}T00:00:00Z`);
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isValidISODateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDate(value);
  return !Number.isNaN(date.getTime()) && formatISODate(date) === value;
}

export function getDatesBetween(startDateStr: string, endDateStr: string): string[] {
  if (!isValidISODateString(startDateStr) || !isValidISODateString(endDateStr)) {
    return [];
  }

  const current = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  if (end <= current) return [];

  const dates: string[] = [];
  // Guard against accidental huge loops from malformed external input.
  while (current < end && dates.length <= 366) {
    dates.push(formatISODate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// 1. Hotel/site settings (public read; server-only write)
// ---------------------------------------------------------------------------
export async function getSitePengaturan(): Promise<SitePengaturan> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) {
      throw new Error('Pengaturan hotel tidak dapat dimuat karena Supabase belum dikonfigurasi.');
    }
    return { ...store.sitePengaturan };
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .eq('key', 'hotel_info')
    .maybeSingle();

  if (error) {
    logDbError('Gagal membaca pengaturan hotel', error);
    if (isProduction) {
      throw new Error('Gagal membaca pengaturan hotel dari database.');
    }
    return { ...store.sitePengaturan };
  }

  if (!data || !data.value || typeof data.value !== 'object' || Array.isArray(data.value)) {
    if (isProduction) {
      throw new Error("Data pengaturan hotel dengan key 'hotel_info' belum tersedia di database.");
    }
    return { ...store.sitePengaturan };
  }

  const value = data.value as Partial<SitePengaturan>;
  return {
    ...initialSitePengaturan,
    ...value,
    currency: value.currency || 'IDR',
  };
}

export async function updateSitePengaturan(
  partial: Partial<SitePengaturan>,
): Promise<SitePengaturan> {
  if (!isSupabaseConfigured) {
    if (isProduction) {
      throw new Error('Supabase belum dikonfigurasi untuk mengubah pengaturan hotel.');
    }
    store.sitePengaturan = { ...store.sitePengaturan, ...partial };
    return { ...store.sitePengaturan };
  }

  const db = requireAdminDb();
  const { data: existing, error: readError } = await db
    .from('site_settings')
    .select('value')
    .eq('key', 'hotel_info')
    .maybeSingle();

  if (readError) {
    logDbError('Gagal membaca pengaturan sebelum pembaruan', readError);
    throw new Error('Pengaturan hotel gagal dibaca sebelum disimpan.');
  }

  const currentValue = existing?.value && typeof existing.value === 'object'
    ? (existing.value as Partial<SitePengaturan>)
    : initialSitePengaturan;

  const next: SitePengaturan = {
    ...initialSitePengaturan,
    ...currentValue,
    ...partial,
    currency: partial.currency || currentValue.currency || 'IDR',
  };

  const { error } = await db
    .from('site_settings')
    .upsert(
      {
        key: 'hotel_info',
        value: next,
        description: 'Public hotel contact and operational settings',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

  if (error) {
    logDbError('Gagal menyimpan pengaturan hotel', error);
    throw new Error('Pengaturan hotel gagal disimpan ke database.');
  }

  store.sitePengaturan = next;
  return next;
}

// ---------------------------------------------------------------------------
// 2. Room types and physical-room inventory
// ---------------------------------------------------------------------------
export async function getRoomTypes(): Promise<RoomType[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk membaca tipe kamar.');
    return store.roomTypes.filter((roomType) => roomType.is_active);
  }

  const { data, error } = await supabase
    .from('room_types')
    .select('*, room_images(*)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    logDbError('Gagal membaca tipe kamar publik', error);
    if (isProduction) throw new Error('Gagal membaca tipe kamar dari database.');
    return store.roomTypes.filter((roomType) => roomType.is_active);
  }

  // An empty database response must stay empty; never silently show seed/demo data.
  return (data || []).map(mapRoomType);
}

export async function getAllRoomTypesAdmin(): Promise<RoomType[]> {
  if (!isSupabaseConfigured) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk inventaris tipe kamar admin.');
    return [...store.roomTypes];
  }

  const db = requireAdminDb();
  const { data, error } = await db
    .from('room_types')
    .select('*, room_images(*)')
    .order('sort_order', { ascending: true });

  if (error) {
    logDbError('Gagal membaca seluruh tipe kamar admin', error);
    throw new Error('Gagal membaca tipe kamar admin dari database.');
  }

  return (data || []).map(mapRoomType);
}

export async function getRoomTypeBySlug(slug: string): Promise<RoomType | null> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk membaca tipe kamar.');
    return store.roomTypes.find((roomType) => roomType.slug === slug && roomType.is_active) || null;
  }

  const { data, error } = await supabase
    .from('room_types')
    .select('*, room_images(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    logDbError('Gagal membaca tipe kamar berdasarkan slug', error);
    throw new Error('Gagal membaca tipe kamar dari database.');
  }
  return data ? mapRoomType(data) : null;
}

export async function getRoomTypeById(id: string): Promise<RoomType | null> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk membaca tipe kamar.');
    return store.roomTypes.find((roomType) => roomType.id === id && roomType.is_active) || null;
  }

  const { data, error } = await supabase
    .from('room_types')
    .select('*, room_images(*)')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    logDbError('Gagal membaca tipe kamar berdasarkan ID', error);
    throw new Error('Gagal memeriksa tipe kamar pada database.');
  }
  return data ? mapRoomType(data) : null;
}

/** Inventaris fisik hanya boleh dibaca melalui server-side service-role client. */
export async function getKamar(): Promise<Room[]> {
  if (!isSupabaseConfigured) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk membaca inventaris kamar.');
    return [...store.rooms];
  }

  const db = requireAdminDb();
  const { data, error } = await db
    .from('rooms')
    .select('*')
    .order('room_number', { ascending: true });

  if (error) {
    logDbError('Gagal membaca inventaris kamar', error);
    throw new Error('Gagal membaca inventaris kamar dari database. Pastikan SUPABASE_SERVICE_ROLE_KEY valid.');
  }

  return (data || []) as Room[];
}

// ---------------------------------------------------------------------------
// 3. Dynamic pricing engine (database prices are authoritative in production)
// ---------------------------------------------------------------------------
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
  promoCode?: string,
): Promise<PricingResult> {
  const nights = getDatesBetween(checkIn, checkOut);
  if (nights.length === 0) {
    throw new Error('Tanggal check-in/check-out tidak valid atau check-out harus setelah check-in.');
  }
  if (nights.length > 366) {
    throw new Error('Durasi menginap terlalu panjang untuk dihitung.');
  }

  const roomType = await getRoomTypeById(roomTypeId);
  if (!roomType) throw new Error(`Tipe kamar dengan ID '${roomTypeId}' tidak ditemukan atau tidak aktif.`);

  if (isSupabaseConfigured) {
    if (promoCode) {
      throw new Error('Kode promo belum diintegrasikan dengan mesin harga database. Lanjutkan tanpa kode promo atau hubungi bagian reservasi.');
    }

    const db = requireAdminDb();
    const { data, error } = await db.rpc('calculate_stay_rates', {
      p_room_type_id: roomTypeId,
      p_check_in: checkIn,
      p_check_out: checkOut,
    });

    if (error) {
      logDbError('Gagal menghitung tarif penginapan', error);
      throw new Error('Gagal menghitung tarif kamar dari database.');
    }

    const rates: NightRateDetail[] = (data || []).map((row: any) => ({
      date: String(row.night_date),
      priceCents: Number(row.applied_rate_cents),
      rateName: row.rate_source || 'Tarif database',
    }));

    if (rates.length !== nights.length) {
      throw new Error('Jumlah tarif malam dari database tidak sesuai dengan rentang tanggal yang dipilih.');
    }

    if (rates.some((rate) => !Number.isFinite(rate.priceCents) || rate.priceCents < 0)) {
      throw new Error('Database mengembalikan tarif kamar yang tidak valid.');
    }

    return {
      nightsCount: rates.length,
      rates,
      basePriceCents: Number(roomType.base_price_cents),
      totalPriceCents: rates.reduce((sum, rate) => sum + rate.priceCents, 0),
      discountCents: 0,
      currency: roomType.currency || 'IDR',
    };
  }

  if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk menghitung harga kamar.');

  const rates: NightRateDetail[] = nights.map((nightDate) => {
    const customRate = store.roomTarif.find((rate) =>
      rate.room_type_id === roomTypeId &&
      rate.is_active &&
      nightDate >= rate.start_date &&
      nightDate <= rate.end_date
    );

    return customRate
      ? { date: nightDate, priceCents: customRate.price_cents, rateName: customRate.rate_name }
      : { date: nightDate, priceCents: roomType.base_price_cents, rateName: 'Tarif Dasar Standar' };
  });

  const rawTotalCents = rates.reduce((sum, rate) => sum + rate.priceCents, 0);
  let discountCents = 0;
  let discountPercentage = 0;

  if (promoCode) {
    const cleanPromo = promoCode.trim().toUpperCase();
    const promo = store.offers.find((offer) =>
      offer.is_active &&
      offer.code?.toUpperCase() === cleanPromo &&
      checkIn >= offer.valid_from &&
      checkIn <= offer.valid_to
    );

    if (promo?.discount_percentage) {
      discountPercentage = promo.discount_percentage;
      discountCents = Math.round((rawTotalCents * promo.discount_percentage) / 100);
    }
  }

  return {
    nightsCount: rates.length,
    rates,
    basePriceCents: roomType.base_price_cents,
    totalPriceCents: Math.max(0, rawTotalCents - discountCents),
    discountCents,
    discountPercentage: discountPercentage || undefined,
    currency: roomType.currency || 'IDR',
  };
}

// ---------------------------------------------------------------------------
// 4. Server-side availability check
// ---------------------------------------------------------------------------
export async function checkRoomAvailability(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
): Promise<{ isTersedia: boolean; availableKamarCount: number; assignedRoomId?: string }> {
  const requestedNights = getDatesBetween(checkIn, checkOut);
  if (requestedNights.length === 0) {
    return { isTersedia: false, availableKamarCount: 0 };
  }

  if (isSupabaseConfigured) {
    // The RPC reads the private room inventory and reservation-night records;
    // invoke it through the server-side client to avoid public RLS exposure.
    const db = requireAdminDb();
    const { data, error } = await db.rpc('check_room_type_availability', {
      p_room_type_id: roomTypeId,
      p_check_in: checkIn,
      p_check_out: checkOut,
    });

    if (error) {
      logDbError('Gagal memeriksa ketersediaan kamar', error);
      throw new Error('Gagal memeriksa ketersediaan kamar dari database.');
    }

    const available = (data || []) as Array<{ room_id?: string }>;
    return {
      isTersedia: available.length > 0,
      availableKamarCount: available.length,
      assignedRoomId: available[0]?.room_id,
    };
  }

  if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk memeriksa ketersediaan kamar.');

  const physicalRooms = store.rooms.filter(
    (room) => room.room_type_id === roomTypeId && room.status === 'available',
  );
  const activeReservations = store.reservations.filter((reservation) =>
    ['confirmed', 'pending', 'checked_in'].includes(reservation.status),
  );

  const availableRooms = physicalRooms.filter((room) => {
    const hasConflict = activeReservations.some((reservation) => {
      if (reservation.assigned_room_number !== room.room_number) return false;
      return !(reservation.check_out <= checkIn || reservation.check_in >= checkOut);
    });
    return !hasConflict;
  });

  return {
    isTersedia: availableRooms.length > 0,
    availableKamarCount: availableRooms.length,
    assignedRoomId: availableRooms[0]?.id,
  };
}

// ---------------------------------------------------------------------------
// 5. Atomic reservation creation
// ---------------------------------------------------------------------------
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
  payment_method?: ReservationPaymentMethod;
}

export async function createAtomicReservation(input: CreateReservationInput): Promise<Reservation> {
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
    payment_method = 'pay_at_hotel',
  } = input;

  if (payment_method !== 'pay_at_hotel') {
    throw new Error('Pembayaran online belum aktif. Silakan pilih Bayar di Hotel.');
  }

  if (!isValidISODateString(check_in) || !isValidISODateString(check_out) || check_out <= check_in) {
    throw new Error('Tanggal check-in/check-out tidak valid.');
  }
  if (!guest_name.trim() || !guest_email.trim() || !guest_phone.trim()) {
    throw new Error('Nama, email, dan nomor telepon tamu wajib diisi.');
  }

  if (isSupabaseConfigured) {
    if (promo_code) {
      throw new Error('Kode promo belum dapat diproses oleh mesin reservasi database. Silakan lanjut tanpa kode promo atau hubungi bagian reservasi.');
    }

    const db = requireAdminDb();
    const { data, error } = await db.rpc('create_atomic_reservation_with_payment', {
      p_guest_name: guest_name.trim(),
      p_guest_email: guest_email.trim().toLowerCase(),
      p_guest_phone: guest_phone.trim(),
      p_check_in: check_in,
      p_check_out: check_out,
      p_adults: adults,
      p_children: children,
      p_room_type_id: room_type_id,
      p_special_requests: special_requests?.trim() || null,
      p_payment_method: payment_method,
    });

    if (error) {
      logDbError('RPC create_atomic_reservation_with_payment gagal', error);
      const message = error.message?.toLowerCase() || '';
      if (message.includes('no rooms') || message.includes('not available')) {
        throw new Error('Mohon maaf, kamar tidak tersedia pada tanggal yang dipilih.');
      }
      throw new Error('Pemesanan belum dapat disimpan. Silakan coba kembali atau hubungi bagian reservasi.');
    }

    const result = data as Record<string, unknown> | null;
    if (
      !result ||
      result.success !== true ||
      typeof result.reservation_code !== 'string' ||
      typeof result.reservation_id !== 'string'
    ) {
      console.error('[hotel-store] RPC reservation result did not contain the expected confirmation fields.');
      throw new Error('Database tidak mengonfirmasi penyimpanan reservasi. Silakan coba kembali.');
    }

    // A booking has already been committed at this point. Room details are
    // supplementary and must not trigger a fake/local booking fallback.
    let roomType: RoomType | undefined;
    try {
      roomType = (await getRoomTypeById(room_type_id)) || undefined;
    } catch (lookupError) {
      console.error('[hotel-store] Reservation was saved but room type details could not be reloaded.');
    }

    return {
      id: result.reservation_id,
      reservation_code: result.reservation_code,
      guest_name: guest_name.trim(),
      guest_email: guest_email.trim().toLowerCase(),
      guest_phone: guest_phone.trim(),
      special_requests: special_requests?.trim() || undefined,
      check_in,
      check_out,
      adults,
      children,
      status: (result.status as ReservationStatus) || 'pending',
      total_amount_cents: Number(result.total_amount_cents || 0),
      currency: String(result.currency || roomType?.currency || 'IDR'),
      payment_method: (result.payment_method as ReservationPaymentMethod) || payment_method,
      payment_status: (result.payment_status as PaymentStatus) || 'unpaid',
      paid_at: typeof result.paid_at === 'string' ? result.paid_at : null,
      source: 'direct_web',
      whatsapp_notified: false,
      created_at: new Date().toISOString(),
      assigned_room_number: 'Penetapan sesuai sistem reservasi',
      room_type: roomType,
    };
  }

  if (isProduction) {
    throw new Error('Pemesanan online belum aktif: konfigurasi Supabase server belum tersedia.');
  }

  // Local-only development reservation behavior.
  return withReservationLock(async () => {
    const roomType = await getRoomTypeById(room_type_id);
    if (!roomType) throw new Error('Tipe kamar yang dipilih tidak ditemukan.');

    const availability = await checkRoomAvailability(room_type_id, check_in, check_out);
    if (!availability.isTersedia) {
      throw new Error('Mohon maaf, tidak ada kamar yang tersedia pada tanggal yang dipilih.');
    }

    const pricing = await calculateStayPricing(room_type_id, check_in, check_out, promo_code);
    const reservationCode = `MED-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const newReservation: Reservation = {
      id: `res-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      reservation_code: reservationCode,
      guest_name: guest_name.trim(),
      guest_email: guest_email.trim().toLowerCase(),
      guest_phone: guest_phone.trim(),
      special_requests: special_requests?.trim() || undefined,
      check_in,
      check_out,
      adults,
      children,
      status: 'pending',
      payment_method,
      payment_status: 'unpaid',
      paid_at: null,
      total_amount_cents: pricing.totalPriceCents,
      currency: pricing.currency,
      source: 'direct_web',
      whatsapp_notified: false,
      created_at: new Date().toISOString(),
      assigned_room_number: 'Penetapan saat check-in',
      room_type: roomType,
      internal_notes: promo_code ? `Dipesan dengan kode promo: ${promo_code}` : undefined,
    };
    store.reservations.unshift(newReservation);
    return newReservation;
  });
}

// ---------------------------------------------------------------------------
// 6. Reservation management (admin reads/writes use service-role client)
// ---------------------------------------------------------------------------
export async function getReservasi(filter?: {
  status?: ReservationStatus;
  search?: string;
}): Promise<Reservation[]> {
  if (!isSupabaseConfigured) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk membaca reservasi admin.');
    let list = [...store.reservations];
    if (filter?.status) list = list.filter((reservation) => reservation.status === filter.status);
    if (filter?.search) {
      const query = filter.search.toLowerCase();
      list = list.filter((reservation) =>
        reservation.reservation_code.toLowerCase().includes(query) ||
        reservation.guest_name.toLowerCase().includes(query) ||
        reservation.guest_email.toLowerCase().includes(query)
      );
    }
    return list;
  }

  const db = requireAdminDb();
  const { data, error } = await db
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logDbError('Gagal membaca reservasi admin', error);
    throw new Error('Gagal membaca reservasi dari database. Pastikan service-role key dan izin database valid.');
  }

  let rows: any[] = data || [];
  if (filter?.status) rows = rows.filter((row) => row.status === filter.status);
  if (filter?.search) {
    const query = filter.search.toLowerCase();
    rows = rows.filter((row) =>
      String(row.reservation_code || '').toLowerCase().includes(query) ||
      String(row.guest_name || '').toLowerCase().includes(query) ||
      String(row.guest_email || '').toLowerCase().includes(query)
    );
  }

  if (!rows.length) return [];

  const reservationIds = rows.map((row) => row.id).filter(Boolean);
  const { data: items, error: itemsError } = await db
    .from('reservation_items')
    .select('reservation_id, room_type_id, assigned_room_id')
    .in('reservation_id', reservationIds);

  if (itemsError) {
    logDbError('Gagal membaca item reservasi', itemsError);
    throw new Error('Reservasi ditemukan, tetapi detail kamar gagal dibaca.');
  }

  const itemRows = items || [];
  const roomTypeIds = Array.from(new Set(itemRows.map((item: any) => item.room_type_id).filter(Boolean)));
  const roomIds = Array.from(new Set(itemRows.map((item: any) => item.assigned_room_id).filter(Boolean)));

  const [roomTypesResult, roomsResult] = await Promise.all([
    roomTypeIds.length
      ? db.from('room_types').select('*, room_images(*)').in('id', roomTypeIds)
      : Promise.resolve({ data: [], error: null } as any),
    roomIds.length
      ? db.from('rooms').select('id, room_number').in('id', roomIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (roomTypesResult.error || roomsResult.error) {
    const error = roomTypesResult.error || roomsResult.error;
    logDbError('Gagal membaca relasi kamar reservasi', error);
    throw new Error('Gagal membaca detail kamar pada data reservasi.');
  }

  const roomTypeMap = new Map<string, RoomType>();
  for (const row of roomTypesResult.data || []) {
    roomTypeMap.set(row.id, mapRoomType(row));
  }
  const roomMap = new Map<string, { id: string; room_number: string }>();
  for (const room of roomsResult.data || []) {
    roomMap.set(room.id, room);
  }
  const itemMap = new Map<string, any>();
  for (const item of itemRows) {
    if (!itemMap.has(item.reservation_id)) itemMap.set(item.reservation_id, item);
  }

  return rows.map((row: any) => {
    const reservationItem = itemMap.get(row.id);
    const roomType = reservationItem?.room_type_id
      ? roomTypeMap.get(reservationItem.room_type_id)
      : undefined;
    const assignedRoom = reservationItem?.assigned_room_id
      ? roomMap.get(reservationItem.assigned_room_id)
      : undefined;

    return mapReservationRow(row, {
      roomType,
      assignedRoomNumber: assignedRoom?.room_number || 'Belum Ditentukan',
    });
  });
}

/**
 * Lookup by reservation code uses the restricted SECURITY DEFINER RPC for public
 * confirmations. It deliberately does not return guest email, phone, or notes.
 */
export async function getReservationByCode(code: string): Promise<Reservation | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!/^MED-[A-Z0-9]{4,12}$/.test(cleanCode)) return null;

  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk mencari reservasi.');
    return store.reservations.find((reservation) => reservation.reservation_code.toUpperCase() === cleanCode) || null;
  }

  const { data, error } = await supabase.rpc('get_guest_reservation_by_code', {
    p_code: cleanCode,
  });

  if (error) {
    logDbError('Gagal mencari reservasi berdasarkan kode melalui RPC publik', error);
    throw new Error('Gagal memuat detail reservasi.');
  }
  if (!data || typeof data !== 'object') return null;

  const result = data as Record<string, any>;
  let roomType: RoomType | undefined;
  try {
    const roomTypes = await getRoomTypes();
    roomType = roomTypes.find((candidate) =>
      (result.room_type_slug && candidate.slug === result.room_type_slug) ||
      (result.room_type_name && candidate.name === result.room_type_name)
    );
  } catch {
    // The safe confirmation data remains usable even if room catalogue lookup fails.
  }

  return {
    // The public RPC intentionally omits the internal database UUID.
    // updateReservationStatus handles this synthetic identifier by reservation code.
    id: `res-supa-${cleanCode}`,
    reservation_code: result.reservation_code || cleanCode,
    guest_name: result.guest_name || '',
    guest_email: '',
    guest_phone: '',
    check_in: result.check_in,
    check_out: result.check_out,
    adults: Number(result.adults || 1),
    children: Number(result.children || 0),
    status: result.status as ReservationStatus,
    payment_method: (result.payment_method || (result.currency === 'IDR' ? 'pay_at_hotel' : null)) as ReservationPaymentMethod | null,
    payment_status: (result.payment_status || 'unpaid') as PaymentStatus,
    paid_at: result.paid_at || null,
    total_amount_cents: Number(result.total_amount_cents || 0),
    currency: result.currency || 'IDR',
    source: 'direct_web',
    whatsapp_notified: false,
    created_at: result.created_at || new Date().toISOString(),
    assigned_room_number: result.assigned_room_number || 'Belum Ditentukan',
    room_type: roomType,
  };
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
  internalNotes?: string,
): Promise<Reservation> {
  if (isSupabaseConfigured) {
    const db = requireAdminDb();
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (internalNotes !== undefined) updatePayload.internal_notes = internalNotes;

    const updateResult = id.startsWith('res-supa-')
      ? await db
          .from('reservations')
          .update(updatePayload)
          .eq('reservation_code', id.slice('res-supa-'.length).toUpperCase())
          .select('*')
          .maybeSingle()
      : await db
          .from('reservations')
          .update(updatePayload)
          .eq('id', id)
          .select('*')
          .maybeSingle();

    const { data, error } = updateResult;
    if (error) {
      logDbError('Gagal memperbarui status reservasi', error);
      throw new Error('Status reservasi gagal diperbarui di database.');
    }
    if (!data) throw new Error('Reservasi tidak ditemukan di database.');

    const { error: eventError } = await db.from('reservation_events').insert({
      reservation_id: data.id,
      event_type: 'status_updated',
      actor: 'admin_panel',
      notes: internalNotes || `Status reservasi diubah menjadi ${status}`,
      payload: { status },
    });
    if (eventError) {
      // Reservation status is already committed; report audit failure but do not
      // pretend that the status update itself failed.
      logDbError('Gagal menambahkan riwayat perubahan status reservasi', eventError);
    }

    try {
      const refreshed = await getReservasi({ search: data.reservation_code });
      const match = refreshed.find((reservation) => reservation.reservation_code === data.reservation_code);
      if (match) return match;
    } catch {
      // Return the committed reservation data below if relationship lookup fails.
    }

    return mapReservationRow(data);
  }

  if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk mengubah reservasi.');

  const index = store.reservations.findIndex((reservation) => reservation.id === id);
  if (index < 0) throw new Error(`Reservasi dengan ID ${id} tidak ditemukan.`);

  store.reservations[index] = {
    ...store.reservations[index],
    status,
    internal_notes: internalNotes !== undefined
      ? internalNotes
      : store.reservations[index].internal_notes,
  };
  return store.reservations[index];
}

// ---------------------------------------------------------------------------
// 7. Restaurant and menu
// ---------------------------------------------------------------------------
export async function getRestaurantCategories(): Promise<RestaurantCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk kategori restoran.');
    return store.restaurantCategories.filter((category) => category.is_active);
  }

  const { data, error } = await supabase
    .from('restaurant_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    logDbError('Gagal membaca kategori restoran', error);
    if (isProduction) throw new Error('Gagal membaca kategori restoran dari database.');
    return store.restaurantCategories.filter((category) => category.is_active);
  }
  return (data || []) as RestaurantCategory[];
}

export async function getRestaurantMenu(): Promise<RestaurantMenuItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk menu restoran.');
    return store.menuItems.filter((item) => item.is_available);
  }

  const { data, error } = await supabase
    .from('restaurant_menu')
    .select('*')
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (error) {
    logDbError('Gagal membaca menu restoran publik', error);
    if (isProduction) throw new Error('Gagal membaca menu restoran dari database.');
    return store.menuItems.filter((item) => item.is_available);
  }
  return (data || []) as RestaurantMenuItem[];
}

export async function getAllRestaurantMenuAdmin(): Promise<RestaurantMenuItem[]> {
  if (!isSupabaseConfigured) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk menu restoran admin.');
    return [...store.menuItems];
  }

  const db = requireAdminDb();
  const { data, error } = await db
    .from('restaurant_menu')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    logDbError('Gagal membaca seluruh menu restoran admin', error);
    throw new Error('Gagal membaca menu restoran admin dari database.');
  }
  return (data || []) as RestaurantMenuItem[];
}

export async function updateMenuItem(
  id: string,
  partial: Partial<RestaurantMenuItem>,
): Promise<RestaurantMenuItem> {
  if (isSupabaseConfigured) {
    const db = requireAdminDb();
    const allowedFields: (keyof RestaurantMenuItem)[] = [
      'category_id',
      'name',
      'description',
      'price_cents',
      'currency',
      'is_vegetarian',
      'is_vegan',
      'is_gluten_free',
      'is_signature',
      'image_url',
      'sort_order',
      'is_available',
    ];
    const payload: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (partial[field] !== undefined) payload[field] = partial[field];
    }
    if (!Object.keys(payload).length) {
      throw new Error('Tidak ada perubahan menu yang diberikan.');
    }

    const { data, error } = await db
      .from('restaurant_menu')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      logDbError('Gagal memperbarui menu restoran', error);
      throw new Error('Menu restoran gagal diperbarui di database.');
    }
    if (!data) throw new Error('Menu restoran tidak ditemukan.');
    return data as RestaurantMenuItem;
  }

  if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk memperbarui menu restoran.');
  const index = store.menuItems.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`Menu item ${id} tidak ditemukan.`);
  store.menuItems[index] = { ...store.menuItems[index], ...partial };
  return store.menuItems[index];
}

// ---------------------------------------------------------------------------
// 8. Facilities, offers, gallery, and guest reviews
// ---------------------------------------------------------------------------
export async function getFacilities(): Promise<Facility[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk fasilitas hotel.');
    return store.facilities.filter((facility) => facility.is_active);
  }

  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    logDbError('Gagal membaca fasilitas hotel', error);
    if (isProduction) throw new Error('Gagal membaca fasilitas hotel dari database.');
    return store.facilities.filter((facility) => facility.is_active);
  }
  return (data || []) as Facility[];
}

export async function getOffers(): Promise<Offer[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk promo hotel.');
    return store.offers.filter((offer) => offer.is_active);
  }

  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .order('valid_from', { ascending: false });
  if (error) {
    logDbError('Gagal membaca promo hotel', error);
    if (isProduction) throw new Error('Gagal membaca promo hotel dari database.');
    return store.offers.filter((offer) => offer.is_active);
  }
  return (data || []) as Offer[];
}

export async function getGaleriImages(): Promise<GaleriImage[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk galeri hotel.');
    return [...store.galleryImages];
  }

  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    logDbError('Gagal membaca galeri hotel', error);
    if (isProduction) throw new Error('Gagal membaca galeri hotel dari database.');
    return [...store.galleryImages];
  }
  return (data || []) as GaleriImage[];
}

export async function getTamuReviews(): Promise<TamuReview[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (isProduction) throw new Error('Supabase belum dikonfigurasi untuk ulasan tamu.');
    return store.guestReviews.filter((review) => review.is_featured);
  }

  const { data, error } = await supabase
    .from('guest_reviews')
    .select('*')
    .eq('is_featured', true)
    .order('created_at', { ascending: false });
  if (error) {
    logDbError('Gagal membaca ulasan tamu', error);
    if (isProduction) throw new Error('Gagal membaca ulasan tamu dari database.');
    return store.guestReviews.filter((review) => review.is_featured);
  }
  return (data || []) as TamuReview[];
}

// ---------------------------------------------------------------------------
// 9. Admin dashboard KPI
// ---------------------------------------------------------------------------
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
  const [reservations, rooms, offers] = await Promise.all([
    getReservasi(),
    getKamar(),
    getOffers(),
  ]);

  const totalReservasi = reservations.length;
  const pendingReservasi = reservations.filter((reservation) => reservation.status === 'pending').length;
  const confirmedReservasi = reservations.filter((reservation) =>
    reservation.status === 'confirmed' || reservation.status === 'checked_in'
  ).length;
  // Revenue is calculated from the verified payment ledger, not from booking
  // totals or check-out status. amount_idr stores full rupiah (e.g. 150000).
  let totalRevenueCents = 0;
  if (isSupabaseConfigured) {
    const db = requireAdminDb();
    const { data: paidPayments, error: paymentError } = await db
      .from('payments')
      .select('amount_idr')
      .eq('status', 'paid');
    if (paymentError) {
      logDbError('Gagal menghitung pendapatan dari pembayaran lunas', paymentError);
      throw new Error('Gagal membaca data pembayaran lunas untuk ringkasan pendapatan.');
    }
    const totalRevenueIDR = (paidPayments || []).reduce(
      (total: number, payment: any) => total + Number(payment.amount_idr || 0),
      0,
    );
    // Existing AdminMetrics is named *Cents and UI divides by 100. Keep that
    // contract while sourcing the number from the IDR ledger.
    totalRevenueCents = totalRevenueIDR * 100;
  } else {
    totalRevenueCents = reservations
      .filter((reservation) => reservation.payment_status === 'paid' && reservation.status !== 'cancelled')
      .reduce((total, reservation) => total + Number(reservation.total_amount_cents || 0), 0);
  }

  const totalKamarInventory = rooms.length;
  const today = new Date().toISOString().slice(0, 10);
  const occupiedRoomNumbers = new Set(
    reservations
      .filter((reservation) =>
        (reservation.status === 'confirmed' || reservation.status === 'checked_in') &&
        reservation.check_in <= today &&
        reservation.check_out > today &&
        reservation.assigned_room_number &&
        reservation.assigned_room_number !== 'Belum Ditentukan'
      )
      .map((reservation) => reservation.assigned_room_number as string),
  );

  const occupancyRatePercentage = totalKamarInventory > 0
    ? Math.min(100, Math.round((occupiedRoomNumbers.size / totalKamarInventory) * 100))
    : 0;

  return {
    totalReservasi,
    pendingReservasi,
    confirmedReservasi,
    occupancyRatePercentage,
    totalRevenueCents,
    activeOffersCount: offers.filter((offer) => offer.is_active).length,
    totalKamarInventory,
  };
}
