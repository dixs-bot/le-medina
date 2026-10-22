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
import { supabase, supabaseAdmin, isSupabaseConfigured, isSupabaseAdminConfigured } from '../supabaseClient';

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
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', 'hotel_info')
      .maybeSingle();
    if (error) {
      console.error('Failed to load hotel settings from Supabase:', error.message);
      throw new Error('Gagal membaca pengaturan hotel dari database.');
    }
    const value = (data?.value && typeof data.value === 'object' ? data.value : {}) as Partial<SitePengaturan>;
    if (data) return { ...store.sitePengaturan, ...value };
    return store.sitePengaturan;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Pengaturan hotel tidak dapat dimuat karena Supabase belum dikonfigurasi.');
  }
  return store.sitePengaturan;
}

export async function updateSitePengaturan(partial: Partial<SitePengaturan>): Promise<SitePengaturan> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const current = await getSitePengaturan();
    const next = { ...current, ...partial };
    const { error } = await supabaseAdmin
      .from('site_settings')
      .upsert({ key: 'hotel_info', value: next, description: 'Hotel contact and operational settings', updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      console.error('Failed to save hotel settings to Supabase:', error.message);
      throw new Error('Pengaturan hotel gagal disimpan ke database.');
    }
    store.sitePengaturan = next;
    return next;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('SUPABASE_SERVICE_ROLE_KEY wajib dikonfigurasi untuk mengubah pengaturan hotel.');
  store.sitePengaturan = { ...store.sitePengaturan, ...partial };
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
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('room_types').select('*, room_images(*)').eq('slug', slug).eq('is_active', true).maybeSingle();
    if (error) throw new Error('Gagal membaca tipe kamar dari database.');
    if (!data) return null;
    return { ...data, tagline: data.tagline || '', description: data.description || '', currency: data.currency || 'IDR', amenities: Array.isArray(data.amenities) ? data.amenities : [], images: Array.isArray(data.room_images) ? data.room_images : [] } as RoomType;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Supabase belum dikonfigurasi untuk membaca tipe kamar.');
  return store.roomTypes.find((r) => r.slug === slug) || null;
}

export async function getRoomTypeById(id: string): Promise<RoomType | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('room_types')
      .select('*, room_images(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('Failed to load room type from Supabase:', error.message);
      throw new Error('Gagal memeriksa tipe kamar pada database.');
    }
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      tagline: data.tagline || '',
      description: data.description || '',
      base_price_cents: data.base_price_cents,
      currency: data.currency || 'IDR',
      max_adults: data.max_adults,
      max_children: data.max_children,
      size_sqm: data.size_sqm,
      bed_type: data.bed_type,
      view_type: data.view_type,
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      is_active: data.is_active,
      sort_order: data.sort_order,
      images: Array.isArray(data.room_images) ? data.room_images : [],
    };
  }
  return store.roomTypes.find((r) => r.id === id) || null;
}

