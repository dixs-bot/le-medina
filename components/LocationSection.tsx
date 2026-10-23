'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, LocateFixed, ExternalLink } from 'lucide-react';

const HOTEL_LATITUDE = 0.8922778;
const HOTEL_LONGITUDE = 108.9696696;
const HOTEL_NAME = 'Hôtel Le Médina & Resto';

function calculateDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDifference = toRadians(toLatitude - fromLatitude);
  const longitudeDifference = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LokasiSection() {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [deviceCoordinates, setDeviceCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const handleCheckDistance = () => {
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      setLocationError('Perangkat atau browser ini tidak mendukung fitur lokasi.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const distance = calculateDistanceKm(
          latitude,
          longitude,
          HOTEL_LATITUDE,
          HOTEL_LONGITUDE,
        );

        setDeviceCoordinates({ latitude, longitude });
        setDistanceKm(distance);
        setLocationError(null);
        setIsLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            'Izin lokasi belum diberikan. Aktifkan akses lokasi di browser untuk menghitung jarak.',
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Lokasi perangkat belum tersedia. Coba lagi di area dengan sinyal yang lebih baik.');
        } else {
          setLocationError('Permintaan lokasi terlalu lama. Silakan coba lagi.');
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const navigationUrl = new URL('https://www.google.com/maps/dir/');
  navigationUrl.searchParams.set('api', '1');
  navigationUrl.searchParams.set('destination', `${HOTEL_LATITUDE},${HOTEL_LONGITUDE}`);
  navigationUrl.searchParams.set('travelmode', 'driving');
  if (deviceCoordinates) {
    navigationUrl.searchParams.set(
      'origin',
      `${deviceCoordinates.latitude},${deviceCoordinates.longitude}`,
    );
  }

  return (
    <section id="location" className="relative bg-ivory py-20 text-charcoal sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gold-600">
            Informasi Lokasi
          </span>
          <h2 className="mb-4 font-editorial text-3xl font-bold leading-tight text-forest sm:text-5xl">
            Temukan Hôtel Le Médina
          </h2>
          <div className="mx-auto mb-5 h-0.5 w-16 bg-gold" />
          <p className="text-sm leading-relaxed text-mutedgray sm:text-base">
            Lihat lokasi hotel langsung di peta dan buka navigasi untuk mendapatkan petunjuk arah ke hotel.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-bordercolor bg-white shadow-luxury-lg">
          <div className="relative h-[360px] w-full bg-ivory-100 sm:h-[480px] lg:h-[560px]">
            <iframe
              title={`Peta lokasi ${HOTEL_NAME}, Singkawang`}
              src={`https://maps.google.com/maps?q=${HOTEL_LATITUDE}%2C${HOTEL_LONGITUDE}&z=16&output=embed`}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex flex-col gap-5 border-t border-bordercolor bg-ivory p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-forest">
                <MapPin className="h-5 w-5 shrink-0 text-gold-600" />
                <h3 className="font-editorial text-lg font-bold sm:text-xl">{HOTEL_NAME}</h3>
              </div>
              <p className="text-xs text-mutedgray sm:text-sm">
                Singkawang, Kalimantan Barat, Indonesia
              </p>
              {distanceKm !== null ? (
                <p className="mt-3 text-sm font-semibold text-forest" aria-live="polite">
                  Perkiraan jarak garis lurus dari lokasi Anda: {' '}
                  <span className="text-gold-600">
                    {distanceKm.toLocaleString('id-ID', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    km
                  </span>
                  <span className="mt-1 block text-xs font-normal text-mutedgray">
                    Jarak perjalanan di jalan dapat berbeda. Google Maps akan menghitung rute perjalanan.
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-mutedgray">
                  Izinkan akses lokasi perangkat untuk melihat perkiraan jarak ke hotel.
                </p>
              )}
              {locationError && (
                <p className="mt-2 max-w-xl text-xs text-red-700" role="alert">
                  {locationError}
                </p>
              )}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={handleCheckDistance}
                disabled={isLocating}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-forest bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-forest transition hover:bg-forest-50 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
              >
                <LocateFixed className="h-4 w-4" />
                {isLocating ? 'Mencari lokasi…' : 'Cek jarak saya'}
              </button>
              <a
                href={navigationUrl.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-forest px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ivory shadow-sm transition hover:bg-forest-900 sm:text-sm"
              >
                <Navigation className="h-4 w-4 text-gold" />
                Navigasi ke Hotel
                <ExternalLink className="h-3.5 w-3.5 text-gold" />
              </a>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-mutedgray">
          Koordinat hotel: {HOTEL_LATITUDE}, {HOTEL_LONGITUDE}. Lokasi perangkat hanya digunakan saat Anda menekan tombol “Cek jarak saya”.
        </p>
      </div>
    </section>
  );
}
