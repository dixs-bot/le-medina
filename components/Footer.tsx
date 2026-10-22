'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, ShieldCheck, Heart, ArrowUp } from 'lucide-react';

export default function Footer() {
  const [emailSub, setEmailSub] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailSub) {
      setSubscribed(true);
      setEmailSub('');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-forest-950 text-ivory pt-20 pb-12 border-t border-forest-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-forest-800">
          {/* Brand Column (2 cols on lg) */}
          <div className="lg:col-span-2">
            <span className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-ivory block mb-1">
              HÔTEL LE MÉDINA
            </span>
            <span className="text-xs tracking-[0.3em] uppercase text-gold-400 font-medium block mb-4">
              & Resto • Marrakech
            </span>
            <p className="text-xs text-ivory-300 leading-relaxed max-w-sm mb-6">
              An intimate sanctuary of Moroccan zellige tilework, Andalusian courtyards, Michelin-inspired gastronomy, and restorative hammam baths in the historic Medina of Marrakech.
            </p>

            <div className="flex items-center gap-2 text-xs text-gold-300">
              <ShieldCheck className="w-4 h-4 text-gold" />
              <span>Direct Booking Best Rate & VIP Hammam Guarantee</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-gold-400 font-semibold mb-4">
              The Hotel
            </h4>
            <ul className="space-y-2.5 text-xs text-ivory-300">
              <li>
                <a href="#suites" className="hover:text-gold transition-colors">
                  Suites & Residences
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-gold transition-colors">
                  Our Riad Heritage
                </a>
              </li>
              <li>
                <a href="#dining" className="hover:text-gold transition-colors">
                  Le Médina Resto
                </a>
              </li>
              <li>
                <a href="#facilities" className="hover:text-gold transition-colors">
                  Les Bains Hammam & Spa
                </a>
              </li>
              <li>
                <a href="#offers" className="hover:text-gold transition-colors">
                  Privileged Stays & Offers
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-gold transition-colors">
                  Photo Anthology
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-gold-400 font-semibold mb-4">
              Concierge Desk
            </h4>
            <div className="space-y-3 text-xs text-ivory-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                <span>42 Derb Sidi Bouloukate, Medina, Marrakech 40000, Morocco</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                <a href="tel:+212524389000" className="hover:text-gold">
                  +212 524 38 90 00
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                <a href="mailto:concierge@lemedinahotel.com" className="hover:text-gold">
                  concierge@lemedinahotel.com
                </a>
              </div>
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-300 uppercase tracking-wider underline underline-offset-4"
                >
                  Admin & Staff Portal →
                </Link>
              </div>
            </div>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-gold-400 font-semibold mb-4">
              Medina Dispatch
            </h4>
            <p className="text-xs text-ivory-300 leading-relaxed mb-4">
              Receive private invitations to seasonal culinary festivals, new suite unveilings, and cultural salon gatherings.
            </p>

            {subscribed ? (
              <div className="p-3 bg-forest-900 border border-gold/40 rounded text-xs text-gold-300 text-center font-medium">
                Shukran for joining our guest circle.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  placeholder="Your email address"
                  value={emailSub}
                  onChange={(e) => setEmailSub(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-forest-900 border border-forest-800 text-xs text-ivory focus:outline-none focus:ring-1 focus:ring-gold"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-gold hover:bg-gold-600 text-charcoal font-semibold text-xs uppercase tracking-wider py-2 rounded transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-ivory-400 gap-4">
          <p>© 2026 Hôtel Le Médina & Resto. All rights reserved. Handcrafted in Marrakech.</p>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-gold hover:text-gold-300 uppercase tracking-widest text-[11px] font-semibold transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
