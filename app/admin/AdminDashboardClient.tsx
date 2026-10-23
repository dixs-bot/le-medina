'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  RoomRate,
} from '../../lib/types';
import { formatDate, formatPrice } from '../../lib/utils';
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
  Plus,
  Pencil,
  ImagePlus,
  Save,
  X,
  Trash2,
  Camera,
  UserCircle,
  UserPlus,
  Activity,
  Download,
  Printer,
} from 'lucide-react';
import type { AdminUser } from '../../lib/auth';

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

type RoomRateKind = 'seasonal' | 'weekend' | 'holiday' | 'custom';

interface RestaurantMenuDraft {
  name: string;
  description: string;
  priceIdr: string;
  categoryName: string;
  imageFile: File | null;
  imagePreviewUrl: string;
  existingImageUrl: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSignature: boolean;
  isAvailable: boolean;
}

function createEmptyRestaurantMenuDraft(): RestaurantMenuDraft {
  return {
    name: '', description: '', priceIdr: '', categoryName: '', imageFile: null,
    imagePreviewUrl: '', existingImageUrl: '', isVegetarian: false,
    isVegan: false, isGlutenFree: false, isSignature: false, isAvailable: true,
  };
}

interface VoucherDraft {
  title: string;
  code: string;
  tagline: string;
  description: string;
  discountPercentage: string;
  validFrom: string;
  validTo: string;
  imageFile: File | null;
  imagePreviewUrl: string;
  existingImageUrl: string;
  isActive: boolean;
}

function createEmptyVoucherDraft(): VoucherDraft {
  return {
    title: '', code: '', tagline: '', description: '', discountPercentage: '10',
    validFrom: getJakartaDateISO(), validTo: getJakartaDateISO(30),
    imageFile: null, imagePreviewUrl: '', existingImageUrl: '', isActive: false,
  };
}


interface RoomRateDraft {
  rate_name: string;
  rate_type: RoomRateKind;
  price_idr: string;
  start_date: string;
  end_date: string;
  min_stay_nights: string;
  days_of_week: number[];
  is_active: boolean;
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


interface ManagedAdminAccount {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  roles: Role[];
  primary_role: Role | null;
  last_login_at: string | null;
  last_activity_at: string | null;
  current_shift: string | null;
  session_state: string;
}

interface AdminAuditEntry {
  id: string;
  actor_user_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

interface RevenuePeriodAmounts {
  currentDate: string;
  currentMonth: string;
  weekStart: string;
  weekEnd: string;
  monthStart: string;
  monthEnd: string;
  dailyIdr: number;
  weeklyIdr: number;
  monthlyIdr: number;
}

interface MonthlyRevenueRow {
  id: string;
  reservation_code: string;
  guest_name: string;
  guest_phone: string;
  adults: number;
  children: number;
  check_in: string;
  check_out: string;
  room_number: string;
  room_type: string;
  status: string;
  payment_status: string;
  payment_method: string;
  source: string;
  total_idr: number;
  paid_this_month_idr: number;
  created_at: string;
}

interface MonthlyRevenueReport {
  month: string;
  revenueIdr: number;
  totalTransactions: number;
  guestCount: number;
  checkIns: number;
  checkOuts: number;
  cancelled: number;
  pending: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  paidTransactions: number;
  unpaidTransactions: number;
  rows: MonthlyRevenueRow[];
}

function humanMonth(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  return new Date(`${month}-01T00:00:00+07:00`).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

function reservationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu Konfirmasi', confirmed: 'Dikonfirmasi',
    checked_in: 'Sudah Check-In', checked_out: 'Sudah Check-Out', cancelled: 'Dibatalkan',
  };
  return labels[status] || status || '—';
}

function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Lunas', unpaid: 'Belum Dibayar', pending: 'Menunggu Pembayaran',
    partially_paid: 'Dibayar Sebagian', failed: 'Gagal', expired: 'Kedaluwarsa', refunded: 'Dikembalikan',
  };
  return labels[status] || status || '—';
}

