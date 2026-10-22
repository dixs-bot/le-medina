'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Phone, Calendar, ShieldCheck, Compass } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Suites', href: '#suites' },
    { label: 'The Riad', href: '#about' },
    { label: 'Restaurant & Teas', href: '#dining' },
    { label: 'Hammam & Spa', href: '#facilities' },
    { label: 'Special Offers', href: '#offers' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Location', href: '#location' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <>
      {/* Top Banner */}
      <div className="bg-forest-900 text-ivory-200 text-xs py-2 px-4 border-b border-forest-700/50 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center tracking-wider uppercase font-medium">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-1.5 text-gold-300">
              <ShieldCheck className="w-3.5 h-3.5" /> Direct Booking Guarantee: Best Rate & VIP Hammam
            </span>
            <span className="text-forest-100/60">•</span>
            <span className="text-forest-100/80">Marrakech Medina, Morocco</span>
          </div>
          <div className="flex items-center space-x-6">
            <a
              href="tel:+212524389000"
              className="flex items-center gap-1.5 hover:text-gold-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-gold-400" /> +212 524 38 90 00
            </a>
            <span className="text-forest-100/60">•</span>
            <Link
              href="/admin"
              className="hover:text-gold-300 transition-colors flex items-center gap-1 text-gold-400 font-semibold"
            >
              <Compass className="w-3.5 h-3.5" /> Staff Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <nav
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-ivory/95 backdrop-blur-md shadow-md py-3.5 border-b border-bordercolor'
            : 'bg-ivory py-5 border-b border-bordercolor/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="group flex flex-col">
            <span className="font-editorial text-2xl sm:text-3xl tracking-tight text-forest font-bold group-hover:text-gold-600 transition-colors">
              HÔTEL LE MÉDINA
            </span>
            <span className="text-[10px] tracking-[0.28em] uppercase text-gold-600 font-medium -mt-1">
              & Resto • Marrakech
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-7">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs uppercase tracking-widest text-charcoal/80 hover:text-gold-600 font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center space-x-4">
            <a
              href="#booking"
              className="inline-flex items-center gap-2 bg-forest hover:bg-forest-900 text-ivory text-xs uppercase tracking-widest px-5 py-2.5 rounded shadow-sm hover:shadow-md transition-all font-medium border border-gold/30 hover:border-gold"
            >
              <Calendar className="w-3.5 h-3.5 text-gold" />
              <span>Book Stay</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-3">
            <a
              href="#booking"
              className="sm:hidden bg-forest text-ivory text-xs uppercase tracking-wider px-3 py-1.5 rounded font-medium"
            >
              Book
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-forest hover:text-gold transition-colors focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-ivory-50 border-b border-bordercolor px-4 pt-4 pb-6 shadow-xl animate-fadeIn">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium uppercase tracking-wider text-charcoal hover:text-gold-600 py-1.5 border-b border-bordercolor/40"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="#booking"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-forest text-ivory text-xs uppercase tracking-widest py-3 rounded font-medium"
                >
                  <Calendar className="w-4 h-4 text-gold" />
                  <span>Reserve Suite</span>
                </a>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-ivory-200 text-forest text-xs uppercase tracking-widest py-2.5 rounded font-medium border border-bordercolor"
                >
                  <Compass className="w-4 h-4 text-gold" />
                  <span>Admin & Staff Portal</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
