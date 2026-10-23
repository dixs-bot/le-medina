'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdminMetrics,
  Reservation,
  RoomType,
  Room,
  RestaurantMenuItem,
  RestaurantCategory,
  SitePengaturan,
  Offer,
  Role,
  ReservationStatus,
} from '../../lib/types';
import { formatPrice } from '../../lib/utils';
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  DollarSign,
  UtensilsCrossed,
  Settings,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  RefreshCw,
  Loader2,
  Users,
  LogOut,
} from 'lucide-react';
import { AdminUser } from '../../lib/auth';

interface AdminDashboardClientProps {
  initialMetrics: AdminMetrics;
  initialReservasi: Reservation[];
  roomTypes: RoomType[];
  rooms: Room[];
  initialMenuItems: RestaurantMenuItem[];
  categories: RestaurantCategory[];
  initialSitePengaturan: SitePengaturan;
  offers: Offer[];
  currentUser?: AdminUser;
}

interface WalkInAvailableRoom {
  room_id: string;
  room_number: string;
  room_type_id: string;
  room_type_name: string;
  room_type_slug: string;
  floor: number;
  wing: string;
  base_price_cents: number;
  currency: string;
  max_adults: number;
  max_children: number;
}

function getJakartaDateISO(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function AdminDashboardClient({
  initialMetrics,
  initialReservasi,
  roomTypes,
  rooms,
  initialMenuItems,
  categories,
  initialSitePengaturan,
  offers,
  currentUser,
}: AdminDashboardClientProps) {
  const router = useRouter();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'reservations' | 'rooms' | 'rates' | 'menu' | 'settings'
  >('overview');

  // RBAC active role
  const [currentRole, setCurrentRole] = useState<Role>(currentUser?.role || 'super_admin');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Logout error', err);
      window.location.reload();
    }
  };

  // Reservasi state
  const [reservations, setReservasi] = useState<Reservation[]>(initialReservasi);
  const [metrics, setMetrics] = useState<AdminMetrics>(initialMetrics);
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
  const [updatingPaymentCode, setUpdatingPaymentCode] = useState<string | null>(null);
  const [resCari, setResCari] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  // Menu items state
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>(initialMenuItems);

  // Site settings state
  const [sitePengaturan, setSitePengaturan] = useState<SitePengaturan>(initialSitePengaturan);
  const [settingsSuccess, setPengaturanSuccess] = useState(false);

  // Async data loading, refresh & actionable error states
  const [isLoadingReservasi, setIsLoadingReservasi] = useState(false);
  const [reservasiError, setReservasiError] = useState<string | null>(null);
  const [updatingReservationCode, setUpdatingReservationCode] = useState<string | null>(null);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Front-desk / walk-in guest flow. Availability is loaded for the exact dates,
  // and the database transaction performs the final lock/check before saving.
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInGuestPhone, setWalkInGuestPhone] = useState('');
  const [walkInGuestEmail, setWalkInGuestEmail] = useState('');
  const [walkInGuestCount, setWalkInGuestCount] = useState(2);
  const [walkInCheckIn, setWalkInCheckIn] = useState(getJakartaDateISO());
  const [walkInCheckOut, setWalkInCheckOut] = useState(getJakartaDateISO(1));
  const [walkInRoomId, setWalkInRoomId] = useState('');
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState<'cash' | 'bank_transfer' | 'qris'>('cash');
  const [walkInPaymentStatus, setWalkInPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [walkInCheckInNow, setWalkInCheckInNow] = useState(false);
  const [walkInRooms, setWalkInRooms] = useState<WalkInAvailableRoom[]>([]);
  const [walkInRoomsLoading, setWalkInRoomsLoading] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [walkInSaving, setWalkInSaving] = useState(false);

  useEffect(() => {
    if (!walkInOpen) return;
    if (!walkInCheckIn || !walkInCheckOut || walkInCheckOut <= walkInCheckIn) {
      setWalkInRooms([]);
      setWalkInRoomId('');
      return;
    }

    let ignore = false;
    const loadAvailableRooms = async () => {
      setWalkInRoomsLoading(true);
      setWalkInError(null);
      try {
        const response = await fetch(
          `/api/admin/walk-in-reservations?checkIn=${encodeURIComponent(walkInCheckIn)}&checkOut=${encodeURIComponent(walkInCheckOut)}`,
          { cache: 'no-store' },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Gagal memuat kamar tersedia.');
        const nextRooms = Array.isArray(payload?.rooms) ? payload.rooms as WalkInAvailableRoom[] : [];
        if (ignore) return;
        setWalkInRooms(nextRooms);
        setWalkInRoomId((previous) => nextRooms.some((room) => room.room_id === previous) ? previous : '');
      } catch (error) {
        if (!ignore) {
          setWalkInRooms([]);
          setWalkInRoomId('');
          setWalkInError(error instanceof Error ? error.message : 'Gagal memuat kamar tersedia.');
        }
      } finally {
        if (!ignore) setWalkInRoomsLoading(false);
      }
    };
    void loadAvailableRooms();
    return () => { ignore = true; };
  }, [walkInOpen, walkInCheckIn, walkInCheckOut]);

  const handleCreateWalkInReservation = async () => {
    if (!canManageReservasi || walkInSaving) return;
    if (!walkInRoomId) {
      setWalkInError('Pilih kamar yang tersedia terlebih dahulu.');
      return;
    }
    setWalkInSaving(true);
    setWalkInError(null);
    setStatusUpdateMessage(null);
    try {
      const response = await fetch('/api/admin/walk-in-reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          room_id: walkInRoomId,
          guest_name: walkInGuestName,
          guest_phone: walkInGuestPhone,
          guest_email: walkInGuestEmail,
          guest_count: walkInGuestCount,
          check_in: walkInCheckIn,
          check_out: walkInCheckOut,
          payment_method: walkInPaymentMethod,
          payment_status: walkInPaymentStatus,
          check_in_now: walkInCheckInNow,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Data tamu offline gagal disimpan (HTTP ${response.status}).`);
      }

      const reservation = payload.reservation || {};
      const statusText = reservation.reservation_status === 'checked_in' ? 'SUDAH DITEMPATI / CHECK-IN' : 'RESERVED / MENUNGGU CHECK-IN';
      const paymentText = reservation.payment_status === 'paid' ? 'LUNAS' : 'BELUM DIBAYAR';
      setStatusUpdateMessage({
        type: 'success',
        text: `Tamu offline berhasil disimpan. Kamar ${reservation.room_number} (${reservation.room_type}) — ${statusText}. Kode ${reservation.reservation_code}. Tagihan ${formatPrice(Number(reservation.amount_idr || 0), 'IDR')} • ${paymentText}.`,
      });
      setWalkInGuestName('');
      setWalkInGuestPhone('');
      setWalkInGuestEmail('');
      setWalkInGuestCount(2);
      setWalkInCheckIn(getJakartaDateISO());
      setWalkInCheckOut(getJakartaDateISO(1));
      setWalkInPaymentMethod('cash');
      setWalkInPaymentStatus('unpaid');
      setWalkInCheckInNow(false);
      setWalkInOpen(false);
      await fetchLiveReservations();
      await refreshDashboardMetrics();
      router.refresh();
    } catch (error) {
      setWalkInError(error instanceof Error ? error.message : 'Gagal menyimpan tamu offline.');
    } finally {
      setWalkInSaving(false);
    }
  };

  const refreshDashboardMetrics = async () => {
    setIsRefreshingMetrics(true);
    try {
      const response = await fetch('/api/admin/metrics', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.metrics) {
        throw new Error(payload?.error || `Gagal memperbarui ringkasan (HTTP ${response.status}).`);
      }
      setMetrics(payload.metrics as AdminMetrics);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui ringkasan dashboard.';
      setStatusUpdateMessage({ type: 'error', text: message });
    } finally {
      setIsRefreshingMetrics(false);
    }
  };

  const fetchLiveReservations = async () => {
    setIsLoadingReservasi(true);
    setReservasiError(null);
    try {
      const res = await fetch('/api/reservations', { cache: 'no-store' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memuat reservasi langsung dari server.');
      }
      const data = await res.json();
      if (Array.isArray(data.reservations)) {
        setReservasi(data.reservations);
      }
    } catch (err: any) {
      setReservasiError(err.message || 'Terjadi gangguan jaringan atau otorisasi server.');
    } finally {
      setIsLoadingReservasi(false);
    }
  };

  // Filtered reservations
  const filteredReservasi = reservations.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCari =
      !resCari ||
      r.reservation_code.toLowerCase().includes(resCari.toLowerCase()) ||
      r.guest_name.toLowerCase().includes(resCari.toLowerCase()) ||
      r.guest_email.toLowerCase().includes(resCari.toLowerCase());
    return matchesStatus && matchesCari;
  });

  // Update status on the server, then synchronise the UI from the API response.
  // If the request returns an error after the database committed, read the current
  // status by reservation code so the dropdown does not keep showing stale state.
  const handleUpdateStatus = async (resId: string, newStatus: ReservationStatus) => {
    const reservation = reservations.find((item) => item.id === resId);
    if (!reservation || updatingReservationCode) return;
    if (reservation.status === newStatus) return;

    setUpdatingReservationCode(reservation.reservation_code);
    setStatusUpdateMessage(null);

    const applyStatus = (status: ReservationStatus, updated?: Partial<Reservation>) => {
      setReservasi((previous) =>
        previous.map((item) =>
          item.reservation_code === reservation.reservation_code
            ? { ...item, ...(updated || {}), status }
            : item,
        ),
      );
      setSelectedRes((previous) =>
        previous && previous.reservation_code === reservation.reservation_code
          ? { ...previous, ...(updated || {}), status }
          : previous,
      );
    };

    try {
      const response = await fetch(
        `/api/reservations/${encodeURIComponent(reservation.reservation_code)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ status: newStatus }),
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Status gagal diperbarui (HTTP ${response.status}).`);
      }

      const updatedReservation = payload.reservation as Reservation | undefined;
      const persistedStatus = updatedReservation?.status || newStatus;
      applyStatus(persistedStatus, updatedReservation);
      setStatusUpdateMessage({
        type: 'success',
        text: `Status ${reservation.reservation_code} berhasil disimpan: ${
          persistedStatus === 'pending' ? 'Menunggu Konfirmasi' :
          persistedStatus === 'confirmed' ? 'Dikonfirmasi' :
          persistedStatus === 'checked_in' ? 'Sudah Check-In' :
          persistedStatus === 'checked_out' ? 'Sudah Check-Out' : 'Dibatalkan'
        }.`,
      });
      await refreshDashboardMetrics();
      // The room cards derive reserved/occupied status from live reservations.
      // Refresh server data so check-in/check-out is reflected immediately in inventory.
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui status reservasi.';
      console.error('[admin/reservations] Status update failed:', message);

      // Reconcile with the server in case the database update committed but a
      // later step caused the PATCH response to fail.
      try {
        const checkResponse = await fetch(
          `/api/reservations/${encodeURIComponent(reservation.reservation_code)}`,
          { cache: 'no-store' },
        );
        const checkPayload = await checkResponse.json().catch(() => null);
        const databaseStatus = checkPayload?.reservation?.status as ReservationStatus | undefined;
        if (checkResponse.ok && databaseStatus) {
          applyStatus(databaseStatus, checkPayload.reservation as Partial<Reservation>);
          router.refresh();
        }
      } catch {
        // Keep the original request error visible below.
      }

      setStatusUpdateMessage({ type: 'error', text: message });
    } finally {
      setUpdatingReservationCode(null);
    }
  };

  const handleReceivePayment = async (reservation: Reservation) => {
    if (!canManageReservasi || updatingPaymentCode) return;
    if (reservation.payment_status === 'paid') return;

    const confirmed = window.confirm(
      `Konfirmasi bahwa pembayaran penuh sebesar ${formatPrice(reservation.total_amount_cents / 100, 'IDR')} untuk ${reservation.reservation_code} benar-benar sudah diterima di hotel?\n\nTindakan ini akan menandai pembayaran LUNAS dan memengaruhi total pendapatan.`
    );
    if (!confirmed) return;

    const receiptReference = window.prompt('Nomor kuitansi/referensi pembayaran (opsional):', '') || '';
    setUpdatingPaymentCode(reservation.reservation_code);
    setStatusUpdateMessage(null);

    try {
      const response = await fetch('/api/admin/payments/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          reservation_code: reservation.reservation_code,
          receipt_reference: receiptReference.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Pembayaran gagal dicatat (HTTP ${response.status}).`);
      }

      setStatusUpdateMessage({
        type: 'success',
        text: `Pembayaran ${reservation.reservation_code} berhasil dicatat sebagai LUNAS.`,
      });
      await fetchLiveReservations();
      await refreshDashboardMetrics();
      if (selectedRes?.reservation_code === reservation.reservation_code) {
        setSelectedRes((previous) => previous ? { ...previous, payment_status: 'paid', paid_at: payload.payment?.paid_at || new Date().toISOString() } : previous);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mencatat pembayaran.';
      setStatusUpdateMessage({ type: 'error', text: message });
    } finally {
      setUpdatingPaymentCode(null);
    }
  };

  // Toggle dish availability
  const toggleMenuAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, is_available: !item.is_available } : item
      )
    );
  };

  // Role permissions helpers
  const canManageReservasi =
    currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'reservation_staff';
  const canManageContent =
    currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'content_editor';

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col">
      {/* Top Admin Bar */}
      <header className="bg-forest-950 text-ivory border-b border-forest-800 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-gold-300 hover:text-white uppercase tracking-wider font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Halaman Publik</span>
          </Link>
          <span className="text-forest-700">|</span>
          <div className="flex flex-col">
            <span className="font-editorial text-lg font-bold text-ivory tracking-wide leading-none">
              HÔTEL LE MÉDINA
            </span>
            <span className="text-[10px] uppercase tracking-widest text-gold-400 font-semibold mt-0.5">
              Panel Pengelolaan Hotel
            </span>
          </div>
        </div>

        {/* User Info, RBAC & Logout */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-ivory leading-tight">{currentUser.name}</span>
              <span className="text-[10px] text-ivory-300 leading-tight">{currentUser.email}</span>
            </div>
          )}

          {/* If super_admin, can switch simulated view; otherwise display fixed role badge */}
          {currentUser?.role === 'super_admin' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ivory-300 hidden md:inline">Simulasi RBAC:</span>
              <div className="flex bg-forest-900 rounded p-1 border border-forest-800 text-xs">
                {(['super_admin', 'admin', 'reservation_staff', 'content_editor'] as Role[]).map(
                  (role) => (
                    <button
                      key={role}
                      onClick={() => setCurrentRole(role)}
                      className={`px-2.5 py-1 rounded text-[11px] capitalize font-medium transition-all ${
                        currentRole === role
                          ? 'bg-gold text-charcoal font-bold shadow-sm'
                          : 'text-ivory-300 hover:text-white'
                      }`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-forest-900 border border-forest-800 px-3 py-1.5 rounded-lg text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-[11px] text-ivory-200 capitalize font-medium">
                {currentRole.replace('_', ' ')}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-error/20 hover:bg-status-error/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-50"
            title="Keluar dari Panel Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content & Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-forest-900 text-ivory p-4 border-r border-forest-800 flex-shrink-0">
          <div className="space-y-1.5 sticky top-20">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-400 font-bold px-3 block mb-2">
              Menu Navigasi
            </span>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-gold text-charcoal font-bold shadow'
                  : 'text-ivory-200 hover:bg-forest-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Ringkasan Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('reservations')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === 'reservations'
                  ? 'bg-gold text-charcoal font-bold shadow'
                  : 'text-ivory-200 hover:bg-forest-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4" />
                <span>Daftar Reservasi</span>
              </div>
              <span className="text-[10px] bg-forest-950 px-2 py-0.5 rounded-full text-gold-300">
                {reservations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === 'rooms'
                  ? 'bg-gold text-charcoal font-bold shadow'
                  : 'text-ivory-200 hover:bg-forest-800'
              }`}
            >
              <BedDouble className="w-4 h-4" />
              <span>Kamar & Inventaris</span>
            </button>

            <button
              onClick={() => setActiveTab('rates')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === 'rates'
                  ? 'bg-gold text-charcoal font-bold shadow'
                  : 'text-ivory-200 hover:bg-forest-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Tarif & Ketentuan</span>
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === 'menu'
                  ? 'bg-gold text-charcoal font-bold shadow'
                  : 'text-ivory-200 hover:bg-forest-800'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Menu Restoran</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-gold text-charcoal font-bold shadow'
                  : 'text-ivory-200 hover:bg-forest-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Sistem</span>
            </button>
          </div>
        </aside>

        {/* Tab Body */}
        <main className="flex-1 p-6 sm:p-10 bg-ivory-50 overflow-x-hidden">
          {/* TAB 1: OVERVIEW / METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="font-editorial text-3xl font-bold text-forest mb-1">
                    Ringkasan Operasional Eksekutif
                  </h1>
                  <p className="text-xs text-mutedgray">
                    Pendapatan berasal dari pembayaran lunas yang telah diverifikasi di database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { void refreshDashboardMetrics(); void fetchLiveReservations(); }}
                  disabled={isRefreshingMetrics || isLoadingReservasi}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-bordercolor bg-ivory px-3 py-2 text-xs font-semibold text-forest hover:bg-ivory-100 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMetrics ? 'animate-spin' : ''}`} />
                  {isRefreshingMetrics ? 'Memperbarui...' : 'Segarkan Ringkasan'}
                </button>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Menunggu Konfirmasi
                    </span>
                    <Clock className="w-4 h-4 text-status-warning" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-status-warning">
                    {metrics.pendingReservasi}
                  </div>
                  <span className="text-[11px] text-mutedgray mt-1 block">
                    Memerlukan tindak lanjut dan konfirmasi staf
                  </span>
                </div>

                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Reservasi Dikonfirmasi
                    </span>
                    <CheckCircle className="w-4 h-4 text-status-success" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-forest">
                    {metrics.confirmedReservasi}
                  </div>
                  <span className="text-[11px] text-status-success font-medium mt-1 block">
                    Total: {metrics.totalReservasi} reservasi langsung
                  </span>
                </div>

                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Tingkat Okupansi
                    </span>
                    <Percent className="w-4 h-4 text-gold" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-forest">
                    {metrics.occupancyRatePercentage}%
                  </div>
                  <span className="text-[11px] text-mutedgray mt-1 block">
                    Dari total 7 unit kamar hotel
                  </span>
                </div>

                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Total Pendapatan
                    </span>
                    <TrendingUp className="w-4 h-4 text-status-success" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-forest">
                    {formatPrice(metrics.totalRevenueCents / 100, 'IDR')}
                  </div>
                  <span className="text-[11px] text-mutedgray mt-1 block">
                    Total pembayaran yang sudah lunas dan terverifikasi
                  </span>
                </div>
              </div>

              {/* Quick Table: Recent Inbound Bookings */}
              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-editorial text-lg font-bold text-forest">
                    Pemesanan Tamu Terbaru
                  </h3>
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className="text-xs text-gold-600 hover:text-gold-700 font-semibold uppercase tracking-wider flex items-center gap-1"
                  >
                    <span>Lihat Semua</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-bordercolor text-mutedgray uppercase tracking-wider text-[11px]">
                        <th className="py-2.5">Kode</th>
                        <th>Tamu</th>
                        <th>Tanggal</th>
                        <th>Kamar</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bordercolor/60">
                      {reservations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-mutedgray">
                            Belum ada aktivitas reservasi terbaru yang tercatat di database.
                          </td>
                        </tr>
                      ) : (
                        reservations.slice(0, 5).map((r) => (
                        <tr key={r.id} className="hover:bg-ivory-100/60">
                          <td className="py-3 font-mono font-bold text-forest">
                            {r.reservation_code}
                          </td>
                          <td>
                            <strong className="text-forest block">{r.guest_name}</strong>
                            <span className="text-[10px] text-mutedgray">{r.guest_phone}</span>
                          </td>
                          <td>
                            <span>{r.check_in}</span> → <span>{r.check_out}</span>
                          </td>
                          <td className="text-forest font-medium">{r.room_type?.name}</td>
                          <td className="font-bold text-gold-700">
                            {formatPrice(r.total_amount_cents / 100, r.currency)}
                          </td>
                          <td>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                r.status === 'confirmed'
                                  ? 'bg-status-success/10 text-status-success'
                                  : r.status === 'pending'
                                  ? 'bg-status-warning/10 text-status-warning'
                                  : 'bg-mutedgray/10 text-mutedgray'
                              }`}
                            >
                              {r.status === "confirmed" ? "Dikonfirmasi" :
                                 r.status === "pending" ? "Menunggu Konfirmasi" :
                                 r.status === "checked_in" ? "Sudah Check-In" :
                                 r.status === "checked_out" ? "Sudah Check-Out" :
                                 r.status === "cancelled" ? "Dibatalkan" : r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESERVATIONS MANAGEMENT */}
          {activeTab === 'reservations' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-3xl font-bold text-forest mb-1">
                    Buku Reservasi & Penetapan Kamar
                  </h1>
                  <p className="text-xs text-mutedgray">
                    Kelola siklus reservasi: Menunggu Konfirmasi → Dikonfirmasi → Check-In → Check-Out.
                  </p>
                </div>

                {/* Actions & Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={fetchLiveReservations}
                    disabled={isLoadingReservasi}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-forest-900 text-ivory hover:bg-forest-800 text-xs font-semibold transition-all disabled:opacity-50"
                    title="Perbarui data reservasi dari database Supabase"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReservasi ? 'animate-spin' : ''}`} />
                    <span>{isLoadingReservasi ? 'Memuat...' : 'Segarkan'}</span>
                  </button>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-mutedgray absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Cari nama tamu atau kode..."
                      value={resCari}
                      onChange={(e) => setResCari(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded bg-ivory border border-bordercolor text-xs focus:ring-1 focus:ring-gold"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded bg-ivory border border-bordercolor text-xs focus:ring-1 focus:ring-gold"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu Konfirmasi</option>
                    <option value="confirmed">Dikonfirmasi</option>
                    <option value="checked_in">Sudah Check-In</option>
                    <option value="checked_out">Sudah Check-Out</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
              </div>

              <section className="bg-ivory rounded-xl border border-bordercolor shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
                  <div>
                    <h2 className="font-editorial text-xl font-bold text-forest">Tamu Walk-in / Reservasi Offline</h2>
                    <p className="text-xs text-mutedgray mt-1">Resepsionis dapat mencatat tamu yang datang langsung dan mengalokasikan kamar fisik.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setWalkInOpen((open) => !open); setWalkInError(null); }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800"
                  >
                    {walkInOpen ? 'Tutup Form' : '+ Tambah Tamu Offline'}
                  </button>
                </div>

                {walkInOpen && (
                  <form
                    className="border-t border-bordercolor p-4 sm:p-5 space-y-4"
                    onSubmit={(event) => { event.preventDefault(); void handleCreateWalkInReservation(); }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Nama lengkap tamu *
                        <input required minLength={2} maxLength={100} value={walkInGuestName} onChange={(event) => setWalkInGuestName(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Nama sesuai identitas" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Nomor telepon / WhatsApp *
                        <input required type="tel" maxLength={25} value={walkInGuestPhone} onChange={(event) => setWalkInGuestPhone(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="08xxxxxxxxxx" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Email (opsional)
                        <input type="email" maxLength={100} value={walkInGuestEmail} onChange={(event) => setWalkInGuestEmail(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="email@contoh.com" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Jumlah orang *
                        <input required type="number" min={1} max={20} value={walkInGuestCount} onChange={(event) => setWalkInGuestCount(Number(event.target.value))} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Tanggal check-in *
                        <input required type="date" min={getJakartaDateISO()} value={walkInCheckIn} onChange={(event) => { const nextDate = event.target.value; setWalkInCheckIn(nextDate); if (nextDate !== getJakartaDateISO()) setWalkInCheckInNow(false); }} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Tanggal check-out *
                        <input required type="date" min={walkInCheckIn || getJakartaDateISO()} value={walkInCheckOut} onChange={(event) => setWalkInCheckOut(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5 md:col-span-2 xl:col-span-1">
                        Pilih kamar tersedia *
                        <select required value={walkInRoomId} onChange={(event) => setWalkInRoomId(event.target.value)} disabled={walkInRoomsLoading || walkInRooms.length === 0} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal disabled:bg-gray-100">
                          <option value="">{walkInRoomsLoading ? 'Memeriksa ketersediaan...' : walkInRooms.length ? 'Pilih nomor kamar' : 'Tidak ada kamar tersedia'}</option>
                          {walkInRooms.map((room) => (
                            <option key={room.room_id} value={room.room_id}>
                              {room.room_number} — {room.room_type_name} · {formatPrice(Number(room.base_price_cents || 0) / 100, room.currency || 'IDR')}/malam
                            </option>
                          ))}
                        </select>
                        <span className="block text-[10px] font-normal text-mutedgray">Daftar ini mengikuti tanggal menginap. Database memeriksa ulang sebelum menyimpan.</span>
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Metode pembayaran *
                        <select value={walkInPaymentMethod} onChange={(event) => setWalkInPaymentMethod(event.target.value as 'cash' | 'bank_transfer' | 'qris')} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal">
                          <option value="cash">Cash / Tunai</option>
                          <option value="bank_transfer">Transfer Bank</option>
                          <option value="qris">QRIS</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Status pembayaran *
                        <select value={walkInPaymentStatus} onChange={(event) => setWalkInPaymentStatus(event.target.value as 'paid' | 'unpaid')} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal">
                          <option value="unpaid">Belum dibayar</option>
                          <option value="paid">Sudah dibayar / Lunas</option>
                        </select>
                      </label>
                    </div>

                    <label className="flex items-start gap-3 rounded-lg border border-bordercolor bg-ivory-50 p-3 text-xs text-forest">
                      <input type="checkbox" checked={walkInCheckInNow} disabled={walkInCheckIn !== getJakartaDateISO()} onChange={(event) => setWalkInCheckInNow(event.target.checked)} className="mt-0.5 h-4 w-4 accent-forest-900" />
                      <span><strong className="block">Tamu langsung menempati kamar (Check-In sekarang)</strong><span className="font-normal text-mutedgray">Centang jika tamu sudah datang dan menerima kunci. Status kamar menjadi “Sudah Ditempati”. Jika tidak dicentang, kamar berstatus “Reserved”.</span></span>
                    </label>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
                      <strong>Catatan pembayaran:</strong> pemilihan QRIS/Transfer di sini hanya mencatat metode yang dibayarkan di luar sistem. Ini belum membuat QR dinamis atau terhubung otomatis ke bank/payment gateway. Tandai “Lunas” hanya setelah pembayaran benar-benar diterima dan diverifikasi.
                    </div>

                    {walkInError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{walkInError}</div>}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-mutedgray">Kamar tersedia untuk tanggal ini: {walkInRooms.length}</span>
                      <button type="submit" disabled={walkInSaving || walkInRoomsLoading || !walkInRoomId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-charcoal hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50">
                        {walkInSaving ? 'Menyimpan data...' : 'Simpan Tamu & Alokasikan Kamar'}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {statusUpdateMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-lg border px-4 py-3 text-xs font-semibold ${
                    statusUpdateMessage.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {statusUpdateMessage.text}
                </div>
              )}

              {/* Reservasi Table */}
              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ivory-200/50 border-b border-bordercolor text-mutedgray uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-4">Kode</th>
                        <th className="p-4">Informasi Tamu</th>
                        <th className="p-4">Periode Inap</th>
                        <th className="p-4">Tipe & Nomor Kamar</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Ubah Status</th>
                        <th className="p-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bordercolor">
                      {isLoadingReservasi ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-mutedgray">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-gold" />
                              <span className="text-xs font-medium">Memuat data reservasi langsung dari database...</span>
                            </div>
                          </td>
                        </tr>
                      ) : reservasiError ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-4 max-w-md mx-auto">
                              <AlertCircle className="w-5 h-5" />
                              <span className="text-xs font-semibold">{reservasiError}</span>
                              <button
                                onClick={fetchLiveReservations}
                                className="mt-1 px-3 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700 transition-colors"
                              >
                                Coba Lagi
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : filteredReservasi.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-mutedgray">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <CalendarCheck className="w-8 h-8 text-gold/60" />
                              <span className="text-sm font-semibold text-forest">Belum Ada Data Reservasi</span>
                              <span className="text-xs max-w-sm">
                                {resCari || statusFilter !== 'all'
                                  ? 'Tidak ditemukan reservasi yang sesuai dengan kriteria pencarian atau filter status yang dipilih.'
                                  : 'Saat ini belum ada pemesanan kamar yang tercatat di sistem database hotel.'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredReservasi.map((res) => (
                        <tr key={res.id} className="hover:bg-ivory-100/50">
                          <td className="p-4 font-mono font-bold text-forest">
                            {res.reservation_code}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-forest block">{res.guest_name}</span>
                            {res.source === 'walk_in' && <span className="inline-block mt-1 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800">Tamu Offline / Resepsionis</span>}
                            <span className="text-[11px] text-mutedgray block">{res.guest_email}</span>
                            <span className="text-[11px] text-mutedgray block">{res.guest_phone}</span>
                          </td>
                          <td className="p-4">
                            <div>
                              <span>Masuk: <strong>{res.check_in}</strong></span>
                              <br />
                              <span>Keluar: <strong>{res.check_out}</strong></span>
                            </div>
                          </td>
                          <td className="p-4">
                            <strong className="text-forest block">{res.room_type?.name}</strong>
                            <span className="text-[11px] text-gold-700 font-semibold">
                              Kamar: {res.assigned_room_number}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-gold-700">
                              {formatPrice(res.total_amount_cents / 100, res.currency || 'IDR')}
                            </div>
                            <div className="mt-1 text-[10px] font-semibold">
                              {res.payment_status === 'paid' ? (
                                <span className="text-emerald-700">LUNAS</span>
                              ) : res.payment_status === 'pending' ? (
                                <span className="text-amber-700">MENUNGGU PEMBAYARAN</span>
                              ) : (
                                <span className="text-gray-500">BELUM DIBAYAR</span>
                              )}
                            </div>
                            {canManageReservasi && res.payment_method === 'pay_at_hotel' && res.payment_status !== 'paid' && res.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => void handleReceivePayment(res)}
                                disabled={updatingPaymentCode === res.reservation_code}
                                className="mt-2 inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                {updatingPaymentCode === res.reservation_code ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                {updatingPaymentCode === res.reservation_code ? 'Menyimpan...' : 'Catat Lunas'}
                              </button>
                            )}
                          </td>
                          <td className="p-4">
                            {canManageReservasi ? (
                              <select
                                value={res.status}
                                disabled={updatingReservationCode === res.reservation_code}
                                onChange={(e) =>
                                  handleUpdateStatus(res.id, e.target.value as ReservationStatus)
                                }
                                className={`text-[11px] px-2.5 py-1.5 rounded font-bold uppercase border ${
                                  res.status === 'confirmed'
                                    ? 'bg-status-success/10 text-status-success border-status-success/30'
                                    : res.status === 'pending'
                                    ? 'bg-status-warning/10 text-status-warning border-status-warning/30'
                                    : res.status === 'checked_in'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                                }`}
                              >
                                <option value="pending">Menunggu Konfirmasi</option>
                                <option value="confirmed">Dikonfirmasi</option>
                                <option value="checked_in">Sudah Check-In</option>
                                <option value="checked_out">Sudah Check-Out</option>
                                <option value="cancelled">Dibatalkan</option>
                              </select>
                            ) : (
                              <span className="capitalize font-bold text-mutedgray">
                                {res.status === "confirmed" ? "Dikonfirmasi" :
                                  res.status === "pending" ? "Menunggu Konfirmasi" :
                                  res.status === "checked_in" ? "Sudah Check-In" :
                                  res.status === "checked_out" ? "Sudah Check-Out" :
                                  res.status === "cancelled" ? "Dibatalkan" : res.status}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedRes(res)}
                              className="text-xs text-gold-600 hover:text-gold-700 font-semibold underline"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Reservation Drawer/Modal */}
              {selectedRes && (
                <div className="fixed inset-0 z-50 bg-forest-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-ivory rounded-xl p-6 sm:p-8 max-w-xl w-full border border-bordercolor shadow-2xl space-y-4">
                    <div className="flex justify-between items-start border-b border-bordercolor pb-3">
                      <div>
                        <span className="text-xs text-gold-600 font-bold uppercase">
                          Detail Pemesanan
                        </span>
                        <h3 className="font-editorial text-2xl font-bold text-forest">
                          {selectedRes.reservation_code}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedRes(null)}
                        className="text-xs uppercase font-semibold text-mutedgray hover:text-charcoal"
                      >
                        ✕ Tutup
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-mutedgray block">Nama Tamu</span>
                        <strong className="text-forest text-sm">{selectedRes.guest_name}</strong>
                      </div>
                      <div>
                        <span className="text-mutedgray block">Kontak</span>
                        <span>{selectedRes.guest_email}</span>
                        <br />
                        <span>{selectedRes.guest_phone}</span>
                      </div>
                      <div>
                        <span className="text-mutedgray block">Dates</span>
                        <span>{selectedRes.check_in} → {selectedRes.check_out}</span>
                      </div>
                      <div>
                        <span className="text-mutedgray block">Total</span>
                        <strong className="text-gold-700 text-sm">
                          {formatPrice(selectedRes.total_amount_cents / 100, selectedRes.currency)}
                        </strong>
                      </div>
                    </div>

                    {selectedRes.special_requests && (
                      <div className="bg-ivory-100 p-3 rounded text-xs text-charcoal">
                        <strong className="block text-forest mb-1">Permintaan Khusus Tamu:</strong>
                        <p>{selectedRes.special_requests}</p>
                      </div>
                    )}

                    {selectedRes.internal_notes && (
                      <div className="bg-yellow-50/80 p-3 rounded text-xs text-yellow-900 border border-yellow-200">
                        <strong className="block mb-1">Catatan Internal Staf:</strong>
                        <p>{selectedRes.internal_notes}</p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/confirmation/${selectedRes.reservation_code}`}
                        target="_blank"
                        className="text-xs text-forest hover:text-gold uppercase tracking-wider font-semibold underline"
                      >
                        Buka Halaman Konfirmasi Publik ↗
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUITES & ROOM INVENTORY */}
          {activeTab === 'rooms' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="font-editorial text-3xl font-bold text-forest mb-1">
                  Inventaris Fisik & Status Kamar
                </h1>
                <p className="text-xs text-mutedgray">
                  Pemantauan status pemeliharaan, kesiapan, dan alokasi kamar di seluruh area hotel.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rooms.map((room) => {
                  const roomType = roomTypes.find((rt) => rt.id === room.room_type_id);
                  const operationalStatus = room.current_status || room.status;
                  const statusLabel = operationalStatus === 'available' ? 'Tersedia'
                    : operationalStatus === 'reserved' ? 'Reserved'
                    : operationalStatus === 'occupied' ? 'Sudah Ditempati'
                    : operationalStatus === 'maintenance' ? 'Pemeliharaan'
                    : operationalStatus === 'blocked' ? 'Ditutup' : operationalStatus;
                  const statusClass = operationalStatus === 'available'
                    ? 'bg-status-success/10 text-status-success'
                    : operationalStatus === 'occupied'
                      ? 'bg-red-100 text-red-800'
                      : operationalStatus === 'reserved'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-status-warning/10 text-status-warning';
                  return (
                    <div
                      key={room.id}
                      className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm space-y-3"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider text-mutedgray block">
                            Lantai {room.floor} • Sayap {room.wing}
                          </span>
                          <h3 className="font-editorial text-xl font-bold text-forest">
                            {room.room_number}
                          </h3>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="text-xs text-charcoal/80">
                        <span className="text-mutedgray block">Tipe Kamar:</span>
                        <strong className="text-forest">{roomType?.name || 'Tipe lama / arsip reservasi'}</strong>
                      </div>

                      {room.current_guest && operationalStatus !== 'available' && (
                        <div className="rounded-md bg-ivory-200/70 border border-bordercolor p-3 text-xs">
                          <p className="font-semibold text-forest">{room.current_guest}</p>
                          {room.current_reservation_code && <p className="text-mutedgray mt-0.5">Kode: {room.current_reservation_code}</p>}
                          {room.current_check_in && room.current_check_in > getJakartaDateISO() && <p className="text-mutedgray mt-0.5">Rencana check-in: {room.current_check_in}</p>}
                          {room.current_check_out && <p className="text-mutedgray mt-0.5">Rencana check-out: {room.current_check_out}</p>}
                        </div>
                      )}

                      <div className="text-xs text-mutedgray pt-2 border-t border-bordercolor flex justify-between">
                        <span>Tarif Dasar:</span>
                        <strong className="text-gold-700">
                          {roomType ? formatPrice(roomType.base_price_cents / 100, 'IDR') : '—'}/malam
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: RATES & PRICING RULES */}
          {activeTab === 'rates' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="font-editorial text-3xl font-bold text-forest mb-1">
                  Tarif Musiman & Aturan Durasi Menginap
                </h1>
                <p className="text-xs text-mutedgray">
                  Pengaturan rentang tarif musiman, periode liburan, dan batas minimum durasi inap.
                </p>
              </div>

              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm overflow-hidden p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-bordercolor pb-3">
                    <h3 className="font-editorial text-lg font-bold text-forest">
                      Aturan Penetapan Tarif Aktif
                    </h3>
                    <span className="text-xs text-status-success font-semibold">
                      Perhitungan Otomatis Aktif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-ivory-100 border border-bordercolor">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-editorial text-base font-bold text-forest">
                          Winter Holiday Oasis High Season
                        </h4>
                        <span className="bg-gold/20 text-gold-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          Rp 5.200.000 / malam
                        </span>
                      </div>
                      <p className="text-xs text-mutedgray mb-2">
                        Periode: <strong>Dec 20, 2026 – Jan 05, 2027</strong>
                      </p>
                      <div className="text-[11px] text-charcoal/80 space-y-1">
                        <div>• Berlaku untuk: Sultana Royal Courtyard Suite</div>
                        <div>• Batas minimum menginap: 3 malam</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-ivory-100 border border-bordercolor">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-editorial text-base font-bold text-forest">
                          Atlas Winter Starlight Season
                        </h4>
                        <span className="bg-gold/20 text-gold-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          Rp 6.500.000 / malam
                        </span>
                      </div>
                      <p className="text-xs text-mutedgray mb-2">
                        Periode: <strong>Nov 01, 2026 – Dec 31, 2026</strong>
                      </p>
                      <div className="text-[11px] text-charcoal/80 space-y-1">
                        <div>• Berlaku untuk: Atlas Panorama Rooftop Suite</div>
                        <div>• Batas minimum menginap: 2 malam</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RESTAURANT MENU CMS */}
          {activeTab === 'menu' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-editorial text-3xl font-bold text-forest mb-1">
                    Restoran Le Medina CMS
                  </h1>
                  <p className="text-xs text-mutedgray">
                    Pengelolaan menu hidangan, tombol status ketersediaan, dan kategori sajian restoran.
                  </p>
                </div>
              </div>

              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-ivory-200/50 border-b border-bordercolor text-mutedgray uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-4">Nama Menu</th>
                      <th className="p-4">Deskripsi</th>
                      <th className="p-4">Harga</th>
                      <th className="p-4">Kategori Makanan</th>
                      <th className="p-4">Ketersediaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bordercolor">
                    {menuItems.map((item) => (
                      <tr key={item.id} className="hover:bg-ivory-100/50">
                        <td className="p-4">
                          <strong className="text-forest text-sm font-editorial block">
                            {item.name}
                          </strong>
                          {item.is_signature && (
                            <span className="text-[10px] text-gold-600 font-bold uppercase">
                              ★ Andalan Chef
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-mutedgray max-w-xs">{item.description}</td>
                        <td className="p-4 font-bold text-gold-700">
                          {formatPrice(item.price_cents / 100, item.currency)}
                        </td>
                        <td className="p-4 space-x-1">
                          {item.is_vegetarian && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                              Veg
                            </span>
                          )}
                          {item.is_gluten_free && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                              GF
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => toggleMenuAvailability(item.id)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                              item.is_available
                                ? 'bg-status-success text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {item.is_available ? 'Tersedia' : 'Habis'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SITE & OPERATIONS SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn max-w-3xl">
              <div>
                <h1 className="font-editorial text-3xl font-bold text-forest mb-1">
                  Operasional & Pengaturan Sistem
                </h1>
                <p className="text-xs text-mutedgray">
                  Konfigurasi nomor kontak WhatsApp, alamat hotel, dan jam operasional check-in / check-out.
                </p>
              </div>

              {settingsSuccess && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-status-success text-status-success text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Pengaturan operasional hotel berhasil diperbarui.</span>
                </div>
              )}

              <div className="bg-ivory rounded-xl p-6 sm:p-8 border border-bordercolor shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Nama Hotel
                    </label>
                    <input
                      type="text"
                      value={sitePengaturan.name}
                      onChange={(e) =>
                        setSitePengaturan({ ...sitePengaturan, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Nomor WhatsApp Layanan Hotel (Format E.164)
                    </label>
                    <input
                      type="text"
                      value={sitePengaturan.whatsapp}
                      onChange={(e) =>
                        setSitePengaturan({ ...sitePengaturan, whatsapp: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Nomor Telepon
                    </label>
                    <input
                      type="text"
                      value={sitePengaturan.phone}
                      onChange={(e) =>
                        setSitePengaturan({ ...sitePengaturan, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Alamat Email Hotel
                    </label>
                    <input
                      type="email"
                      value={sitePengaturan.email}
                      onChange={(e) =>
                        setSitePengaturan({ ...sitePengaturan, email: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Alamat Lengkap Hotel
                    </label>
                    <input
                      type="text"
                      value={sitePengaturan.address}
                      onChange={(e) =>
                        setSitePengaturan({ ...sitePengaturan, address: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setPengaturanSuccess(true);
                      setTimeout(() => setPengaturanSuccess(false), 3000);
                    }}
                    className="px-6 py-2.5 rounded bg-forest hover:bg-forest-900 text-ivory text-xs uppercase tracking-widest font-semibold transition-all shadow"
                  >
                    Simpan Pengaturan Operasional
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
