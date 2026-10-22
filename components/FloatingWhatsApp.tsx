'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Utensils, Car, BedDouble } from 'lucide-react';

interface FloatingWhatsAppProps {
  phoneNumber: string;
}

export default function FloatingWhatsApp({ phoneNumber }: FloatingWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // International phone number normalization
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

  const presets = [
    {
      label: 'Informasi Ketersediaan Kamar',
      icon: <BedDouble className="w-4 h-4 text-emerald-600" />,
      text: 'Halo! Saya ingin menanyakan ketersediaan kamar di Hôtel Le Médina Singkawang.',
    },
    {
      label: 'Reservasi Meja Restoran',
      icon: <Utensils className="w-4 h-4 text-emerald-600" />,
      text: 'Halo! Saya ingin melakukan reservasi meja di Restoran Le Medina.',
    },
    {
      label: 'Layanan Transportasi & Antar-Jemput',
      icon: <Car className="w-4 h-4 text-emerald-600" />,
      text: 'Halo! Saya memerlukan bantuan penjemputan dan transportasi ke hotel di Singkawang.',
    },
    {
      label: 'Informasi Fasilitas & Spa',
      icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
      text: 'Halo! Saya ingin menanyakan layanan fasilitas relaksasi dan spa di hotel.',
    },
  ];

  const handleSend = (text: string) => {
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${cleanNumber}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Expanded Popover Card */}
      {isOpen && (
        <div className="mb-4 bg-ivory rounded-2xl shadow-2xl border border-bordercolor w-80 sm:w-96 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-forest-900 text-ivory p-4 flex items-center justify-between border-b border-forest-800">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow">
                LM
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-status-success rounded-full ring-2 ring-forest-900" />
              </div>
              <div>
                <h4 className="font-editorial text-sm font-bold text-ivory">
                  Layanan Tamu Le Medina
                </h4>
                <p className="text-[10px] text-emerald-300">Biasanya membalas dalam 5 menit</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-ivory-300 hover:text-ivory p-1"
              aria-label="Tutup jendela WhatsApp"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="p-4 bg-ivory-50 space-y-2 text-xs">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-mutedgray block mb-1">
              Pilih topik pertanyaan:
            </span>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset.text)}
                className="w-full text-left p-2.5 rounded-lg bg-ivory hover:bg-ivory-200/70 border border-bordercolor flex items-center gap-2.5 text-charcoal transition-all text-xs font-medium"
              >
                {preset.icon}
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Message Field */}
          <div className="p-3 bg-ivory border-t border-bordercolor flex items-center gap-2">
            <input
              type="text"
              placeholder="Ketik pesan Anda di sini..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && customMsg.trim() && handleSend(customMsg)}
              className="flex-1 text-xs px-3 py-2 rounded bg-ivory-100 border border-bordercolor focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <button
              onClick={() => customMsg.trim() && handleSend(customMsg)}
              disabled={!customMsg.trim()}
              className="p-2 rounded bg-status-success text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              aria-label="Kirim WhatsApp"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 bg-status-success hover:bg-emerald-600 text-white px-4 py-3.5 rounded-full shadow-2xl hover:shadow-emerald-900/40 transition-all transform hover:scale-105"
        aria-label="Hubungi Staf via WhatsApp"
      >
        <MessageSquare className="w-5 h-5 fill-white text-white" />
        <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
          {isOpen ? 'Tutup Chat' : 'Layanan WhatsApp'}
        </span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gold rounded-full border-2 border-white animate-pulse" />
      </button>
    </div>
  );
}