export async function getKamar(): Promise<Room[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('rooms').select('*').order('room_number', { ascending: true });
    if (error) throw new Error('Gagal membaca inventaris kamar dari database.');
    return (data || []) as Room[];
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Supabase belum dikonfigurasi untuk membaca inventaris kamar.');
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

  if (isSupabaseConfigured && supabase) {
    if (promoCode) throw new Error('Kode promo belum terintegrasi dengan mesin harga database. Silakan lanjut tanpa kode promo.');
    const { data, error } = await supabase.rpc('calculate_stay_rates', { p_room_type_id: roomTypeId, p_check_in: checkIn, p_check_out: checkOut });
    if (error) {
      console.error('Failed to calculate stay rates in Supabase:', error.message);
      throw new Error('Gagal menghitung tarif kamar dari database.');
    }
    const rates: NightRateDetail[] = (data || []).map((row: any) => ({ date: row.night_date, priceCents: Number(row.applied_rate_cents), rateName: row.rate_source || 'Tarif database' }));
    if (!rates.length) throw new Error('Tarif kamar tidak tersedia untuk tanggal yang dipilih.');
    const totalPriceCents = rates.reduce((sum, item) => sum + item.priceCents, 0);
    return { nightsCount: rates.length, rates, basePriceCents: roomType.base_price_cents, totalPriceCents, discountCents: 0, currency: roomType.currency || 'IDR' };
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Supabase belum dikonfigurasi untuk menghitung harga kamar.');
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

  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    const db = supabaseAdmin || supabase!;
    const { data, error } = await db.rpc('check_room_type_availability', { p_room_type_id: roomTypeId, p_check_in: checkIn, p_check_out: checkOut });
    if (error) {
      console.error('Failed to check room availability in Supabase:', error.message);
      throw new Error('Gagal memeriksa ketersediaan kamar dari database.');
    }
    const available = (data || []) as any[];
    return { isTersedia: available.length > 0, availableKamarCount: available.length, assignedRoomId: available[0]?.room_id };
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Supabase belum dikonfigurasi untuk memeriksa ketersediaan kamar.');

  // Development-only in-memory availability.
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

  // In configured environments, Supabase is the source of truth. Never return
  // a successful booking if the database call failed.
  if (isSupabaseConfigured) {
    if (promo_code) {
      throw new Error('Kode promo belum dapat diproses oleh mesin reservasi database. Silakan lanjut tanpa kode promo atau hubungi bagian reservasi.');
    }
    const client = supabaseAdmin || supabase;
    if (!client) throw new Error('Koneksi Supabase belum dikonfigurasi.');

    // The database RPC performs availability locking, pricing, and inserts into
    // reservations, reservation_items, reservation_nights, and reservation_events
    // as one PostgreSQL transaction. The current RPC schema does not accept a
    // promo code, so do not apply a client-only discount.
    const { data, error } = await client.rpc('create_atomic_reservation', {
      p_guest_name: guest_name,
      p_guest_email: guest_email,
      p_guest_phone: guest_phone,
      p_check_in: check_in,
      p_check_out: check_out,
      p_adults: adults,
      p_children: children,
      p_room_type_id: room_type_id,
      p_special_requests: special_requests || null,
    });

    if (error) {
      console.error('Supabase create_atomic_reservation failed:', error.message);
      throw new Error(
        error.message?.toLowerCase().includes('no rooms')
          ? 'Mohon maaf, kamar tidak tersedia pada tanggal yang dipilih.'
          : 'Pemesanan belum dapat disimpan. Silakan coba kembali atau hubungi bagian reservasi.'
      );
    }

    const result = data as Record<string, any> | null;
    if (!result?.success || !result.reservation_code || !result.reservation_id) {
      console.error('Supabase reservation RPC returned an unexpected result.');
      throw new Error('Database tidak mengonfirmasi penyimpanan reservasi. Silakan coba kembali.');
    }

    const roomType = await getRoomTypeById(room_type_id);
    if (!roomType) {
      // The booking is already committed; still return the persisted booking
      // confirmation rather than falling back to an unrelated seeded room type.
      console.error('Reservation saved but room type could not be loaded:', room_type_id);
    }

    const persisted: Reservation = {
      id: result.reservation_id,
      reservation_code: result.reservation_code,
      guest_name,
      guest_email,
      guest_phone,
      special_requests,
      check_in,
      check_out,
      adults,
      children,
      status: result.status || 'pending',
      total_amount_cents: Number(result.total_amount_cents || 0),
      currency: result.currency || roomType?.currency || 'IDR',
      source: 'direct_web',
      whatsapp_notified: false,
      created_at: new Date().toISOString(),
      assigned_room_number: 'Penetapan sesuai sistem reservasi',
      room_type: roomType || undefined,
      internal_notes: undefined,
    };
    return persisted;
  }

  // Never fabricate a successful booking in production when Supabase is missing.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Pemesanan online belum aktif: konfigurasi Supabase server belum tersedia.');
  }

  // Local-only behavior is development-only and must not be deployed as production data.
  return withReservationLock(async () => {
    const roomType = await getRoomTypeById(room_type_id);
    if (!roomType) throw new Error('Tipe kamar yang dipilih tidak ditemukan.');

    const availability = await checkRoomAvailability(room_type_id, check_in, check_out);
    if (!availability.isTersedia) {
      throw new Error('Mohon maaf, tidak ada kamar yang tersedia pada tanggal yang dipilih.');
    }

    const pricing = await calculateStayPricing(room_type_id, check_in, check_out, promo_code);
    const reservation_code = `MED-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
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
      assigned_room_number: 'Assigned Upon Check-in',
      room_type: roomType,
      internal_notes: promo_code ? `Dipesan dengan kode promo: ${promo_code}` : undefined,
    };
    store.reservations.unshift(newReservation);
    return newReservation;
  });
}

// 6. Reservation Management
export async function getReservasi(filter?: {
  status?: ReservationStatus;
  search?: string;
}): Promise<Reservation[]> {
  if (isSupabaseConfigured) {
    // The custom HMAC admin session is not a Supabase Auth session. Use the
    // server-only service-role client for this server-side admin data read.
    if (!isSupabaseAdminConfigured || !supabaseAdmin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY wajib dikonfigurasi di server untuk membaca reservasi admin.');
    }
    const client = supabaseAdmin;

    const { data, error } = await client
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch reservations from Supabase:', error.message);
      throw new Error('Gagal membaca reservasi dari database. Periksa koneksi dan izin Supabase.');
    }

    let rows: any[] = data || [];
    if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      rows = rows.filter((r) =>
        String(r.reservation_code || '').toLowerCase().includes(q) ||
        String(r.guest_name || '').toLowerCase().includes(q) ||
        String(r.guest_email || '').toLowerCase().includes(q)
      );
    }

    const reservationIds = rows.map((r) => r.id).filter(Boolean);
    const { data: items, error: itemsError } = reservationIds.length
      ? await client.from('reservation_items').select('reservation_id, room_type_id, assigned_room_id').in('reservation_id', reservationIds)
      : { data: [], error: null };

    if (itemsError) {
      console.error('Failed to fetch reservation items:', itemsError.message);
      throw new Error('Reservasi ditemukan, tetapi detail tipe kamar gagal dibaca.');
    }

    const roomTypeIds = Array.from(new Set((items || []).map((i: any) => i.room_type_id).filter(Boolean)));
    const roomIds = Array.from(new Set((items || []).map((i: any) => i.assigned_room_id).filter(Boolean)));
    const [{ data: roomTypes, error: roomTypesError }, { data: rooms, error: roomsError }] = await Promise.all([
      roomTypeIds.length ? client.from('room_types').select('*').in('id', roomTypeIds) : Promise.resolve({ data: [], error: null } as any),
      roomIds.length ? client.from('rooms').select('id, room_number').in('id', roomIds) : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (roomTypesError || roomsError) {
      console.error('Failed to fetch reservation related data:', roomTypesError?.message || roomsError?.message);
      throw new Error('Gagal membaca detail kamar reservasi dari database.');
    }

    const roomTypeMap = new Map((roomTypes || []).map((rt: any) => [rt.id, rt]));
    const roomMap = new Map((rooms || []).map((room: any) => [room.id, room]));
    const itemMap = new Map<string, any>();
    for (const item of items || []) if (!itemMap.has(item.reservation_id)) itemMap.set(item.reservation_id, item);

    return rows.map((item: any) => {
      const reservationItem = itemMap.get(item.id);
      const rawRoomType: any = reservationItem ? roomTypeMap.get(reservationItem.room_type_id) : undefined;
      const roomType: RoomType | undefined = rawRoomType ? {
        id: rawRoomType.id,
        name: rawRoomType.name,
        slug: rawRoomType.slug,
        tagline: rawRoomType.tagline || '',
        description: rawRoomType.description || '',
        base_price_cents: rawRoomType.base_price_cents,
        currency: rawRoomType.currency || item.currency || 'IDR',
        max_adults: rawRoomType.max_adults,
        max_children: rawRoomType.max_children,
        size_sqm: rawRoomType.size_sqm,
        bed_type: rawRoomType.bed_type,
        view_type: rawRoomType.view_type,
        amenities: Array.isArray(rawRoomType.amenities) ? rawRoomType.amenities : [],
        is_active: rawRoomType.is_active,
        sort_order: rawRoomType.sort_order,
        images: [],
      } : undefined;
      const assignedRoom: any = reservationItem?.assigned_room_id ? roomMap.get(reservationItem.assigned_room_id) : undefined;
      return {
        id: item.id,
        reservation_code: item.reservation_code,
        guest_name: item.guest_name,
        guest_email: item.guest_email,
        guest_phone: item.guest_phone,
        special_requests: item.special_requests || undefined,
        check_in: item.check_in,
        check_out: item.check_out,
        adults: item.adults,
        children: item.children,
        status: item.status,
        total_amount_cents: item.total_amount_cents,
        currency: item.currency || 'IDR',
        source: item.source || 'direct_web',
        whatsapp_notified: Boolean(item.whatsapp_notified),
        created_at: item.created_at,
        assigned_room_number: assignedRoom?.room_number || 'Belum Ditentukan',
        room_type: roomType,
        internal_notes: item.internal_notes || undefined,
      } as Reservation;
    });
  }

  // Explicit local-only development fallback when Supabase is not configured.
  let list = [...store.reservations];
  if (filter?.status) list = list.filter((r) => r.status === filter.status);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter((r) => r.reservation_code.toLowerCase().includes(q) || r.guest_name.toLowerCase().includes(q) || r.guest_email.toLowerCase().includes(q));
  }
  return list;
}

export async function getReservationByCode(code: string): Promise<Reservation | null> {
  const cleanCode = code.trim().toUpperCase();

  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    try {
      // First attempt safe RPC get_guest_reservation_by_code
      const { data: rpcData, error: rpcError } = await client.rpc('get_guest_reservation_by_code', {
        p_code: cleanCode,
      });

      if (!rpcError && rpcData) {
        const roomTypes = await getRoomTypes();
        const matchedRoomType = roomTypes.find((rt) => rt.name === rpcData.room_type_name) || roomTypes[0];
        return {
          id: rpcData.id || `res-supa-${cleanCode}`,
          reservation_code: rpcData.reservation_code,
          guest_name: rpcData.guest_name,
          guest_email: rpcData.guest_email || '',
          guest_phone: rpcData.guest_phone || '',
          check_in: rpcData.check_in,
          check_out: rpcData.check_out,
          adults: rpcData.adults,
          children: rpcData.children,
          status: rpcData.status,
          total_amount_cents: rpcData.total_amount_cents,
          currency: rpcData.currency || 'IDR',
          source: 'direct_web',
          whatsapp_notified: false,
          created_at: rpcData.created_at || new Date().toISOString(),
          assigned_room_number: rpcData.assigned_room_number || 'Belum Ditetapkan',
          room_type: matchedRoomType,
        };
      }

      // If RPC not found or returned null, try direct select if admin client available
      const { data, error } = await client
        .from('reservations')
        .select('*')
        .eq('reservation_code', cleanCode)
        .maybeSingle();

      if (!error && data) {
        const roomTypes = await getRoomTypes();
        const matchedRoomType = roomTypes.find((rt) => rt.id === data.room_type_id) || roomTypes[0];
        return {
          id: data.id,
          reservation_code: data.reservation_code,
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          guest_phone: data.guest_phone,
          special_requests: data.special_requests || undefined,
          check_in: data.check_in,
          check_out: data.check_out,
          adults: data.adults,
          children: data.children,
          status: data.status,
          total_amount_cents: data.total_amount_cents,
          currency: data.currency || 'IDR',
          source: data.source || 'direct_web',
          whatsapp_notified: Boolean(data.whatsapp_notified),
          created_at: data.created_at,
          assigned_room_number: data.assigned_room_number || 'Belum Ditetapkan',
          room_type: matchedRoomType,
          internal_notes: data.internal_notes || undefined,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch reservation by code from Supabase, using local fallback:', err);
    }
  }

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

  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    try {
      await client
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
  const reservationsList = await getReservasi();
  const roomsList = await getKamar();
  const offersList = await getOffers();

  const totalReservasi = reservationsList.length;
  const pendingReservasi = reservationsList.filter((r) => r.status === 'pending').length;
  const confirmedReservasi = reservationsList.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in'
  ).length;

  const totalRevenueCents = reservationsList
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.total_amount_cents, 0);

  const totalKamarInventory = roomsList.length;
  const occupiedCount = reservationsList.filter((r) => r.status === 'checked_in' || r.status === 'confirmed').length;
  const occupancyRatePercentage = totalKamarInventory > 0
    ? Math.min(100, Math.round((occupiedCount / totalKamarInventory) * 100))
    : 78;

  const activeOffersCount = offersList.filter((o) => o.is_active).length;

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
