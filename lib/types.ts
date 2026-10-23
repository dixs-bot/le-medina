export type Role = 'super_admin' | 'admin' | 'reservation_staff' | 'content_editor';

export interface Profile {
  id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  avatar_url?: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: Role;
}

export interface RoomImage {
  id: string;
  room_type_id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
}

export interface RoomType {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  base_price_cents: number;
  currency: string;
  max_adults: number;
  max_children: number;
  size_sqm: number;
  bed_type: string;
  view_type: string;
  amenities: string[];
  is_active: boolean;
  sort_order: number;
  images?: RoomImage[];
}

export interface Room {
  id: string;
  room_type_id: string;
  room_number: string;
  floor: number;
  wing: string;
  status: 'available' | 'maintenance' | 'blocked';
}

export interface RoomRate {
  id: string;
  room_type_id: string;
  rate_name: string;
  start_date: string;
  end_date: string;
  price_cents: number;
  min_stay_nights: number;
  is_active: boolean;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

export type ReservationPaymentMethod = 'pay_at_hotel' | 'midtrans';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'partially_paid' | 'failed' | 'expired' | 'refunded';

export interface Reservation {
  id: string;
  reservation_code: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests?: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  adults: number;
  children: number;
  status: ReservationStatus;
  /** Payment lifecycle is intentionally separate from reservation status. */
  payment_method?: ReservationPaymentMethod | null;
  payment_status?: PaymentStatus;
  paid_at?: string | null;
  total_amount_cents: number;
  currency: string;
  source: string;
  whatsapp_notified: boolean;
  internal_notes?: string;
  created_at: string;
  room_type?: RoomType;
  assigned_room_number?: string;
}

export interface ReservationNight {
  id: string;
  reservation_item_id: string;
  room_id: string;
  night_date: string;
  rate_cents: number;
}

export interface ReservationEvent {
  id: string;
  reservation_id: string;
  event_type: string;
  actor: string;
  notes?: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface RestaurantCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface RestaurantMenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_signature: boolean;
  image_url?: string;
  sort_order: number;
  is_available: boolean;
}

export interface Facility {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon_name: string;
  image_url?: string;
  opening_hours: string;
  is_active: boolean;
  sort_order: number;
}

export interface Offer {
  id: string;
  title: string;
  code?: string;
  tagline: string;
  description: string;
  discount_percentage?: number;
  fixed_discount_cents?: number;
  valid_from: string;
  valid_to: string;
  image_url?: string;
  is_active: boolean;
}

export interface GaleriImage {
  id: string;
  category: 'architecture' | 'suites' | 'dining' | 'wellness' | 'experiences';
  title: string;
  image_url: string;
  caption?: string;
  sort_order: number;
}

export interface TamuReview {
  id: string;
  guest_name: string;
  origin_city?: string;
  country?: string;
  rating: number;
  title: string;
  comment: string;
  stay_date?: string;
  is_verified: boolean;
  is_featured: boolean;
}

export interface SitePengaturan {
  name: string;
  tagline: string;
  stars: number;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  check_in_time: string;
  check_out_time: string;
  currency: string;
}

export interface AdminMetrics {
  totalReservasi: number;
  pendingReservasi: number;
  confirmedReservasi: number;
  occupancyRatePercentage: number;
  totalRevenueCents: number;
  activeOffersCount: number;
  totalKamarInventory: number;
}
