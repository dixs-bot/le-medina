'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AdminMetrics,
  Reservation,
  RoomType,
  Room,
  RestaurantMenuItem,
  RestaurantCategory,
  SiteSettings,
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
  Users,
} from 'lucide-react';

interface AdminDashboardClientProps {
  initialMetrics: AdminMetrics;
  initialReservations: Reservation[];
  roomTypes: RoomType[];
  rooms: Room[];
  initialMenuItems: RestaurantMenuItem[];
  categories: RestaurantCategory[];
  initialSiteSettings: SiteSettings;
  offers: Offer[];
}

export default function AdminDashboardClient({
  initialMetrics,
  initialReservations,
  roomTypes,
  rooms,
  initialMenuItems,
  categories,
  initialSiteSettings,
  offers,
}: AdminDashboardClientProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'reservations' | 'rooms' | 'rates' | 'menu' | 'settings'
  >('overview');

  // RBAC active role
  const [currentRole, setCurrentRole] = useState<Role>('super_admin');

  // Reservations state
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [resSearch, setResSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  // Menu items state
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>(initialMenuItems);

  // Site settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Filtered reservations
  const filteredReservations = reservations.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      !resSearch ||
      r.reservation_code.toLowerCase().includes(resSearch.toLowerCase()) ||
      r.guest_name.toLowerCase().includes(resSearch.toLowerCase()) ||
      r.guest_email.toLowerCase().includes(resSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle status update
  const handleUpdateStatus = async (resId: string, newStatus: ReservationStatus) => {
    try {
      const res = reservations.find((r) => r.id === resId);
      if (!res) return;

      const response = await fetch(`/api/reservations/${res.reservation_code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setReservations((prev) =>
          prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
        );
        if (selectedRes && selectedRes.id === resId) {
          setSelectedRes({ ...selectedRes, status: newStatus });
        }
      }
    } catch (e) {
      console.error('Failed to update status', e);
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
  const canManageReservations =
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
            <span>Public Site</span>
          </Link>
          <span className="text-forest-700">|</span>
          <div className="flex flex-col">
            <span className="font-editorial text-lg font-bold text-ivory tracking-wide leading-none">
              HÔTEL LE MÉDINA
            </span>
            <span className="text-[10px] uppercase tracking-widest text-gold-400 font-semibold mt-0.5">
              Management CMS & Concierge Portal
            </span>
          </div>
        </div>

        {/* RBAC Role Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-ivory-300 hidden md:inline">Active RBAC Persona:</span>
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
      </header>

      {/* Main Admin Content & Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-forest-900 text-ivory p-4 border-r border-forest-800 flex-shrink-0">
          <div className="space-y-1.5 sticky top-20">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-400 font-bold px-3 block mb-2">
              System Modules
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
              <span>KPI Dashboard</span>
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
                <span>Bookings</span>
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
              <span>Suites & Inventory</span>
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
              <span>Rates & Rules</span>
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
              <span>Restaurant CMS</span>
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
              <span>Site & Operations</span>
            </button>
          </div>
        </aside>

        {/* Tab Body */}
        <main className="flex-1 p-6 sm:p-10 bg-ivory-50 overflow-x-hidden">
          {/* TAB 1: OVERVIEW / METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className="font-editorial text-3xl font-bold text-forest mb-1">
                  Executive Operations Overview
                </h1>
                <p className="text-xs text-mutedgray">
                  Real-time occupancy, revenue yield, and direct reservation pipeline.
                </p>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Pending Approvals
                    </span>
                    <Clock className="w-4 h-4 text-status-warning" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-status-warning">
                    {initialMetrics.pendingReservations}
                  </div>
                  <span className="text-[11px] text-mutedgray mt-1 block">
                    Requires front-desk deposit confirmation
                  </span>
                </div>

                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Confirmed Bookings
                    </span>
                    <CheckCircle className="w-4 h-4 text-status-success" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-forest">
                    {initialMetrics.confirmedReservations}
                  </div>
                  <span className="text-[11px] text-status-success font-medium mt-1 block">
                    Total: {initialMetrics.totalReservations} direct guest stays
                  </span>
                </div>

                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Occupancy Rate
                    </span>
                    <Percent className="w-4 h-4 text-gold" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-forest">
                    {initialMetrics.occupancyRatePercentage}%
                  </div>
                  <span className="text-[11px] text-mutedgray mt-1 block">
                    Across 7 luxury riad chambers
                  </span>
                </div>

                <div className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">
                      Gross Revenue
                    </span>
                    <TrendingUp className="w-4 h-4 text-status-success" />
                  </div>
                  <div className="font-editorial text-3xl font-bold text-forest">
                    {formatPrice(initialMetrics.totalRevenueCents / 100, 'EUR')}
                  </div>
                  <span className="text-[11px] text-mutedgray mt-1 block">
                    Direct web booking revenue
                  </span>
                </div>
              </div>

              {/* Quick Table: Recent Inbound Bookings */}
              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-editorial text-lg font-bold text-forest">
                    Latest Inbound Guest Bookings
                  </h3>
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className="text-xs text-gold-600 hover:text-gold-700 font-semibold uppercase tracking-wider flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-bordercolor text-mutedgray uppercase tracking-wider text-[11px]">
                        <th className="py-2.5">Code</th>
                        <th>Guest</th>
                        <th>Dates</th>
                        <th>Suite</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bordercolor/60">
                      {reservations.slice(0, 5).map((r) => (
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
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
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
                    Reservation Ledger & Room Assignment
                  </h1>
                  <p className="text-xs text-mutedgray">
                    Manage guest lifecycle: Pending → Confirmed → Checked In → Checked Out.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-mutedgray absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search guest or code..."
                      value={resSearch}
                      onChange={(e) => setResSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded bg-ivory border border-bordercolor text-xs focus:ring-1 focus:ring-gold"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded bg-ivory border border-bordercolor text-xs focus:ring-1 focus:ring-gold"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="checked_out">Checked Out</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Reservations Table */}
              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ivory-200/50 border-b border-bordercolor text-mutedgray uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-4">Code</th>
                        <th className="p-4">Guest Info</th>
                        <th className="p-4">Stay Dates</th>
                        <th className="p-4">Room & Chamber</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Status Transition</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bordercolor">
                      {filteredReservations.map((res) => (
                        <tr key={res.id} className="hover:bg-ivory-100/50">
                          <td className="p-4 font-mono font-bold text-forest">
                            {res.reservation_code}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-forest block">{res.guest_name}</span>
                            <span className="text-[11px] text-mutedgray block">{res.guest_email}</span>
                            <span className="text-[11px] text-mutedgray block">{res.guest_phone}</span>
                          </td>
                          <td className="p-4">
                            <div>
                              <span>In: <strong>{res.check_in}</strong></span>
                              <br />
                              <span>Out: <strong>{res.check_out}</strong></span>
                            </div>
                          </td>
                          <td className="p-4">
                            <strong className="text-forest block">{res.room_type?.name}</strong>
                            <span className="text-[11px] text-gold-700 font-semibold">
                              Room: {res.assigned_room_number}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-gold-700">
                            {formatPrice(res.total_amount_cents / 100, res.currency)}
                          </td>
                          <td className="p-4">
                            {canManageReservations ? (
                              <select
                                value={res.status}
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
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="checked_in">Checked In</option>
                                <option value="checked_out">Checked Out</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            ) : (
                              <span className="capitalize font-bold text-mutedgray">
                                {res.status}
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
                      ))}
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
                          Booking Details
                        </span>
                        <h3 className="font-editorial text-2xl font-bold text-forest">
                          {selectedRes.reservation_code}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedRes(null)}
                        className="text-xs uppercase font-semibold text-mutedgray hover:text-charcoal"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-mutedgray block">Guest Name</span>
                        <strong className="text-forest text-sm">{selectedRes.guest_name}</strong>
                      </div>
                      <div>
                        <span className="text-mutedgray block">Contact</span>
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
                        <strong className="block text-forest mb-1">Guest Special Requests:</strong>
                        <p>{selectedRes.special_requests}</p>
                      </div>
                    )}

                    {selectedRes.internal_notes && (
                      <div className="bg-yellow-50/80 p-3 rounded text-xs text-yellow-900 border border-yellow-200">
                        <strong className="block mb-1">Internal Concierge Notes:</strong>
                        <p>{selectedRes.internal_notes}</p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/confirmation/${selectedRes.reservation_code}`}
                        target="_blank"
                        className="text-xs text-forest hover:text-gold uppercase tracking-wider font-semibold underline"
                      >
                        Open Public Confirmation Page ↗
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
                  Physical Inventory & Chamber Status
                </h1>
                <p className="text-xs text-mutedgray">
                  Real-time maintenance and allocation across the Courtyard, Garden, and Rooftop wings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rooms.map((room) => {
                  const roomType = roomTypes.find((rt) => rt.id === room.room_type_id);
                  return (
                    <div
                      key={room.id}
                      className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider text-mutedgray block">
                            Floor {room.floor} • {room.wing}
                          </span>
                          <h3 className="font-editorial text-xl font-bold text-forest">
                            {room.room_number}
                          </h3>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold ${
                            room.status === 'available'
                              ? 'bg-status-success/10 text-status-success'
                              : 'bg-status-warning/10 text-status-warning'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>

                      <div className="text-xs text-charcoal/80">
                        <span className="text-mutedgray block">Assigned Type:</span>
                        <strong className="text-forest">{roomType?.name}</strong>
                      </div>

                      <div className="text-xs text-mutedgray pt-2 border-t border-bordercolor flex justify-between">
                        <span>Base Rate:</span>
                        <strong className="text-gold-700">
                          {roomType ? formatPrice(roomType.base_price_cents / 100, 'EUR') : ''}/nt
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
                  Seasonal Rates & Length of Stay Rules
                </h1>
                <p className="text-xs text-mutedgray">
                  Custom seasonal rate windows, high-season holiday multipliers, and minimum stay requirements.
                </p>
              </div>

              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm overflow-hidden p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-bordercolor pb-3">
                    <h3 className="font-editorial text-lg font-bold text-forest">
                      Active Dynamic Pricing Rules
                    </h3>
                    <span className="text-xs text-status-success font-semibold">
                      Automated Interval Calculation Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-ivory-100 border border-bordercolor">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-editorial text-base font-bold text-forest">
                          Winter Holiday Oasis High Season
                        </h4>
                        <span className="bg-gold/20 text-gold-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          €520 / night
                        </span>
                      </div>
                      <p className="text-xs text-mutedgray mb-2">
                        Window: <strong>Dec 20, 2026 – Jan 05, 2027</strong>
                      </p>
                      <div className="text-[11px] text-charcoal/80 space-y-1">
                        <div>• Applies to: Sultana Royal Courtyard Suite</div>
                        <div>• Minimum stay constraint: 3 nights</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-ivory-100 border border-bordercolor">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-editorial text-base font-bold text-forest">
                          Atlas Winter Starlight Season
                        </h4>
                        <span className="bg-gold/20 text-gold-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          €650 / night
                        </span>
                      </div>
                      <p className="text-xs text-mutedgray mb-2">
                        Window: <strong>Nov 01, 2026 – Dec 31, 2026</strong>
                      </p>
                      <div className="text-[11px] text-charcoal/80 space-y-1">
                        <div>• Applies to: Atlas Panorama Rooftop Suite</div>
                        <div>• Minimum stay constraint: 2 nights</div>
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
                    Le Médina Resto CMS
                  </h1>
                  <p className="text-xs text-mutedgray">
                    Live menu management, availability toggles, and culinary classifications.
                  </p>
                </div>
              </div>

              <div className="bg-ivory rounded-xl border border-bordercolor shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-ivory-200/50 border-b border-bordercolor text-mutedgray uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-4">Dish Name</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Dietary Attributes</th>
                      <th className="p-4">Available</th>
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
                              ★ Chef Signature
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
                            {item.is_available ? 'Available' : 'Sold Out'}
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
                  Site Operations & Concierge Settings
                </h1>
                <p className="text-xs text-mutedgray">
                  Configure live WhatsApp concierge numbers, hotel address, and operational check-in hours.
                </p>
              </div>

              {settingsSuccess && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-status-success text-status-success text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Hotel operational settings updated successfully.</span>
                </div>
              )}

              <div className="bg-ivory rounded-xl p-6 sm:p-8 border border-bordercolor shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Hotel Name
                    </label>
                    <input
                      type="text"
                      value={siteSettings.name}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      WhatsApp Concierge Number (E.164 Format)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.whatsapp}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, whatsapp: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Telephone
                    </label>
                    <input
                      type="text"
                      value={siteSettings.phone}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Concierge Email
                    </label>
                    <input
                      type="email"
                      value={siteSettings.email}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, email: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase font-semibold text-charcoal mb-1">
                      Physical Medina Address
                    </label>
                    <input
                      type="text"
                      value={siteSettings.address}
                      onChange={(e) =>
                        setSiteSettings({ ...siteSettings, address: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-ivory-50 border border-bordercolor"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setSettingsSuccess(true);
                      setTimeout(() => setSettingsSuccess(false), 3000);
                    }}
                    className="px-6 py-2.5 rounded bg-forest hover:bg-forest-900 text-ivory text-xs uppercase tracking-widest font-semibold transition-all shadow"
                  >
                    Save Operational Settings
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
