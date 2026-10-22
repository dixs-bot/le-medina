'use client';

import React, { useState, useEffect } from 'react';
import { GalleryImage } from '../lib/types';
import { X, ChevronLeft, ChevronRight, Maximize2, Sparkles } from 'lucide-react';

interface GallerySectionProps {
  images: GalleryImage[];
}

export default function GallerySection({ images }: GallerySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  const categories = [
    { id: 'all', label: 'All Photographs' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'suites', label: 'Suites & Salons' },
    { id: 'dining', label: 'Fine Dining' },
    { id: 'wellness', label: 'Hammam & Pool' },
    { id: 'experiences', label: 'Marrakech Moments' },
  ];

  const filteredImages =
    selectedCategory === 'all'
      ? images
      : images.filter((img) => img.category === selectedCategory);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;
      if (e.key === 'Escape') setActiveLightboxIndex(null);
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, filteredImages.length]);

  const handlePrev = () => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex(
      activeLightboxIndex > 0 ? activeLightboxIndex - 1 : filteredImages.length - 1
    );
  };

  const handleNext = () => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex(
      activeLightboxIndex < filteredImages.length - 1 ? activeLightboxIndex + 1 : 0
    );
  };

  return (
    <section id="gallery" className="py-24 bg-ivory text-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-gold-600 text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
            Visual Anthology
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-forest leading-tight mb-4">
            Moments Within the Medina
          </h2>
          <div className="w-16 h-0.5 bg-gold mx-auto mb-6" />
          <p className="text-mutedgray text-sm sm:text-base leading-relaxed">
            Glance through sun-drenched arcades, intricate cedar woodwork, flickering lantern evenings, and private courtyard serenity.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveLightboxIndex(null);
              }}
              className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-forest text-ivory shadow-md font-semibold'
                  : 'bg-ivory-200/80 text-charcoal hover:text-gold-700 border border-bordercolor'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gallery Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => setActiveLightboxIndex(idx)}
              className="group relative h-64 rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all border border-bordercolor bg-forest-950"
            >
              <img
                src={img.image_url}
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-ivory">
                <div className="flex items-center justify-between">
                  <h4 className="font-editorial text-sm font-bold text-ivory">{img.title}</h4>
                  <Maximize2 className="w-4 h-4 text-gold" />
                </div>
                {img.caption && (
                  <p className="text-[11px] text-ivory-300 line-clamp-1 mt-1">{img.caption}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accessible Interactive Lightbox */}
      {activeLightboxIndex !== null && filteredImages[activeLightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-forest-950/95 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            onClick={() => setActiveLightboxIndex(null)}
            className="absolute top-6 right-6 z-10 p-2.5 rounded-full bg-forest-900/80 hover:bg-forest text-ivory transition-colors"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-forest-900/80 hover:bg-forest text-ivory transition-colors z-10"
            aria-label="Previous Image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-forest-900/80 hover:bg-forest text-ivory transition-colors z-10"
            aria-label="Next Image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Lightbox Image Container */}
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img
              src={filteredImages[activeLightboxIndex].image_url}
              alt={filteredImages[activeLightboxIndex].title}
              className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-2xl border border-gold/30"
            />
            <div className="text-center mt-4 text-ivory">
              <h3 className="font-editorial text-xl font-bold text-gold-300">
                {filteredImages[activeLightboxIndex].title}
              </h3>
              {filteredImages[activeLightboxIndex].caption && (
                <p className="text-xs text-ivory-300 mt-1 max-w-xl">
                  {filteredImages[activeLightboxIndex].caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