function escapeReportHtml(value: unknown): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return String(value ?? '').replace(/[&<>"']/g, (char) => entities[char] || char);
}

function formatAdminAuditTime(value?: string | null): string {
  if (!value) return 'Belum ada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });
}

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    login: 'Login admin', logout: 'Logout admin',
    hotel_settings_updated: 'Mengubah pengaturan hotel', admin_profile_updated: 'Memperbarui profil/foto',
    admin_account_created: 'Menambahkan akun admin', admin_account_activated: 'Mengaktifkan akun',
    admin_account_deactivated: 'Menonaktifkan akun', reservation_status_updated: 'Mengubah status reservasi',
    offline_payment_received: 'Mencatat pembayaran', room_created: 'Menambah kamar',
    room_base_price_updated: 'Mengubah harga dasar kamar', room_rate_created: 'Menambah tarif khusus',
    room_rate_updated: 'Mengubah tarif khusus', restaurant_menu_created: 'Menambah menu restoran',
    restaurant_menu_updated: 'Mengubah menu restoran', restaurant_menu_deleted: 'Menghapus menu restoran',
    voucher_created: 'Menambahkan voucher', voucher_updated: 'Mengubah voucher', voucher_deleted: 'Menghapus voucher',
    voucher_activated: 'Mengaktifkan voucher', voucher_deactivated: 'Menonaktifkan voucher',
  };
  return labels[action] || action.replace(/_/g, ' ');
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
    'overview' | 'reservations' | 'rooms' | 'rates' | 'vouchers' | 'menu' | 'settings'
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
  const [revenuePeriods, setRevenuePeriods] = useState<RevenuePeriodAmounts | null>(null);
  const [monthlyRevenueReport, setMonthlyRevenueReport] = useState<MonthlyRevenueReport | null>(null);
  const [revenueReportMonth, setRevenueReportMonth] = useState(getJakartaDateISO().slice(0, 7));
  const [monthlyRevenueOpen, setMonthlyRevenueOpen] = useState(false);
  const [revenueReportLoading, setRevenueReportLoading] = useState(false);
  const [revenueReportError, setRevenueReportError] = useState<string | null>(null);
  const lastSeenRevenueMonth = useRef(getJakartaDateISO().slice(0, 7));
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);

  const loadRevenueReport = useCallback(async (month: string, silent = false) => {
    if (!silent) setRevenueReportLoading(true);
    setRevenueReportError(null);
    try {
      const response = await fetch(`/api/admin/revenue-report?month=${encodeURIComponent(month)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.periods || !payload?.report) {
        throw new Error(payload?.error || `Gagal memuat laporan pendapatan (HTTP ${response.status}).`);
      }
      setRevenuePeriods(payload.periods as RevenuePeriodAmounts);
      setMonthlyRevenueReport(payload.report as MonthlyRevenueReport);
      const serverMonth = String(payload.periods.currentMonth || '');
      // Amounts are derived from payment timestamps, so a new WIB day/week/month
      // automatically starts at zero without deleting accounting history.
      if (/^\d{4}-\d{2}$/.test(serverMonth) && serverMonth !== lastSeenRevenueMonth.current) {
        lastSeenRevenueMonth.current = serverMonth;
        setRevenueReportMonth(serverMonth);
      }
    } catch (error) {
      setRevenueReportError(error instanceof Error ? error.message : 'Gagal memuat laporan pendapatan.');
    } finally {
      if (!silent) setRevenueReportLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRevenueReport(revenueReportMonth);
    // Polling makes the visible period totals switch after midnight in Asia/Jakarta,
    // and also refreshes payment figures without requiring a full page reload.
    const timer = window.setInterval(() => {
      const liveMonth = getJakartaDateISO().slice(0, 7);
      if (liveMonth !== lastSeenRevenueMonth.current) {
        lastSeenRevenueMonth.current = liveMonth;
        setRevenueReportMonth(liveMonth);
        void loadRevenueReport(liveMonth, true);
        return;
      }
      void loadRevenueReport(revenueReportMonth, true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadRevenueReport, revenueReportMonth]);

  const downloadMonthlyRevenueCsv = () => {
    if (!monthlyRevenueReport) return;
    const report = monthlyRevenueReport;
    const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows: unknown[][] = [
      ['LAPORAN TRANSAKSI BULANAN HÔTEL LE MÉDINA'],
      ['Periode', humanMonth(report.month)],
      ['Pendapatan pembayaran lunas pada bulan ini (IDR)', report.revenueIdr],
      ['Total reservasi dalam laporan', report.totalTransactions],
      ['Jumlah tamu (tidak termasuk reservasi batal)', report.guestCount],
      ['Check-in tercatat pada bulan ini', report.checkIns],
      ['Check-out tercatat pada bulan ini', report.checkOuts],
      ['Reservasi dibatalkan', report.cancelled],
      ['Reservasi menunggu konfirmasi', report.pending],
      ['Reservasi dikonfirmasi', report.confirmed],
      ['Reservasi sudah check-in (status saat ini)', report.checkedIn],
      ['Reservasi sudah check-out (status saat ini)', report.checkedOut],
      ['Reservasi lunas', report.paidTransactions],
      ['Reservasi belum lunas/sebagian', report.unpaidTransactions],
      [],
      ['Kode Reservasi', 'Dibuat Pada', 'Nama Tamu', 'Nomor Telepon', 'Dewasa', 'Anak', 'Check-In', 'Check-Out', 'Nomor Kamar', 'Tipe Kamar', 'Status Reservasi', 'Status Pembayaran', 'Metode Pembayaran', 'Sumber', 'Total Reservasi (IDR)', 'Pembayaran Lunas Bulan Ini (IDR)'],
      ...report.rows.map((item) => [
        item.reservation_code, item.created_at, item.guest_name, item.guest_phone,
        item.adults, item.children, item.check_in, item.check_out, item.room_number,
        item.room_type, reservationStatusLabel(item.status), paymentStatusLabel(item.payment_status),
        item.payment_method, item.source, item.total_idr, item.paid_this_month_idr,
      ]),
    ];
    const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `le-medina-laporan-transaksi-${report.month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printMonthlyRevenueReport = () => {
    if (!monthlyRevenueReport) return;
    const report = monthlyRevenueReport;
    const printWindow = window.open('', '_blank', 'width=1200,height=850');
    if (!printWindow) {
      setRevenueReportError('Jendela cetak diblokir browser. Izinkan pop-up untuk membuka pratinjau PDF.');
      return;
    }
    const bodyRows = report.rows.map((item) => `<tr>
      <td>${escapeReportHtml(item.reservation_code)}</td><td>${escapeReportHtml(item.guest_name)}</td>
      <td>${escapeReportHtml(item.check_in)} – ${escapeReportHtml(item.check_out)}</td>
      <td>${escapeReportHtml(item.room_number)}</td><td>${escapeReportHtml(reservationStatusLabel(item.status))}</td>
      <td>${escapeReportHtml(paymentStatusLabel(item.payment_status))}</td>
      <td style="text-align:right">${Math.round(item.total_idr).toLocaleString('id-ID')}</td>
      <td style="text-align:right">${Math.round(item.paid_this_month_idr).toLocaleString('id-ID')}</td></tr>`).join('');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan Hôtel Le Médina ${escapeReportHtml(report.month)}</title><style>
      body{font:12px Arial,sans-serif;color:#172a23;padding:24px}h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:24px 0 8px}.sub{color:#666;margin-bottom:18px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.stats div{border:1px solid #ccc;padding:10px}.stats strong{display:block;font-size:16px;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:7px 6px;border:1px solid #ccc;text-align:left;vertical-align:top}th{background:#eee;font-size:10px;text-transform:uppercase}td{font-size:10px}@media print{body{padding:0}button{display:none}}
      </style></head><body><h1>Laporan Transaksi Bulanan — Hôtel Le Médina</h1><div class="sub">Periode: ${escapeReportHtml(humanMonth(report.month))} • Dibuat ${escapeReportHtml(new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}))} WIB</div>
      <div class="stats"><div>Pendapatan lunas bulan ini<strong>Rp ${Math.round(report.revenueIdr).toLocaleString('id-ID')}</strong></div><div>Total transaksi reservasi<strong>${report.totalTransactions}</strong></div><div>Check-in / Check-out<strong>${report.checkIns} / ${report.checkOuts}</strong></div><div>Reservasi dibatalkan<strong>${report.cancelled}</strong></div><div>Jumlah tamu non-batal<strong>${report.guestCount}</strong></div><div>Menunggu konfirmasi<strong>${report.pending}</strong></div><div>Dikonfirmasi<strong>${report.confirmed}</strong></div><div>Lunas / belum lunas<strong>${report.paidTransactions} / ${report.unpaidTransactions}</strong></div></div>
      <h2>Daftar transaksi dan status reservasi</h2><table><thead><tr><th>Kode</th><th>Nama tamu</th><th>Periode inap</th><th>Kamar</th><th>Status reservasi</th><th>Pembayaran</th><th>Total (Rp)</th><th>Lunas bulan ini (Rp)</th></tr></thead><tbody>${bodyRows || '<tr><td colspan="8">Tidak ada transaksi pada periode ini.</td></tr>'}</tbody></table><script>window.onload=()=>{window.focus();window.print();};</script></body></html>`);
    printWindow.document.close();
  };
  const [updatingPaymentCode, setUpdatingPaymentCode] = useState<string | null>(null);
  const [resCari, setResCari] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  // Restaurant CMS data is refreshed from Supabase when the tab opens and after each mutation.
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>(initialMenuItems);
  const [menuCategories, setMenuCategories] = useState<RestaurantCategory[]>(categories);
  const [menuEditorOpen, setMenuEditorOpen] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuDraft, setMenuDraft] = useState<RestaurantMenuDraft>(createEmptyRestaurantMenuDraft);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuAvailabilityUpdatingId, setMenuAvailabilityUpdatingId] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuMessage, setMenuMessage] = useState<string | null>(null);

  // Voucher CMS reads all active/inactive voucher records directly from Supabase.
  const [managedVouchers, setManagedVouchers] = useState<Offer[]>(offers);
  const [voucherEditorOpen, setVoucherEditorOpen] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [voucherDraft, setVoucherDraft] = useState<VoucherDraft>(createEmptyVoucherDraft);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherSaving, setVoucherSaving] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);
  const [voucherDeletingId, setVoucherDeletingId] = useState<string | null>(null);

  // Site settings state
  const [sitePengaturan, setSitePengaturan] = useState<SitePengaturan>(initialSitePengaturan);
  const [settingsSuccess, setPengaturanSuccess] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [displayAdminName, setDisplayAdminName] = useState(currentUser?.name || 'Admin Hotel');
  const [adminProfileName, setAdminProfileName] = useState(currentUser?.name || '');
  const [adminProfilePhone, setAdminProfilePhone] = useState('');
  const [adminProfileAvatar, setAdminProfileAvatar] = useState(currentUser?.avatarUrl || '');
  const [adminProfileFile, setAdminProfileFile] = useState<File | null>(null);
  const [adminProfileLoading, setAdminProfileLoading] = useState(false);
  const [adminProfileSaving, setAdminProfileSaving] = useState(false);
  const [adminProfileError, setAdminProfileError] = useState<string | null>(null);
  const [adminProfileMessage, setAdminProfileMessage] = useState<string | null>(null);
  const [managedAdminAccounts, setManagedAdminAccounts] = useState<ManagedAdminAccount[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditEntry[]>([]);
  const [adminAccountsLoading, setAdminAccountsLoading] = useState(false);
  const [adminAccountsError, setAdminAccountsError] = useState<string | null>(null);
  const [adminAccountsMessage, setAdminAccountsMessage] = useState<string | null>(null);
  const [adminAccountSaving, setAdminAccountSaving] = useState(false);
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<Role>('admin');

  const handleSaveSiteSettings = async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    setPengaturanSuccess(false);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sitePengaturan),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.settings) throw new Error(payload?.error || 'Pengaturan gagal disimpan ke Supabase.');
      setSitePengaturan(payload.settings as SitePengaturan);
      setPengaturanSuccess(true);
      setTimeout(() => setPengaturanSuccess(false), 5000);
      router.refresh();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Pengaturan gagal disimpan.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const loadAdminProfile = useCallback(async () => {
    setAdminProfileLoading(true);
    setAdminProfileError(null);
    try {
      const response = await fetch('/api/admin/profile', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.profile) throw new Error(payload?.error || 'Gagal membaca profil admin.');
      setAdminProfileName(payload.profile.full_name || currentUser?.name || '');
      setDisplayAdminName(payload.profile.full_name || currentUser?.name || 'Admin Hotel');
      setAdminProfilePhone(payload.profile.phone || '');
      setAdminProfileAvatar(payload.profile.avatar_url || '');
    } catch (error) {
      setAdminProfileError(error instanceof Error ? error.message : 'Gagal membaca profil admin.');
    } finally {
      setAdminProfileLoading(false);
    }
  }, [currentUser?.name]);

  const saveAdminProfile = async () => {
    setAdminProfileSaving(true);
    setAdminProfileError(null);
    setAdminProfileMessage(null);
    try {
      const form = new FormData();
      form.set('full_name', adminProfileName);
      form.set('phone', adminProfilePhone);
      if (adminProfileFile) form.set('avatar', adminProfileFile);
      const response = await fetch('/api/admin/profile', { method: 'PUT', body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.profile) throw new Error(payload?.error || 'Profil admin gagal disimpan.');
      setAdminProfileName(payload.profile.full_name);
      setDisplayAdminName(payload.profile.full_name);
      setAdminProfilePhone(payload.profile.phone || '');
      setAdminProfileAvatar(payload.profile.avatar_url || '');
      setAdminProfileFile(null);
      setAdminProfileMessage('Profil dan foto admin berhasil disimpan.');
      router.refresh();
    } catch (error) {
      setAdminProfileError(error instanceof Error ? error.message : 'Profil admin gagal disimpan.');
    } finally {
      setAdminProfileSaving(false);
    }
  };

  const loadAdminAccountsAndAudit = useCallback(async () => {
    if (currentUser?.role !== 'super_admin') return;
    setAdminAccountsLoading(true);
    setAdminAccountsError(null);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Gagal membaca daftar akun admin.');
      setManagedAdminAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
      setAdminAuditLogs(Array.isArray(payload?.audit) ? payload.audit : []);
    } catch (error) {
      setAdminAccountsError(error instanceof Error ? error.message : 'Gagal membaca daftar akun admin.');
    } finally {
      setAdminAccountsLoading(false);
    }
  }, [currentUser?.role]);

  const createAdminAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminAccountSaving(true);
    setAdminAccountsError(null);
    setAdminAccountsMessage(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newAdminFullName, email: newAdminEmail, password: newAdminPassword, role: newAdminRole }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Akun admin gagal dibuat.');
      setNewAdminFullName(''); setNewAdminEmail(''); setNewAdminPassword(''); setNewAdminRole('admin');
      setAdminAccountsMessage('Akun staf berhasil dibuat. Sampaikan email dan kata sandi awal secara aman kepada staf terkait.');
      await loadAdminAccountsAndAudit();
    } catch (error) {
      setAdminAccountsError(error instanceof Error ? error.message : 'Akun admin gagal dibuat.');
    } finally {
      setAdminAccountSaving(false);
    }
  };

  const toggleAdminAccount = async (account: ManagedAdminAccount) => {
    if (!account.auth_user_id) return;
    setAdminAccountsError(null); setAdminAccountsMessage(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: account.auth_user_id, is_active: !account.is_active }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Status akun gagal diubah.');
      setAdminAccountsMessage(account.is_active ? 'Akun staf dinonaktifkan. Akses API ditolak setelah perubahan ini.' : 'Akun staf diaktifkan kembali.');
      await loadAdminAccountsAndAudit();
    } catch (error) {
      setAdminAccountsError(error instanceof Error ? error.message : 'Status akun gagal diubah.');
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      void loadAdminProfile();
      if (currentUser?.role === 'super_admin' && currentRole === 'super_admin') void loadAdminAccountsAndAudit();
    }
  }, [activeTab, currentRole, currentUser?.role, loadAdminProfile, loadAdminAccountsAndAudit]);

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


  // Live Supabase room / pricing administration. These values are loaded from the
  // configured production database; the old hard-coded Winter demo cards are not used.
  const [managedRoomTypes, setManagedRoomTypes] = useState<RoomType[]>(roomTypes);
  const [managedRooms, setManagedRooms] = useState<Room[]>(rooms);
  const [managedRoomRates, setManagedRoomRates] = useState<RoomRate[]>([]);
  const [showInactiveRates, setShowInactiveRates] = useState(false);
  const [roomManagementLoading, setRoomManagementLoading] = useState(false);
  const [roomManagementSaving, setRoomManagementSaving] = useState(false);
  const [roomManagementError, setRoomManagementError] = useState<string | null>(null);
  const [roomManagementMessage, setRoomManagementMessage] = useState<string | null>(null);
  const [basePriceDrafts, setBasePriceDrafts] = useState<Record<string, string>>({});
  const [rateDrafts, setRateDrafts] = useState<Record<string, RoomRateDraft>>({});

  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState(roomTypes.find((item) => item.is_active)?.id || '');
  const [newRoomFloor, setNewRoomFloor] = useState('1');
  const [newRoomWing, setNewRoomWing] = useState('Sayap Utama');

  const [newRateName, setNewRateName] = useState('Tarif Akhir Pekan');
  const [newRateType, setNewRateType] = useState<RoomRateKind>('weekend');
  const [newRateRoomTypeId, setNewRateRoomTypeId] = useState(roomTypes.find((item) => item.is_active)?.id || '');
  const [newRatePriceIdr, setNewRatePriceIdr] = useState('');
  const [newRateStartDate, setNewRateStartDate] = useState(getJakartaDateISO());
  const [newRateEndDate, setNewRateEndDate] = useState(getJakartaDateISO(365));
  const [newRateMinStay, setNewRateMinStay] = useState('1');
  const [newRateDaysOfWeek, setNewRateDaysOfWeek] = useState<number[]>([6, 7]);

  const reloadRoomManagement = useCallback(async () => {
    setRoomManagementLoading(true);
    setRoomManagementError(null);
    try {
      const response = await fetch('/api/admin/room-management', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Gagal membaca data kamar dan tarif dari Supabase.');

      const nextTypes = (Array.isArray(payload?.roomTypes) ? payload.roomTypes : []) as RoomType[];
      const nextRooms = (Array.isArray(payload?.rooms) ? payload.rooms : []) as Room[];
      const nextRates = (Array.isArray(payload?.rates) ? payload.rates : []) as RoomRate[];
      setManagedRoomTypes(nextTypes);
      setManagedRooms(nextRooms);
      setManagedRoomRates(nextRates);
      setBasePriceDrafts(Object.fromEntries(nextTypes.map((type) => [
        type.id, String(Math.round(Number(type.base_price_cents || 0) / 100)),
      ])));
      setRateDrafts(Object.fromEntries(nextRates.map((rate) => [rate.id, {
        rate_name: rate.rate_name || '',
        rate_type: rate.rate_type || 'seasonal',
        price_idr: String(Math.round(Number(rate.price_cents || 0) / 100)),
        start_date: String(rate.start_date || ''),
        end_date: String(rate.end_date || ''),
        min_stay_nights: String(rate.min_stay_nights || 1),
        days_of_week: Array.isArray(rate.days_of_week) ? rate.days_of_week.map(Number) : [],
        is_active: Boolean(rate.is_active),
      }])));
      setNewRoomTypeId((previous) => nextTypes.some((type) => type.id === previous && type.is_active)
        ? previous : (nextTypes.find((type) => type.is_active)?.id || ''));
      setNewRateRoomTypeId((previous) => nextTypes.some((type) => type.id === previous && type.is_active)
        ? previous : (nextTypes.find((type) => type.is_active)?.id || ''));
    } catch (error) {
      setRoomManagementError(error instanceof Error ? error.message : 'Gagal memuat data manajemen kamar.');
    } finally {
      setRoomManagementLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'rooms' || activeTab === 'rates') void reloadRoomManagement();
  }, [activeTab, reloadRoomManagement]);

  const submitRoomManagement = async (body: Record<string, unknown>, successText: string): Promise<boolean> => {
    if (roomManagementSaving) return false;
    setRoomManagementSaving(true);
    setRoomManagementError(null);
    setRoomManagementMessage(null);
    try {
      const response = await fetch('/api/admin/room-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Perubahan gagal disimpan (HTTP ${response.status}).`);
      }
      setRoomManagementMessage(successText);
      await reloadRoomManagement();
      router.refresh();
      return true;
    } catch (error) {
      setRoomManagementError(error instanceof Error ? error.message : 'Perubahan gagal disimpan ke Supabase.');
      return false;
    } finally {
      setRoomManagementSaving(false);
    }
  };

  const handleAddPhysicalRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await submitRoomManagement({
      action: 'create_room', room_number: newRoomNumber, room_type_id: newRoomTypeId,
      floor: Number(newRoomFloor), wing: newRoomWing,
    }, `Kamar ${newRoomNumber.trim().toUpperCase()} berhasil ditambahkan ke inventaris Supabase.`);
    if (saved) setNewRoomNumber('');
  };

  const handleSaveBasePrice = async (roomType: RoomType) => {
    await submitRoomManagement({
      action: 'update_base_price', room_type_id: roomType.id, price_idr: Number(basePriceDrafts[roomType.id]),
    }, `Harga dasar ${roomType.name} berhasil diperbarui di Supabase.`);
  };

  const handleAddRateRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await submitRoomManagement({
      action: 'create_rate', room_type_id: newRateRoomTypeId, rate_name: newRateName,
      rate_type: newRateType, price_idr: Number(newRatePriceIdr), start_date: newRateStartDate,
      end_date: newRateEndDate, min_stay_nights: Number(newRateMinStay),
      days_of_week: newRateType === 'weekend' ? newRateDaysOfWeek : [],
    }, 'Aturan tarif berhasil ditambahkan. Harga pada website akan mengikuti aturan Supabase.');
    if (saved) setNewRatePriceIdr('');
  };

  const updateRateDraft = (rateId: string, patch: Partial<RoomRateDraft>) => {
    setRateDrafts((previous) => ({
      ...previous,
      [rateId]: { ...previous[rateId], ...patch },
    }));
  };

  const handleSaveRateRule = async (rateId: string) => {
    const draft = rateDrafts[rateId];
    if (!draft) return;
    await submitRoomManagement({ action: 'update_rate', id: rateId, ...draft, price_idr: Number(draft.price_idr), min_stay_nights: Number(draft.min_stay_nights) }, 'Aturan tarif berhasil diperbarui di Supabase.');
  };

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

  const reloadRestaurantMenu = useCallback(async () => {
    setMenuError(null);
    try {
      const response = await fetch('/api/admin/restaurant-menu', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Gagal membaca menu restoran dari Supabase.');
      setMenuItems(Array.isArray(payload?.items) ? payload.items as RestaurantMenuItem[] : []);
      setMenuCategories(Array.isArray(payload?.categories) ? payload.categories as RestaurantCategory[] : []);
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : 'Gagal membaca menu restoran dari Supabase.');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'menu') void reloadRestaurantMenu();
  }, [activeTab, reloadRestaurantMenu]);

  const openNewMenuEditor = () => {
    setEditingMenuId(null);
    setMenuDraft(createEmptyRestaurantMenuDraft());
    setMenuError(null);
    setMenuMessage(null);
    setMenuEditorOpen(true);
  };

  const openEditMenuEditor = (item: RestaurantMenuItem) => {
    const category = menuCategories.find((candidate) => candidate.id === item.category_id);
    setEditingMenuId(item.id);
    setMenuDraft({
      name: item.name || '',
      description: item.description || '',
      priceIdr: String(Math.round(Number(item.price_cents || 0) / 100)),
      categoryName: category?.name || '',
      imageFile: null,
      imagePreviewUrl: '',
      existingImageUrl: item.image_url || '',
      isVegetarian: Boolean(item.is_vegetarian),
      isVegan: Boolean(item.is_vegan),
      isGlutenFree: Boolean(item.is_gluten_free),
      isSignature: Boolean(item.is_signature),
      isAvailable: Boolean(item.is_available),
    });
    setMenuError(null);
    setMenuMessage(null);
    setMenuEditorOpen(true);
  };

  const toggleMenuAvailability = async (itemId: string) => {
    const current = menuItems.find((item) => item.id === itemId);
    if (!current || menuAvailabilityUpdatingId) return;
    setMenuAvailabilityUpdatingId(itemId);
    setMenuError(null);
    setMenuMessage(null);
    try {
      const response = await fetch('/api/admin/restaurant-menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id: itemId, is_available: !current.is_available }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || 'Status menu gagal disimpan.');
      }
      setMenuItems((previous) => previous.map((item) => item.id === itemId ? payload.item as RestaurantMenuItem : item));
      setMenuMessage(`Status menu ${current.name} berhasil diperbarui di Supabase.`);
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : 'Status menu gagal disimpan ke Supabase.');
    } finally {
      setMenuAvailabilityUpdatingId(null);
    }
  };

  const handleSaveRestaurantMenu = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (menuSaving) return;
    setMenuSaving(true);
    setMenuError(null);
    setMenuMessage(null);
    try {
      const form = new FormData();
      form.set('name', menuDraft.name);
      form.set('description', menuDraft.description);
      form.set('price_idr', menuDraft.priceIdr);
      form.set('category_name', menuDraft.categoryName);
      form.set('existing_image_url', menuDraft.existingImageUrl);
      form.set('is_vegetarian', String(menuDraft.isVegetarian));
      form.set('is_vegan', String(menuDraft.isVegan));
      form.set('is_gluten_free', String(menuDraft.isGlutenFree));
      form.set('is_signature', String(menuDraft.isSignature));
      form.set('is_available', String(menuDraft.isAvailable));
      if (menuDraft.imageFile) form.set('image', menuDraft.imageFile);
      if (editingMenuId) form.set('id', editingMenuId);

      const response = await fetch('/api/admin/restaurant-menu', {
        method: editingMenuId ? 'PATCH' : 'POST',
        body: form,
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Menu gagal disimpan (HTTP ${response.status}).`);
      }
      const savedName = String(payload.item?.name || menuDraft.name);
      setMenuMessage(`Menu ${savedName} berhasil disimpan ke Supabase.`);
      setMenuEditorOpen(false);
      setMenuDraft(createEmptyRestaurantMenuDraft());
      await reloadRestaurantMenu();
      router.refresh();
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : 'Menu gagal disimpan ke Supabase.');
    } finally {
      setMenuSaving(false);
    }
  };

  const handleDeleteRestaurantMenu = async (item: RestaurantMenuItem) => {
    if (!window.confirm(`Hapus menu “${item.name}” dari Supabase?`)) return;
    setMenuError(null);
    setMenuMessage(null);
    try {
      const response = await fetch(`/api/admin/restaurant-menu?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE', cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) throw new Error(payload?.error || 'Menu gagal dihapus.');
      await reloadRestaurantMenu();
      setMenuMessage(`Menu ${item.name} berhasil dihapus dari Supabase.`);
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : 'Menu gagal dihapus dari Supabase.');
    }
  };

  const reloadVouchers = useCallback(async () => {
    setVoucherLoading(true);
    setVoucherError(null);
    try {
      const response = await fetch('/api/admin/vouchers', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Gagal membaca daftar voucher dari Supabase.');
      setManagedVouchers(Array.isArray(payload?.vouchers) ? payload.vouchers as Offer[] : []);
    } catch (error) {
      setVoucherError(error instanceof Error ? error.message : 'Daftar voucher gagal dimuat.');
    } finally {
      setVoucherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'vouchers') void reloadVouchers();
  }, [activeTab, reloadVouchers]);

  const openNewVoucherEditor = () => {
    setEditingVoucherId(null);
    setVoucherDraft(createEmptyVoucherDraft());
    setVoucherError(null);
    setVoucherMessage(null);
    setVoucherEditorOpen(true);
  };

  const openEditVoucherEditor = (voucher: Offer) => {
    setEditingVoucherId(voucher.id);
    setVoucherDraft({
      title: voucher.title || '',
      code: (voucher.code || '').toUpperCase(),
      tagline: voucher.tagline || '',
      description: voucher.description || '',
      discountPercentage: String(voucher.discount_percentage || 1),
      validFrom: voucher.valid_from || getJakartaDateISO(),
      validTo: voucher.valid_to || getJakartaDateISO(30),
      imageFile: null,
      imagePreviewUrl: '',
      existingImageUrl: voucher.image_url || '',
      isActive: Boolean(voucher.is_active),
    });
    setVoucherError(null);
    setVoucherMessage(null);
    setVoucherEditorOpen(true);
  };

  const handleSaveVoucher = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (voucherSaving) return;
    setVoucherSaving(true);
    setVoucherError(null);
    setVoucherMessage(null);
    try {
      const form = new FormData();
      form.set('title', voucherDraft.title);
      form.set('code', voucherDraft.code.toUpperCase().trim());
      form.set('tagline', voucherDraft.tagline);
      form.set('description', voucherDraft.description);
      form.set('discount_percentage', voucherDraft.discountPercentage);
      form.set('valid_from', voucherDraft.validFrom);
      form.set('valid_to', voucherDraft.validTo);
      form.set('is_active', String(voucherDraft.isActive));
      if (voucherDraft.imageFile) form.set('image', voucherDraft.imageFile);
      if (editingVoucherId) form.set('id', editingVoucherId);

      const response = await fetch('/api/admin/vouchers', {
        method: editingVoucherId ? 'PATCH' : 'POST',
        body: form,
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Voucher gagal disimpan (HTTP ${response.status}).`);
      }
      const savedVoucher = payload.voucher as Offer;
      setVoucherMessage(`Voucher ${savedVoucher.code} berhasil disimpan ke Supabase.`);
      setVoucherEditorOpen(false);
      setVoucherDraft(createEmptyVoucherDraft());
      await reloadVouchers();
      router.refresh();
    } catch (error) {
      setVoucherError(error instanceof Error ? error.message : 'Voucher gagal disimpan ke Supabase.');
    } finally {
      setVoucherSaving(false);
    }
  };

  const toggleVoucherActive = async (voucher: Offer) => {
    setVoucherError(null);
    setVoucherMessage(null);
    try {
      const response = await fetch('/api/admin/vouchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id: voucher.id, is_active: !voucher.is_active }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) throw new Error(payload?.error || 'Status voucher gagal diperbarui.');
      setManagedVouchers((previous) => previous.map((item) => item.id === voucher.id ? payload.voucher as Offer : item));
      setVoucherMessage(`Voucher ${voucher.code} ${!voucher.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
      router.refresh();
    } catch (error) {
      setVoucherError(error instanceof Error ? error.message : 'Status voucher gagal diperbarui.');
    }
  };

  const handleDeleteVoucher = async (voucher: Offer) => {
    if (!window.confirm(`Hapus voucher ${voucher.code} (${voucher.title})? Kode ini tidak akan dapat dipakai lagi setelah dihapus.`)) return;
    setVoucherDeletingId(voucher.id);
    setVoucherError(null);
    setVoucherMessage(null);
    try {
      const response = await fetch(`/api/admin/vouchers?id=${encodeURIComponent(voucher.id)}`, { method: 'DELETE', cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) throw new Error(payload?.error || 'Voucher gagal dihapus.');
      setManagedVouchers((previous) => previous.filter((item) => item.id !== voucher.id));
      setVoucherMessage(`Voucher ${voucher.code} berhasil dihapus.`);
      router.refresh();
    } catch (error) {
      setVoucherError(error instanceof Error ? error.message : 'Voucher gagal dihapus.');
    } finally {
      setVoucherDeletingId(null);
    }
  };

  // Role permissions helpers
  const canManageReservasi =
    currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'reservation_staff';
  const canManageContent =
    currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'content_editor';
  const canManageRoomCatalog = currentRole === 'super_admin' || currentRole === 'admin';

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
            <div className="flex items-center gap-2.5">
              {adminProfileAvatar ? (
                <img src={adminProfileAvatar} alt={`Foto ${displayAdminName}`} className="h-9 w-9 rounded-full border-2 border-gold/70 object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 bg-forest-800 text-gold-300"><UserCircle className="h-5 w-5" /></div>
              )}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-ivory leading-tight">{displayAdminName || currentUser.name}</span>
                <span className="text-[10px] text-ivory-300 leading-tight">{currentUser.email}</span>
              </div>
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
              onClick={() => setActiveTab('vouchers')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === 'vouchers'
                  ? 'bg-gold text-charcoal font-bold shadow'
                  : 'text-ivory-200 hover:bg-forest-800'
              }`}
            >
              <Percent className="w-4 h-4" />
              <span>Voucher & Promo</span>
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
                    Dari total {managedRooms.length} unit kamar hotel
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

              {/* Revenue is grouped by Jakarta calendar periods; no historic rows are deleted. */}
              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                  <div>
                    <h2 className="font-editorial text-xl font-bold text-forest">Pendapatan Berdasarkan Periode</h2>
                    <p className="mt-1 text-xs text-mutedgray">Dihitung dari pembayaran berstatus lunas berdasarkan waktu pembayaran WIB. Nilai periode berganti otomatis tanpa menghapus histori.</p>
                  </div>
                  <span className="text-[11px] text-mutedgray">{revenuePeriods ? `Tanggal WIB: ${revenuePeriods.currentDate}` : 'Memuat periode pendapatan...'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-bordercolor bg-ivory p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">Pendapatan Hari Ini</span><TrendingUp className="h-4 w-4 text-emerald-700" /></div>
                    <div className="mt-3 font-editorial text-2xl font-bold text-forest">{revenuePeriods ? formatPrice(revenuePeriods.dailyIdr, 'IDR') : '—'}</div>
                    <p className="mt-1 text-[11px] text-mutedgray">Dari pukul 00.00 sampai 23.59 WIB hari ini.</p>
                  </div>
                  <div className="rounded-xl border border-bordercolor bg-ivory p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">Pendapatan Minggu Ini</span><TrendingUp className="h-4 w-4 text-emerald-700" /></div>
                    <div className="mt-3 font-editorial text-2xl font-bold text-forest">{revenuePeriods ? formatPrice(revenuePeriods.weeklyIdr, 'IDR') : '—'}</div>
                    <p className="mt-1 text-[11px] text-mutedgray">{revenuePeriods ? `${revenuePeriods.weekStart} s.d. ${revenuePeriods.weekEnd} (Senin–Minggu)` : 'Periode Senin–Minggu WIB.'}</p>
                  </div>
                  <button type="button" onClick={() => { const month = getJakartaDateISO().slice(0, 7); setRevenueReportMonth(month); setMonthlyRevenueOpen(true); setRevenueReportError(null); void loadRevenueReport(month); }} className="rounded-xl border border-gold/60 bg-ivory p-5 text-left shadow-sm transition-colors hover:bg-gold/10 focus:outline-none focus:ring-2 focus:ring-gold">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-mutedgray">Pendapatan Bulan Ini</span><CalendarCheck className="h-4 w-4 text-gold-700" /></div>
                    <div className="mt-3 font-editorial text-2xl font-bold text-forest">{revenuePeriods ? formatPrice(revenuePeriods.monthlyIdr, 'IDR') : '—'}</div>
                    <p className="mt-1 text-[11px] text-mutedgray">{revenuePeriods ? `${revenuePeriods.monthStart} s.d. ${revenuePeriods.monthEnd}` : 'Periode tanggal 1 sampai akhir bulan.'}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-700"><Download className="h-3.5 w-3.5" /> Buka laporan & unduh</span>
                  </button>
                </div>
              </section>

              {monthlyRevenueOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="monthly-revenue-title">
                  <section className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-bordercolor bg-ivory shadow-2xl">
                    <header className="flex flex-col gap-3 border-b border-bordercolor bg-forest-950 p-4 text-ivory sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div><h2 id="monthly-revenue-title" className="font-editorial text-xl font-bold sm:text-2xl">Laporan Transaksi Bulanan</h2><p className="mt-1 text-xs text-ivory/70">Ringkasan pendapatan, tamu masuk/keluar, pembatalan, dan status pembayaran.</p></div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold" htmlFor="revenue-report-month">Periode</label>
                        <input id="revenue-report-month" type="month" value={revenueReportMonth} onChange={(event) => { setMonthlyRevenueReport(null); setRevenueReportMonth(event.target.value); }} className="rounded-lg border border-white/20 bg-white px-2.5 py-2 text-xs text-charcoal" />
                        <button type="button" aria-label="Tutup laporan" onClick={() => setMonthlyRevenueOpen(false)} className="rounded-lg border border-white/20 p-2 hover:bg-white/10"><X className="h-4 w-4" /></button>
                      </div>
                    </header>
                    <div className="overflow-y-auto p-4 sm:p-6">
                      {revenueReportError && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{revenueReportError}</div>}
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div><h3 className="font-editorial text-lg font-bold text-forest">{humanMonth(revenueReportMonth)}</h3><p className="text-[11px] text-mutedgray">Pendapatan adalah pembayaran lunas berdasarkan waktu diterima; laporan reservasi memuat semua status terkait periode.</p></div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={!monthlyRevenueReport || revenueReportLoading} onClick={downloadMonthlyRevenueCsv} className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-3 py-2 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50"><Download className="h-4 w-4" /> Unduh CSV / Excel</button>
                          <button type="button" disabled={!monthlyRevenueReport || revenueReportLoading} onClick={printMonthlyRevenueReport} className="inline-flex items-center gap-2 rounded-lg border border-bordercolor bg-white px-3 py-2 text-xs font-bold text-forest hover:bg-ivory-100 disabled:opacity-50"><Printer className="h-4 w-4" /> Cetak / Simpan PDF</button>
                        </div>
                      </div>
                      {revenueReportLoading && !monthlyRevenueReport ? <div className="py-12 text-center text-sm text-mutedgray"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Memuat laporan dari Supabase...</div> : monthlyRevenueReport ? (
                        <>
                          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                            {[
                              ['Pendapatan lunas', formatPrice(monthlyRevenueReport.revenueIdr, 'IDR')],
                              ['Total reservasi', String(monthlyRevenueReport.totalTransactions)],
                              ['Jumlah tamu', String(monthlyRevenueReport.guestCount)],
                              ['Check-in', String(monthlyRevenueReport.checkIns)],
                              ['Check-out', String(monthlyRevenueReport.checkOuts)],
                              ['Dibatalkan', String(monthlyRevenueReport.cancelled)],
                              ['Lunas', String(monthlyRevenueReport.paidTransactions)],
                              ['Belum lunas', String(monthlyRevenueReport.unpaidTransactions)],
                            ].map(([label, value]) => <div key={label} className="rounded-lg border border-bordercolor bg-white p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-mutedgray">{label}</div><div className="mt-1 break-words font-editorial text-lg font-bold text-forest">{value}</div></div>)}
                          </div>
                          <div className="mb-4 flex flex-wrap gap-2 text-[10px] text-mutedgray"><span className="rounded bg-amber-50 px-2 py-1">Menunggu konfirmasi: {monthlyRevenueReport.pending}</span><span className="rounded bg-emerald-50 px-2 py-1">Dikonfirmasi: {monthlyRevenueReport.confirmed}</span><span className="rounded bg-sky-50 px-2 py-1">Sedang menginap: {monthlyRevenueReport.checkedIn}</span><span className="rounded bg-stone-200 px-2 py-1">Sudah check-out: {monthlyRevenueReport.checkedOut}</span></div>
                          <div className="overflow-x-auto rounded-xl border border-bordercolor bg-white">
                            <table className="w-full min-w-[1120px] text-left text-[11px]">
                              <thead className="bg-ivory-200/70 text-[10px] uppercase tracking-wide text-mutedgray"><tr><th className="p-3">Kode / Dibuat</th><th className="p-3">Tamu</th><th className="p-3">Periode inap</th><th className="p-3">Kamar</th><th className="p-3">Status reservasi</th><th className="p-3">Pembayaran</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Lunas bulan ini</th></tr></thead>
                              <tbody className="divide-y divide-bordercolor/70">{monthlyRevenueReport.rows.length ? monthlyRevenueReport.rows.map((row) => <tr key={row.id} className="align-top hover:bg-ivory-50"><td className="p-3"><strong className="font-mono text-forest">{row.reservation_code}</strong><div className="mt-1 text-[10px] text-mutedgray">{row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—'}</div></td><td className="p-3"><strong>{row.guest_name}</strong><div className="text-mutedgray">{row.guest_phone}</div><div className="text-mutedgray">{row.adults} dewasa, {row.children} anak</div></td><td className="p-3 whitespace-nowrap">{row.check_in}<br />→ {row.check_out}</td><td className="p-3">{row.room_number}<div className="text-mutedgray">{row.room_type}</div></td><td className="p-3">{reservationStatusLabel(row.status)}</td><td className="p-3">{paymentStatusLabel(row.payment_status)}<div className="text-mutedgray">{row.payment_method}</div></td><td className="p-3 text-right font-semibold">{formatPrice(row.total_idr, 'IDR')}</td><td className="p-3 text-right font-semibold">{formatPrice(row.paid_this_month_idr, 'IDR')}</td></tr>) : <tr><td colSpan={8} className="p-8 text-center text-mutedgray">Tidak ada reservasi terkait periode ini.</td></tr>}</tbody>
                            </table>
                          </div>
                          <p className="mt-3 text-[10px] text-mutedgray">Laporan mempertahankan reservasi dibatalkan sebagai histori. Angka pendapatan hanya menghitung pembayaran berstatus lunas; pembayaran yang dikembalikan tidak dihitung sebagai pendapatan.</p>
                        </>
                      ) : <div className="py-12 text-center text-sm text-mutedgray">Laporan belum tersedia.</div>}
                    </div>
                  </section>
                </div>
              )}

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
                <h1 className="font-editorial text-3xl font-bold text-forest mb-1">Inventaris Fisik & Status Kamar</h1>
                <p className="text-xs text-mutedgray">Data kamar dibaca dan disimpan langsung ke Supabase. Kamar yang baru ditambahkan langsung masuk ke daftar inventaris.</p>
              </div>

              {roomManagementError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{roomManagementError}</div>}
              {roomManagementMessage && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{roomManagementMessage}</div>}

              <section className="bg-ivory rounded-xl border border-bordercolor shadow-sm p-5 sm:p-6">
                <div className="mb-4">
                  <h2 className="font-editorial text-xl font-bold text-forest">Tambah Kamar Fisik</h2>
                  <p className="text-xs text-mutedgray mt-1">Gunakan ini saat hotel menambah unit kamar yang belum tercatat. Nomor kamar harus unik.</p>
                </div>
                {!canManageRoomCatalog ? (
                  <p className="text-xs text-mutedgray">Akun/peran saat ini hanya dapat melihat inventaris. Admin dapat menambah kamar.</p>
                ) : (
                  <form onSubmit={(event) => void handleAddPhysicalRoom(event)} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
                    <label className="text-xs font-semibold text-forest space-y-1.5">
                      Nomor kamar *
                      <input required maxLength={30} value={newRoomNumber} onChange={(event) => setNewRoomNumber(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="105" />
                    </label>
                    <label className="text-xs font-semibold text-forest space-y-1.5">
                      Tipe kamar *
                      <select required value={newRoomTypeId} onChange={(event) => setNewRoomTypeId(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal">
                        <option value="">Pilih tipe kamar</option>
                        {managedRoomTypes.filter((type) => type.is_active).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-forest space-y-1.5">
                      Lantai *
                      <input required type="number" min={1} max={100} value={newRoomFloor} onChange={(event) => setNewRoomFloor(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-forest space-y-1.5">
                      Sayap / area
                      <input maxLength={60} value={newRoomWing} onChange={(event) => setNewRoomWing(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Sayap Standar" />
                    </label>
                    <button type="submit" disabled={roomManagementSaving || !newRoomTypeId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">
                      {roomManagementSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BedDouble className="h-4 w-4" />}
                      Simpan Kamar
                    </button>
                  </form>
                )}
              </section>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-editorial text-xl font-bold text-forest">Daftar Kamar dari Database</h2>
                  <p className="text-xs text-mutedgray">{managedRooms.length} unit terdaftar • status reservasi ditampilkan dari alokasi aktif.</p>
                </div>
                <button type="button" onClick={() => void reloadRoomManagement()} disabled={roomManagementLoading} className="inline-flex items-center gap-2 rounded-lg border border-bordercolor bg-ivory px-3 py-2 text-xs font-semibold text-forest disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${roomManagementLoading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </div>

              {roomManagementLoading && managedRooms.length === 0 ? (
                <div className="rounded-xl border border-bordercolor bg-ivory p-8 text-center text-sm text-mutedgray">Memuat inventaris Supabase...</div>
              ) : managedRooms.length === 0 ? (
                <div className="rounded-xl border border-bordercolor bg-ivory p-8 text-center text-sm text-mutedgray">Belum ada kamar dalam inventaris database.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {managedRooms.map((room) => {
                    const roomType = managedRoomTypes.find((type) => type.id === room.room_type_id);
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
                      <div key={room.id} className="bg-ivory p-5 rounded-xl border border-bordercolor shadow-sm space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="text-xs font-mono uppercase tracking-wider text-mutedgray block">Lantai {room.floor} • Sayap {room.wing}</span>
                            <h3 className="font-editorial text-xl font-bold text-forest">{room.room_number}</h3>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold ${statusClass}`}>{statusLabel}</span>
                        </div>
                        <div className="text-xs text-charcoal/80">
                          <span className="text-mutedgray block">Tipe Kamar:</span>
                          <strong className="text-forest">{roomType?.name || 'Tipe lama / arsip reservasi'}</strong>
                        </div>
                        {room.current_guest && operationalStatus !== 'available' && (
                          <div className="rounded-md bg-ivory-200/70 border border-bordercolor p-3 text-xs">
                            <p className="font-semibold text-forest">{room.current_guest}</p>
                            {room.current_reservation_code && <p className="text-mutedgray mt-0.5">Kode: {room.current_reservation_code}</p>}
                            {room.current_check_in && <p className="text-mutedgray mt-0.5">Check-in: {room.current_check_in}</p>}
                            {room.current_check_out && <p className="text-mutedgray mt-0.5">Check-out: {room.current_check_out}</p>}
                          </div>
                        )}
                        <div className="text-xs text-mutedgray pt-2 border-t border-bordercolor flex justify-between">
                          <span>Tarif Dasar:</span>
                          <strong className="text-gold-700">{roomType ? `${formatPrice(roomType.base_price_cents / 100, 'IDR')}/malam` : '—'}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RATES & PRICING RULES */}
          {activeTab === 'rates' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="font-editorial text-3xl font-bold text-forest mb-1">Tarif Kamar & Aturan Harga</h1>
                <p className="text-xs text-mutedgray">Harga dan aturan di bawah dibaca langsung dari Supabase. Perubahan akan dipakai mesin perhitungan harga pada formulir pemesanan website.</p>
              </div>

              {roomManagementError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{roomManagementError}</div>}
              {roomManagementMessage && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{roomManagementMessage}</div>}
              {roomManagementLoading && <div className="rounded-lg border border-bordercolor bg-ivory p-3 text-sm text-mutedgray">Memuat harga aktual dari Supabase...</div>}

              <section className="bg-ivory rounded-xl border border-bordercolor shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-bordercolor pb-3">
                  <div>
                    <h2 className="font-editorial text-xl font-bold text-forest">Harga Dasar per Tipe Kamar</h2>
                    <p className="text-xs text-mutedgray mt-1">Harga yang saat ini tersimpan di tabel <code>room_types</code>. Tidak ada harga contoh yang ditulis langsung di halaman ini.</p>
                  </div>
                  <span className="text-xs font-semibold text-status-success">Sumber: Supabase</span>
                </div>
                {managedRoomTypes.filter((type) => type.is_active).length === 0 ? (
                  <p className="text-sm text-mutedgray">Belum ada tipe kamar aktif di Supabase.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {managedRoomTypes.filter((type) => type.is_active).map((type) => (
                      <div key={type.id} className="rounded-lg border border-bordercolor bg-ivory-100 p-4 space-y-3">
                        <div>
                          <h3 className="font-editorial text-lg font-bold text-forest">{type.name}</h3>
                          <p className="text-[11px] text-mutedgray">Harga saat ini: {formatPrice(type.base_price_cents / 100, type.currency || 'IDR')} / malam</p>
                        </div>
                        <label className="block text-xs font-semibold text-forest space-y-1.5">
                          Harga dasar baru (Rupiah)
                          <input type="number" required min={1} max={20000000} step={1000} value={basePriceDrafts[type.id] ?? ''} onChange={(event) => setBasePriceDrafts((previous) => ({ ...previous, [type.id]: event.target.value }))} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                        </label>
                        <button type="button" disabled={!canManageRoomCatalog || roomManagementSaving} onClick={() => void handleSaveBasePrice(type)} className="w-full rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">
                          {roomManagementSaving ? 'Menyimpan...' : 'Simpan Harga Dasar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!canManageRoomCatalog && <p className="text-xs text-mutedgray">Perubahan harga hanya dapat disimpan oleh admin.</p>}
              </section>

              <section className="bg-ivory rounded-xl border border-bordercolor shadow-sm p-5 sm:p-6">
                <div className="mb-4">
                  <h2 className="font-editorial text-xl font-bold text-forest">Tambah Harga Akhir Pekan / Libur Panjang</h2>
                  <p className="text-xs text-mutedgray mt-1">Tetapkan harga khusus sesuai kesepakatan dengan owner. Harga libur panjang mempunyai prioritas di atas harga akhir pekan saat tanggalnya bertumpuk.</p>
                </div>
                {!canManageRoomCatalog ? (
                  <p className="text-xs text-mutedgray">Akun/peran saat ini hanya dapat melihat tarif. Admin dapat mengubah harga.</p>
                ) : (
                  <form onSubmit={(event) => void handleAddRateRule(event)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Nama aturan *
                        <input required maxLength={100} value={newRateName} onChange={(event) => setNewRateName(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Contoh: Libur Imlek" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Tipe kamar *
                        <select required value={newRateRoomTypeId} onChange={(event) => setNewRateRoomTypeId(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal">
                          <option value="">Pilih tipe kamar</option>
                          {managedRoomTypes.filter((type) => type.is_active).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Jenis aturan *
                        <select value={newRateType} onChange={(event) => {
                          const kind = event.target.value as RoomRateKind;
                          setNewRateType(kind);
                          setNewRateName(kind === 'weekend' ? 'Tarif Akhir Pekan' : kind === 'holiday' ? 'Tarif Libur Panjang' : kind === 'custom' ? 'Tarif Khusus' : 'Tarif Musiman');
                        }} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal">
                          <option value="weekend">Akhir pekan berulang</option>
                          <option value="holiday">Libur panjang / hari besar</option>
                          <option value="seasonal">Musiman / periode tertentu</option>
                          <option value="custom">Tarif khusus</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Harga khusus per malam (Rupiah) *
                        <input required type="number" min={1} max={20000000} step={1000} value={newRatePriceIdr} onChange={(event) => setNewRatePriceIdr(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Mis. 250000" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Berlaku mulai *
                        <input required type="date" value={newRateStartDate} onChange={(event) => setNewRateStartDate(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Berlaku sampai *
                        <input required type="date" min={newRateStartDate} value={newRateEndDate} onChange={(event) => setNewRateEndDate(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-forest space-y-1.5">
                        Minimum menginap (malam)
                        <input required type="number" min={1} max={30} value={newRateMinStay} onChange={(event) => setNewRateMinStay(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                    </div>
                    {newRateType === 'weekend' && (
                      <div className="rounded-lg border border-bordercolor bg-ivory-100 p-4">
                        <p className="text-xs font-semibold text-forest mb-2">Terapkan pada hari apa saja? (berulang setiap minggu)</p>
                        <div className="flex flex-wrap gap-4">
                          {[{ day: 1, label: 'Senin' }, { day: 2, label: 'Selasa' }, { day: 3, label: 'Rabu' }, { day: 4, label: 'Kamis' }, { day: 5, label: 'Jumat' }, { day: 6, label: 'Sabtu' }, { day: 7, label: 'Minggu' }].map(({ day, label }) => (
                            <label key={day} className="inline-flex items-center gap-2 text-xs text-charcoal">
                              <input type="checkbox" checked={newRateDaysOfWeek.includes(day)} onChange={(event) => setNewRateDaysOfWeek((previous) => event.target.checked ? Array.from(new Set([...previous, day])).sort((a, b) => a - b) : previous.filter((item) => item !== day))} />
                              {label}
                            </label>
                          ))}
                        </div>
                        <p className="text-[11px] text-mutedgray mt-2">Contoh akhir pekan umum: centang Sabtu dan Minggu. Aturan hanya berlaku dalam rentang tanggal yang Anda pilih.</p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button type="submit" disabled={roomManagementSaving || !newRateRoomTypeId} className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-5 py-3 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">
                        {roomManagementSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                        Simpan Aturan Harga
                      </button>
                    </div>
                  </form>
                )}
              </section>

              <section className="bg-ivory rounded-xl border border-bordercolor shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-bordercolor pb-3">
                  <div>
                    <h2 className="font-editorial text-xl font-bold text-forest">Aturan Tarif dari Supabase</h2>
                    <p className="text-xs text-mutedgray mt-1">Simpan perubahan pada setiap kartu untuk memperbarui harga yang dipakai pada pemesanan baru.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-[11px] text-mutedgray">
                      <input type="checkbox" checked={showInactiveRates} onChange={(event) => setShowInactiveRates(event.target.checked)} /> Tampilkan nonaktif
                    </label>
                    <button type="button" onClick={() => void reloadRoomManagement()} disabled={roomManagementLoading} className="inline-flex items-center gap-2 rounded-lg border border-bordercolor bg-white px-3 py-2 text-xs font-semibold text-forest disabled:opacity-50">
                      <RefreshCw className={`h-3.5 w-3.5 ${roomManagementLoading ? 'animate-spin' : ''}`} /> Segarkan Tarif
                    </button>
                  </div>
                </div>
                {managedRoomRates.filter((rate) => rate.is_active || showInactiveRates).length === 0 && !roomManagementLoading ? (
                  <p className="rounded-lg border border-dashed border-bordercolor p-6 text-center text-sm text-mutedgray">Belum ada aturan harga aktif. Tambahkan tarif akhir pekan atau libur panjang di atas; harga dasar tetap dipakai saat tidak ada aturan khusus.</p>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {managedRoomRates.filter((rate) => rate.is_active || showInactiveRates).map((rate) => {
                      const draft = rateDrafts[rate.id];
                      const type = managedRoomTypes.find((item) => item.id === rate.room_type_id);
                      if (!draft) return null;
                      return (
                        <div key={rate.id} className="rounded-lg border border-bordercolor bg-ivory-100 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-mutedgray">{type?.name || 'Tipe kamar tidak aktif'} · {draft.rate_type === 'weekend' ? 'Akhir pekan' : draft.rate_type === 'holiday' ? 'Libur panjang' : draft.rate_type === 'custom' ? 'Khusus' : 'Musiman'}</p>
                              <p className="text-[11px] text-mutedgray mt-1">Harga aktif dari database: {formatPrice(rate.price_cents / 100, type?.currency || 'IDR')} / malam</p>
                            </div>
                            <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${draft.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>{draft.is_active ? 'Aktif' : 'Nonaktif'}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="text-xs font-semibold text-forest space-y-1">Nama aturan<input maxLength={100} value={draft.rate_name} onChange={(event) => updateRateDraft(rate.id, { rate_name: event.target.value })} className="w-full rounded border border-bordercolor bg-white px-3 py-2 text-sm font-normal" /></label>
                            <label className="text-xs font-semibold text-forest space-y-1">Jenis<select value={draft.rate_type} onChange={(event) => updateRateDraft(rate.id, { rate_type: event.target.value as RoomRateKind })} className="w-full rounded border border-bordercolor bg-white px-3 py-2 text-sm font-normal"><option value="weekend">Akhir pekan</option><option value="holiday">Libur panjang</option><option value="seasonal">Musiman</option><option value="custom">Khusus</option></select></label>
                            <label className="text-xs font-semibold text-forest space-y-1">Harga / malam (Rupiah)<input type="number" min={1} max={20000000} step={1000} value={draft.price_idr} onChange={(event) => updateRateDraft(rate.id, { price_idr: event.target.value })} className="w-full rounded border border-bordercolor bg-white px-3 py-2 text-sm font-normal" /></label>
                            <label className="text-xs font-semibold text-forest space-y-1">Minimum malam<input type="number" min={1} max={30} value={draft.min_stay_nights} onChange={(event) => updateRateDraft(rate.id, { min_stay_nights: event.target.value })} className="w-full rounded border border-bordercolor bg-white px-3 py-2 text-sm font-normal" /></label>
                            <label className="text-xs font-semibold text-forest space-y-1">Tanggal mulai<input type="date" value={draft.start_date} onChange={(event) => updateRateDraft(rate.id, { start_date: event.target.value })} className="w-full rounded border border-bordercolor bg-white px-3 py-2 text-sm font-normal" /></label>
                            <label className="text-xs font-semibold text-forest space-y-1">Tanggal akhir<input type="date" min={draft.start_date} value={draft.end_date} onChange={(event) => updateRateDraft(rate.id, { end_date: event.target.value })} className="w-full rounded border border-bordercolor bg-white px-3 py-2 text-sm font-normal" /></label>
                          </div>
                          {draft.rate_type === 'weekend' && (
                            <div className="rounded border border-bordercolor bg-white p-3">
                              <p className="text-[11px] font-semibold text-forest mb-2">Hari yang dikenai tarif</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-2">
                                {[{ day: 1, label: 'Sen' }, { day: 2, label: 'Sel' }, { day: 3, label: 'Rab' }, { day: 4, label: 'Kam' }, { day: 5, label: 'Jum' }, { day: 6, label: 'Sab' }, { day: 7, label: 'Min' }].map(({ day, label }) => <label key={day} className="inline-flex items-center gap-1.5 text-[11px] text-charcoal"><input type="checkbox" checked={draft.days_of_week.includes(day)} onChange={(event) => updateRateDraft(rate.id, { days_of_week: event.target.checked ? Array.from(new Set([...draft.days_of_week, day])).sort((a, b) => a - b) : draft.days_of_week.filter((item) => item !== day) })} />{label}</label>)}
                              </div>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-charcoal"><input type="checkbox" checked={draft.is_active} onChange={(event) => updateRateDraft(rate.id, { is_active: event.target.checked })} /> Aturan aktif pada perhitungan harga</label>
                            <button type="button" disabled={!canManageRoomCatalog || roomManagementSaving} onClick={() => void handleSaveRateRule(rate.id)} className="rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">{roomManagementSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB VOUCHERS: PROMO CMS */}
          {activeTab === 'vouchers' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="font-editorial text-3xl font-bold text-forest mb-1">Voucher & Promo</h1>
                  <p className="text-xs text-mutedgray">Kelola kode voucher resmi, potongan harga, masa berlaku, status, dan foto promosi. Semua data dibaca dan disimpan ke Supabase.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void reloadVouchers()} disabled={voucherLoading} className="inline-flex items-center gap-2 rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-xs font-semibold text-forest disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${voucherLoading ? 'animate-spin' : ''}`} /> Segarkan
                  </button>
                  <button type="button" disabled={!canManageContent || voucherSaving} onClick={openNewVoucherEditor} className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> Tambah Voucher
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gold/30 bg-gold-50 p-4 text-xs leading-relaxed text-forest-900">
                Kode harus unik. Voucher di website pelanggan hanya tampil jika status aktif dan tanggal akhirnya belum lewat. Diskon dihitung ulang di server ketika kode digunakan pada reservasi.
              </div>
              {voucherError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{voucherError}</div>}
              {voucherMessage && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{voucherMessage}</div>}

              {voucherEditorOpen && (
                <form onSubmit={handleSaveVoucher} className="space-y-5 rounded-xl border border-bordercolor bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-bordercolor pb-3">
                    <div>
                      <h2 className="font-editorial text-xl font-bold text-forest">{editingVoucherId ? 'Edit Voucher' : 'Tambah Voucher Baru'}</h2>
                      <p className="mt-1 text-xs text-mutedgray">Foto kartu voucher diunggah ke Supabase Storage; data diskon dan validitas disimpan ke tabel offers.</p>
                    </div>
                    <button type="button" onClick={() => { setVoucherEditorOpen(false); setVoucherError(null); }} className="rounded-lg p-2 text-mutedgray hover:bg-ivory-100" aria-label="Tutup formulir voucher"><X className="h-4 w-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block text-xs font-semibold text-forest">Nama voucher / promo *
                      <input required maxLength={120} value={voucherDraft.title} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, title: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Contoh: Promo Liburan Keluarga" />
                    </label>
                    <label className="block text-xs font-semibold text-forest">Kode unik voucher *
                      <input required minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]{3,32}" value={voucherDraft.code} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 font-mono text-sm font-normal uppercase" placeholder="LEMEDINA20" />
                      <span className="mt-1 block font-normal text-mutedgray">3–32 karakter; setiap voucher harus memiliki kode berbeda.</span>
                    </label>
                    <label className="block text-xs font-semibold text-forest md:col-span-2">Tagline / subjudul kartu
                      <input maxLength={240} value={voucherDraft.tagline} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, tagline: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Contoh: Penawaran khusus untuk tamu akhir pekan" />
                    </label>
                    <label className="block text-xs font-semibold text-forest md:col-span-2">Deskripsi promo
                      <textarea rows={3} maxLength={2000} value={voucherDraft.description} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, description: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Jelaskan syarat dan ketentuan promo untuk pelanggan." />
                    </label>
                    <label className="block text-xs font-semibold text-forest">Potongan harga (%) *
                      <input required type="number" min={1} max={100} step={1} value={voucherDraft.discountPercentage} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, discountPercentage: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      <span className="mt-1 block font-normal text-mutedgray">Diskon dihitung pada total tarif kamar hasil kalkulasi database.</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-forest">Berlaku mulai *
                        <input required type="date" value={voucherDraft.validFrom} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, validFrom: event.target.value, validTo: draft.validTo < event.target.value ? event.target.value : draft.validTo }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="block text-xs font-semibold text-forest">Berlaku sampai *
                        <input required type="date" min={voucherDraft.validFrom} value={voucherDraft.validTo} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, validTo: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-xs font-semibold text-forest">Foto voucher untuk kartu website (JPG, PNG, WebP, AVIF; maks. 4 MB) {editingVoucherId ? '' : '*'}</label>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" required={!editingVoucherId && !voucherDraft.imageFile} onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setVoucherDraft((draft) => ({ ...draft, imageFile: file, imagePreviewUrl: file ? URL.createObjectURL(file) : '' }));
                      }} className="block w-full rounded-lg border border-bordercolor bg-white px-3 py-2 text-xs font-normal file:mr-3 file:rounded file:border-0 file:bg-ivory-200 file:px-3 file:py-1.5" />
                      {(voucherDraft.imagePreviewUrl || voucherDraft.existingImageUrl) ? (
                        <div className="flex items-start gap-3">
                          <img src={voucherDraft.imagePreviewUrl || voucherDraft.existingImageUrl} alt="Pratinjau foto voucher" className="h-28 w-44 rounded-lg border border-bordercolor object-cover" />
                          <p className="max-w-sm text-xs text-mutedgray">Foto ini akan muncul pada kartu voucher di website pelanggan. Memilih foto baru akan mengganti foto lama.</p>
                        </div>
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-bordercolor bg-ivory-50 text-xs text-mutedgray"><ImagePlus className="mr-2 h-4 w-4" /> Pratinjau foto voucher akan muncul di sini.</div>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-forest md:col-span-2"><input type="checkbox" checked={voucherDraft.isActive} onChange={(event) => setVoucherDraft((draft) => ({ ...draft, isActive: event.target.checked }))} /> Aktifkan dan tampilkan kepada pelanggan selama masa berlaku</label>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-bordercolor pt-4">
                    <button type="button" onClick={() => setVoucherEditorOpen(false)} className="rounded-lg border border-bordercolor bg-white px-4 py-2.5 text-xs font-semibold text-forest">Batal</button>
                    <button type="submit" disabled={!canManageContent || voucherSaving} className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-5 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">
                      {voucherSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {voucherSaving ? 'Menyimpan...' : 'Simpan Voucher'}
                    </button>
                  </div>
                </form>
              )}

              {voucherLoading && managedVouchers.length === 0 ? (
                <div className="rounded-lg border border-bordercolor bg-white p-8 text-center text-sm text-mutedgray"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Memuat voucher dari Supabase...</div>
              ) : managedVouchers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-bordercolor bg-white p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ivory-100 text-forest"><Percent className="h-6 w-6" /></div>
                  <h2 className="font-editorial text-xl font-bold text-forest">Belum ada voucher</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-mutedgray">Voucher demo lama sudah tidak ditampilkan. Tambahkan voucher resmi setelah kode, diskon, foto, dan tanggalnya disetujui manajemen hotel.</p>
                  <button type="button" disabled={!canManageContent} onClick={openNewVoucherEditor} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory disabled:opacity-50"><Plus className="h-4 w-4" /> Tambah Voucher Pertama</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {managedVouchers.map((voucher) => (
                    <article key={voucher.id} className="overflow-hidden rounded-xl border border-bordercolor bg-white shadow-sm">
                      <div className="relative h-48 bg-forest-900">
                        {voucher.image_url ? <img src={voucher.image_url} alt={voucher.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gold-300"><ImagePlus className="h-10 w-10" /></div>}
                        <span className={`absolute right-3 top-3 rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${voucher.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>{voucher.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        <span className="absolute bottom-3 left-3 rounded bg-gold px-3 py-1.5 text-xs font-bold text-charcoal">Diskon {voucher.discount_percentage}%</span>
                      </div>
                      <div className="space-y-3 p-5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="font-editorial text-xl font-bold text-forest">{voucher.title}</h2>
                            {voucher.tagline && <p className="mt-1 text-xs italic text-mutedgray">{voucher.tagline}</p>}
                          </div>
                          <code className="w-fit rounded border border-gold/50 bg-gold-50 px-2.5 py-1.5 font-mono text-xs font-bold text-forest">{voucher.code}</code>
                        </div>
                        {voucher.description && <p className="text-sm leading-relaxed text-mutedgray">{voucher.description}</p>}
                        <p className="text-xs text-mutedgray">Berlaku {formatDate(voucher.valid_from)} s.d. {formatDate(voucher.valid_to)}</p>
                        <div className="flex flex-wrap gap-2 border-t border-bordercolor pt-3">
                          <button type="button" disabled={!canManageContent} onClick={() => openEditVoucherEditor(voucher)} className="inline-flex items-center gap-1 rounded-lg border border-bordercolor bg-white px-3 py-2 text-xs font-semibold text-forest disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                          <button type="button" disabled={!canManageContent} onClick={() => void toggleVoucherActive(voucher)} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${voucher.is_active ? 'border border-amber-200 bg-amber-50 text-amber-800' : 'bg-emerald-700 text-white'}`}>{voucher.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                          <button type="button" disabled={!canManageContent || voucherDeletingId === voucher.id} onClick={() => void handleDeleteVoucher(voucher)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> {voucherDeletingId === voucher.id ? 'Menghapus...' : 'Hapus'}</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RESTAURANT MENU CMS */}
          {activeTab === 'menu' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-3xl font-bold text-forest mb-1">Restoran Le Medina CMS</h1>
                  <p className="text-xs text-mutedgray">
                    Kelola menu asli restoran, harga Rupiah, kategori, foto produk, dan ketersediaan. Semua perubahan disimpan ke Supabase.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void reloadRestaurantMenu()} className="inline-flex items-center gap-2 rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-xs font-semibold text-forest">
                    <RefreshCw className="h-3.5 w-3.5" /> Segarkan
                  </button>
                  <button type="button" disabled={!canManageContent || menuSaving} onClick={openNewMenuEditor} className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> Tambah Menu
                  </button>
                </div>
              </div>

              {menuError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{menuError}</div>}
              {menuMessage && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{menuMessage}</div>}

              {menuEditorOpen && (
                <form onSubmit={handleSaveRestaurantMenu} className="space-y-5 rounded-xl border border-bordercolor bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-bordercolor pb-3">
                    <div>
                      <h2 className="font-editorial text-xl font-bold text-forest">{editingMenuId ? 'Edit Menu Restoran' : 'Tambah Menu Restoran'}</h2>
                      <p className="mt-1 text-xs text-mutedgray">Foto disimpan ke Supabase Storage; menu, kategori, dan harga disimpan ke database.</p>
                    </div>
                    <button type="button" onClick={() => { setMenuEditorOpen(false); setMenuError(null); }} className="rounded-lg p-2 text-mutedgray hover:bg-ivory-100" aria-label="Tutup formulir"><X className="h-4 w-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block text-xs font-semibold text-forest">Nama menu *
                      <input required maxLength={120} value={menuDraft.name} onChange={(event) => setMenuDraft((draft) => ({ ...draft, name: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Contoh: Nasi Goreng Le Medina" />
                    </label>
                    <label className="block text-xs font-semibold text-forest">Kategori *
                      <input required maxLength={80} list="restaurant-category-options" value={menuDraft.categoryName} onChange={(event) => setMenuDraft((draft) => ({ ...draft, categoryName: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Contoh: Makanan utama" />
                      <datalist id="restaurant-category-options">{menuCategories.map((category) => <option key={category.id} value={category.name} />)}</datalist>
                      <span className="mt-1 block font-normal text-mutedgray">Kategori baru akan dibuat otomatis bila belum ada.</span>
                    </label>
                    <label className="block text-xs font-semibold text-forest md:col-span-2">Deskripsi menu
                      <textarea rows={3} maxLength={2000} value={menuDraft.description} onChange={(event) => setMenuDraft((draft) => ({ ...draft, description: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Bahan, porsi, atau informasi menu (opsional)" />
                    </label>
                    <label className="block text-xs font-semibold text-forest">Harga (Rupiah) *
                      <input required type="number" min={1} max={20000000} step={500} value={menuDraft.priceIdr} onChange={(event) => setMenuDraft((draft) => ({ ...draft, priceIdr: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm font-normal" placeholder="Contoh: 35000" />
                    </label>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-forest">Foto produk (JPG, PNG, WebP, AVIF; maks. 4 MB)
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setMenuDraft((draft) => ({ ...draft, imageFile: file, imagePreviewUrl: file ? URL.createObjectURL(file) : '' }));
                        }} className="mt-1.5 block w-full rounded-lg border border-bordercolor bg-white px-3 py-2 text-xs font-normal file:mr-3 file:rounded file:border-0 file:bg-ivory-200 file:px-3 file:py-1.5" />
                      </label>
                      {(menuDraft.imagePreviewUrl || menuDraft.existingImageUrl) ? (
                        <div className="flex items-center gap-3">
                          <img src={menuDraft.imagePreviewUrl || menuDraft.existingImageUrl} alt="Pratinjau foto menu" className="h-20 w-20 rounded-lg border border-bordercolor object-cover" />
                          <span className="text-xs text-mutedgray">Pratinjau foto menu</span>
                        </div>
                      ) : (
                        <div className="flex h-20 items-center gap-3 rounded-lg border border-dashed border-bordercolor bg-ivory-50 px-4 text-xs text-mutedgray"><ImagePlus className="h-6 w-6" /> Belum ada foto. Foto akan tampil di website setelah disimpan.</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 border-t border-bordercolor pt-4">
                    {([
                      ['isVegetarian', 'Vegetarian'], ['isVegan', 'Vegan'], ['isGlutenFree', 'Bebas gluten'], ['isSignature', 'Menu andalan chef'], ['isAvailable', 'Tampilkan sebagai tersedia'],
                    ] as [keyof Pick<RestaurantMenuDraft, 'isVegetarian' | 'isVegan' | 'isGlutenFree' | 'isSignature' | 'isAvailable'>, string][]).map(([key, label]) => (
                      <label key={key} className="inline-flex items-center gap-2 text-xs text-forest">
                        <input type="checkbox" checked={menuDraft[key]} onChange={(event) => setMenuDraft((draft) => ({ ...draft, [key]: event.target.checked }))} className="rounded border-bordercolor" />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={() => { setMenuEditorOpen(false); setMenuError(null); }} className="rounded-lg border border-bordercolor px-4 py-2.5 text-xs font-semibold text-forest">Batal</button>
                    <button type="submit" disabled={!canManageContent || menuSaving} className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-5 py-2.5 text-xs font-bold text-ivory hover:bg-forest-800 disabled:opacity-50">
                      {menuSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {menuSaving ? 'Menyimpan...' : 'Simpan Menu ke Supabase'}
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-hidden rounded-xl border border-bordercolor bg-ivory shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-bordercolor bg-ivory-200/50 px-5 py-4">
                  <div>
                    <h2 className="font-editorial text-lg font-bold text-forest">Daftar Menu Restoran</h2>
                    <p className="mt-0.5 text-xs text-mutedgray">{menuItems.length} menu tersimpan di database.</p>
                  </div>
                </div>
                {menuItems.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <UtensilsCrossed className="mx-auto h-10 w-10 text-gold-600" />
                    <h3 className="mt-3 font-editorial text-xl font-bold text-forest">Belum ada menu restoran</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-mutedgray">Menu contoh lama sudah dibersihkan. Pihak manajemen dapat menambahkan nama menu, kategori, harga, dan foto produk asli melalui tombol Tambah Menu.</p>
                    <button type="button" disabled={!canManageContent} onClick={openNewMenuEditor} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-xs font-bold text-ivory disabled:opacity-50"><Plus className="h-4 w-4" /> Tambah Menu Pertama</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-xs">
                      <thead className="border-b border-bordercolor bg-white text-[11px] uppercase tracking-wider text-mutedgray">
                        <tr>
                          <th className="p-4">Menu & Foto</th><th className="p-4">Deskripsi</th><th className="p-4">Harga</th><th className="p-4">Kategori</th><th className="p-4">Ketersediaan</th><th className="p-4">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bordercolor">
                        {menuItems.map((item) => (
                          <tr key={item.id} className="hover:bg-ivory-100/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {item.image_url ? <img src={item.image_url} alt={item.name} className="h-14 w-14 rounded-lg border border-bordercolor object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-bordercolor bg-white text-mutedgray"><ImagePlus className="h-5 w-5" /></div>}
                                <div><strong className="block max-w-[180px] font-editorial text-sm text-forest">{item.name}</strong>{item.is_signature && <span className="text-[10px] font-bold uppercase text-gold-600">★ Andalan Chef</span>}</div>
                              </div>
                            </td>
                            <td className="max-w-xs p-4 text-mutedgray">{item.description || '—'}</td>
                            <td className="whitespace-nowrap p-4 font-bold text-gold-700">{formatPrice(item.price_cents / 100, item.currency)}</td>
                            <td className="p-4 text-forest">{menuCategories.find((category) => category.id === item.category_id)?.name || '—'}</td>
                            <td className="p-4">
                              <button type="button" disabled={!canManageContent || menuAvailabilityUpdatingId === item.id} onClick={() => void toggleMenuAvailability(item.id)} className={`rounded px-3 py-1 text-xs font-bold transition-all disabled:opacity-50 ${item.is_available ? 'bg-status-success text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {menuAvailabilityUpdatingId === item.id ? 'Menyimpan...' : item.is_available ? 'Tersedia' : 'Habis'}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button type="button" disabled={!canManageContent} onClick={() => openEditMenuEditor(item)} className="inline-flex items-center gap-1 rounded-lg border border-bordercolor bg-white px-3 py-2 font-semibold text-forest disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                                <button type="button" disabled={!canManageContent} onClick={() => void handleDeleteRestaurantMenu(item)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
              {settingsError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">{settingsError}</div>}

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
                    type="button"
                    onClick={() => void handleSaveSiteSettings()}
                    disabled={settingsSaving}
                    className="px-6 py-2.5 rounded bg-forest hover:bg-forest-900 text-ivory text-xs uppercase tracking-widest font-semibold transition-all shadow disabled:opacity-60"
                  >
                    {settingsSaving ? 'Menyimpan ke Supabase...' : 'Simpan Pengaturan Operasional'}
                  </button>
                </div>
              </div>

              {/* Profile that identifies the signed-in staff member on the panel */}
              <section className="bg-white rounded-xl p-6 sm:p-8 border border-bordercolor shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-forest/5 p-2 text-forest"><UserCircle className="h-5 w-5" /></div>
                  <div>
                    <h2 className="font-editorial text-xl font-bold text-forest">Profil Admin yang Sedang Login</h2>
                    <p className="mt-1 text-xs text-mutedgray">Nama dan foto ini muncul di bagian atas panel. Setiap staf harus memakai akun masing-masing untuk audit sif.</p>
                  </div>
                </div>
                {adminProfileError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{adminProfileError}</div>}
                {adminProfileMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{adminProfileMessage}</div>}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[160px_1fr]">
                  <div className="flex flex-col items-center gap-3">
                    {adminProfileAvatar ? <img src={adminProfileAvatar} alt="Foto profil admin" className="h-28 w-28 rounded-full border-4 border-ivory object-cover shadow-sm" /> : <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-bordercolor bg-ivory text-mutedgray"><UserCircle className="h-14 w-14" /></div>}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-bordercolor bg-ivory px-3 py-2 text-xs font-semibold text-forest hover:bg-ivory-100">
                      <Camera className="h-4 w-4" /> Ganti Foto
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setAdminProfileFile(file);
                        if (file) setAdminProfileAvatar(URL.createObjectURL(file));
                      }} />
                    </label>
                    <span className="text-center text-[10px] text-mutedgray">JPG, PNG, WebP · maks. 4 MB</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-charcoal">Nama yang Ditampilkan</label>
                      <input value={adminProfileName} onChange={(event) => setAdminProfileName(event.target.value)} maxLength={120} className="w-full rounded-lg border border-bordercolor bg-ivory-50 px-3 py-2.5 text-sm" placeholder="Nama admin/resepsionis" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-charcoal">Email Akun</label>
                      <input value={currentUser?.email || ''} readOnly className="w-full rounded-lg border border-bordercolor bg-gray-100 px-3 py-2.5 text-sm text-mutedgray" />
                      <p className="mt-1 text-[10px] text-mutedgray">Email login dikelola oleh Supabase Auth. Untuk mengubah email, lakukan melalui alur perubahan akun yang terverifikasi.</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-charcoal">Nomor Telepon Staf (opsional)</label>
                      <input value={adminProfilePhone} onChange={(event) => setAdminProfilePhone(event.target.value)} maxLength={40} className="w-full rounded-lg border border-bordercolor bg-ivory-50 px-3 py-2.5 text-sm" placeholder="Nomor kontak internal" />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => void saveAdminProfile()} disabled={adminProfileSaving || adminProfileLoading} className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow disabled:opacity-60">
                        <Save className="h-4 w-4" /> {adminProfileSaving ? 'Menyimpan Profil...' : 'Simpan Profil & Foto'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Owner-only user management and shift/audit trail */}
              {currentUser?.role === 'super_admin' && currentRole === 'super_admin' && (
                <section className="space-y-5 rounded-xl border border-bordercolor bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-forest/5 p-2 text-forest"><Users className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <h2 className="font-editorial text-xl font-bold text-forest">Akun Admin & Catatan Pergantian Sif</h2>
                      <p className="mt-1 text-xs text-mutedgray">Buat akun terpisah untuk petugas pagi, siang, atau malam. Riwayat login, logout, perubahan penting, dan alamat IP disimpan untuk membantu pemeriksaan kejadian.</p>
                    </div>
                    <button type="button" onClick={() => void loadAdminAccountsAndAudit()} disabled={adminAccountsLoading} className="inline-flex items-center gap-2 rounded-lg border border-bordercolor px-3 py-2 text-xs font-semibold text-forest disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${adminAccountsLoading ? 'animate-spin' : ''}`} /> Segarkan</button>
                  </div>
                  {adminAccountsError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{adminAccountsError}</div>}
                  {adminAccountsMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{adminAccountsMessage}</div>}

                  <form onSubmit={createAdminAccount} className="grid grid-cols-1 gap-3 rounded-xl border border-bordercolor bg-ivory-50 p-4 md:grid-cols-2">
                    <div className="md:col-span-2 flex items-center gap-2 text-sm font-bold text-forest"><UserPlus className="h-4 w-4" /> Tambah Akun Admin / Staf</div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Nama lengkap *</label>
                      <input required value={newAdminFullName} onChange={(event) => setNewAdminFullName(event.target.value)} maxLength={120} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm" placeholder="Nama petugas" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Email login *</label>
                      <input type="email" required value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm" placeholder="petugas@hotel.id" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Kata sandi awal * (min. 10 karakter)</label>
                      <input type="password" required minLength={10} value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} autoComplete="new-password" className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm" placeholder="Buat kata sandi sementara" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Hak akses</label>
                      <select value={newAdminRole} onChange={(event) => setNewAdminRole(event.target.value as Role)} className="w-full rounded-lg border border-bordercolor bg-white px-3 py-2.5 text-sm">
                        <option value="admin">Admin Operasional — kamar, tarif, reservasi, menu, pengaturan</option>
                        <option value="reservation_staff">Resepsionis — reservasi & operasional meja depan</option>
                        <option value="content_editor">Editor Konten — menu & konten</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-xl text-[10px] leading-5 text-mutedgray">Akun dibuat melalui Supabase Auth. Sampaikan kata sandi awal secara pribadi, minta staf menggantinya sesuai prosedur internal, dan jangan menggunakan satu akun bersama.</p>
                      <button type="submit" disabled={adminAccountSaving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60"><UserPlus className="h-4 w-4" /> {adminAccountSaving ? 'Membuat Akun...' : 'Buat Akun'}</button>
                    </div>
                  </form>

                  <div>
                    <h3 className="mb-3 text-sm font-bold text-forest">Daftar Akun Terdaftar</h3>
                    {adminAccountsLoading && managedAdminAccounts.length === 0 ? <div className="rounded-lg bg-ivory-50 p-6 text-center text-xs text-mutedgray">Memuat akun admin dari Supabase...</div> : managedAdminAccounts.length === 0 ? <div className="rounded-lg bg-ivory-50 p-6 text-center text-xs text-mutedgray">Belum ada akun admin yang dapat ditampilkan.</div> : (
                      <div className="space-y-3">
                        {managedAdminAccounts.map((account) => (
                          <div key={account.auth_user_id || account.id} className="flex flex-col gap-3 rounded-xl border border-bordercolor p-4 sm:flex-row sm:items-center">
                            {account.avatar_url ? <img src={account.avatar_url} alt={account.full_name} className="h-12 w-12 rounded-full border border-bordercolor object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory text-forest"><UserCircle className="h-7 w-7" /></div>}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-forest">{account.full_name}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${account.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{account.is_active ? 'AKTIF' : 'NONAKTIF'}</span></div>
                              <p className="mt-1 text-xs text-mutedgray">{account.email} · {(account.roles || []).map((role) => role.replace(/_/g, ' ')).join(', ') || 'Tanpa role'}</p>
                              <p className="mt-1 text-[10px] text-mutedgray">Login terakhir: {formatAdminAuditTime(account.last_login_at)}{account.current_shift ? ` · Sif ${account.current_shift}` : ''} · {account.session_state}</p>
                              <p className="text-[10px] text-mutedgray">Aktivitas terakhir: {formatAdminAuditTime(account.last_activity_at)}</p>
                            </div>
                            <button type="button" disabled={account.auth_user_id === currentUser?.id || account.primary_role === 'super_admin'} onClick={() => void toggleAdminAccount(account)} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${account.is_active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{account.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-forest" /><h3 className="text-sm font-bold text-forest">Audit Aktivitas Admin Terbaru</h3></div>
                    {adminAuditLogs.length === 0 ? <div className="rounded-lg bg-ivory-50 p-4 text-xs text-mutedgray">Log akan muncul setelah admin login atau melakukan perubahan berikutnya. Aktivitas sebelum pemasangan fitur ini tidak tersedia secara retrospektif.</div> : (
                      <div className="max-h-[520px] overflow-auto rounded-lg border border-bordercolor">
                        <table className="w-full min-w-[720px] text-left text-xs">
                          <thead className="sticky top-0 bg-ivory text-[10px] uppercase tracking-wider text-mutedgray"><tr><th className="p-3">Waktu (WIB)</th><th className="p-3">Admin</th><th className="p-3">Aktivitas</th><th className="p-3">Keterangan</th><th className="p-3">IP</th></tr></thead>
                          <tbody className="divide-y divide-bordercolor bg-white">
                            {adminAuditLogs.map((log) => {
                              const shift = typeof log.details?.shift_name === 'string' ? String(log.details.shift_name) : '';
                              const changed = Array.isArray(log.details?.changed_fields) ? (log.details?.changed_fields as unknown[]).map(String).join(', ') : '';
                              const target = log.target_type === 'site_settings' ? 'Pengaturan hotel' : log.target_id || log.target_type || '—';
                              return <tr key={log.id}><td className="whitespace-nowrap p-3 text-mutedgray">{formatAdminAuditTime(log.created_at)}</td><td className="p-3"><strong className="text-forest">{log.actor_name}</strong><span className="block text-[10px] text-mutedgray">{log.actor_email}</span><span className="block text-[10px] text-mutedgray">{log.actor_role.replace(/_/g, ' ')}</span></td><td className="p-3 font-semibold text-forest">{auditActionLabel(log.action)}{shift && <span className="mt-1 block text-[10px] font-normal text-mutedgray">Sif {shift}</span>}</td><td className="max-w-[240px] p-3 text-mutedgray">{changed || target}{log.details?.new_admin_email ? <span className="block">Akun baru: {String(log.details.new_admin_email)}</span> : null}{log.details?.target_email ? <span className="block">Target: {String(log.details.target_email)}</span> : null}</td><td className="p-3 text-mutedgray">{log.ip_address || '—'}</td></tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
