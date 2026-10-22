import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReservationByCode, getSitePengaturan } from '../../../lib/data/store';
import { formatPrice } from '../../../lib/utils';
import {
  CheckCircle,
  Calendar,
  Users,
  MapPin,
  Clock,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  Phone,
} from 'lucide-react';

interface ConfirmationPageProps {
  params: { code: string };
}

export const revalidate = 0;

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { code } = params;
  const reservation = await getReservationByCode(code);
  const sitePengaturan = await getSitePengaturan();

  if (!reservation) {
    return notFound();
  }

  const cleanWhatsAppNumber = sitePengaturan.whatsapp.replace(/[^0-9]/g, '');
  const whatsAppText = encodeURIComponent(
    `Salam! I am confirming reservation ${reservation.reservation_code} for ${reservation.guest_name} from ${reservation.check_in} to ${reservation.check_out}. Please assist with my arrival details.`
  );
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${whatsAppText}`;

  return (
    <div className="min-h-screen bg-ivory text-charcoal py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Back */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-forest hover:text-gold transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Confirmation Card */}
        <div className="bg-ivory-50 rounded-2xl shadow-luxury-lg border border-bordercolor overflow-hidden">
          {/* Header Banner */}
          <div className="bg-forest text-ivory p-8 sm:p-10 text-center border-b border-gold/30 relative">
            <div className="w-16 h-16 rounded-full bg-forest-900 border-2 border-gold flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-status-success" />
            </div>

            <span className="text-xs uppercase tracking-[0.25em] text-gold-300 font-bold block mb-1">
              Detail Reservasi
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-ivory mb-2">
              Halo, {reservation.guest_name}
            </h1>
            <p className="text-xs sm:text-sm text-ivory-200/90 font-light max-w-md mx-auto">
              We look forward to welcoming you to our serene Andalusian sanctuary in the heart of Singkawang.
            </p>

            {/* Code Badge */}
            <div className="mt-6 inline-block bg-forest-950/90 px-6 py-2.5 rounded-full border border-gold/40">
              <span className="text-xs text-ivory-300 mr-2">Kode Reservasi:</span>
              <span className="font-mono text-lg font-bold text-gold tracking-widest">
                {reservation.reservation_code}
              </span>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* Status & Ringkasan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-ivory p-4 rounded-xl border border-bordercolor text-xs">
              <div>
                <span className="text-mutedgray block">Status</span>
                <span className="capitalize font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded inline-block mt-0.5">
                  {reservation.status}
                </span>
              </div>
              <div>
                <span className="text-mutedgray block">Check-in</span>
                <strong className="text-forest block mt-0.5">{reservation.check_in}</strong>
                <span className="text-[10px] text-mutedgray">Mulai dari 15:00</span>
              </div>
              <div>
                <span className="text-mutedgray block">Check-out</span>
                <strong className="text-forest block mt-0.5">{reservation.check_out}</strong>
                <span className="text-[10px] text-mutedgray">Until 12:00</span>
              </div>
              <div>
                <span className="text-mutedgray block">Total Biaya</span>
                <strong className="text-forest text-sm font-editorial font-bold block mt-0.5">
                  {formatPrice(reservation.total_amount_cents / 100, reservation.currency)}
                </strong>
                <span className="text-[10px] text-mutedgray">Taxes & breakfast incl.</span>
              </div>
            </div>

            {/* Room Assignment */}
            <div className="border border-bordercolor rounded-xl p-6 bg-ivory flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold block mb-1">
                  Assigned Quarters
                </span>
                <h3 className="font-editorial text-xl font-bold text-forest">
                  {reservation.room_type?.name || 'Selected Indonesia Suite'}
                </h3>
                <p className="text-xs text-mutedgray mt-1">
                  Assigned Chamber: <strong>{reservation.assigned_room_number || 'Suite 101'}</strong> • {reservation.adults} Dewasa
                  {reservation.children > 0 ? `, ${reservation.children} Anak-anak` : ''}
                </p>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-xs text-status-success font-medium bg-forest-50 px-2.5 py-1 rounded border border-forest-100 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Best Rate Guaranteed
                </span>
              </div>
            </div>

            {/* Kedatangan & Informasi Lokasi */}
            <div className="bg-ivory rounded-xl p-6 border border-bordercolor space-y-3 text-xs text-charcoal/80">
              <h4 className="font-editorial text-base font-bold text-forest flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />
                <span>Kedatangan & Concierge Luggage Escort</span>
              </h4>
              <p className="leading-relaxed">
                Hôtel Le Médina is located in a quiet pedestrian alley in the Medina: <strong>{sitePengaturan.address}</strong>. Cars cannot enter the alleyway directly.
              </p>
              <p className="leading-relaxed">
                If arriving by taxi, request drop-off at <strong>Bab Agnaou</strong> or <strong>Place des Ferblantiers</strong>. If you require our private chauffeur or a riad luggage porter, please message us on WhatsApp with your arrival time.
              </p>
            </div>

            {/* WhatsApp Handoff CTA */}
            <div className="text-center pt-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 bg-status-success hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Concierge on WhatsApp</span>
              </a>
              <p className="text-[11px] text-mutedgray mt-2">
                Need urgent assistance? Call us directly at{' '}
                <a href={`tel:${sitePengaturan.phone}`} className="text-forest font-semibold underline">
                  {sitePengaturan.phone}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
