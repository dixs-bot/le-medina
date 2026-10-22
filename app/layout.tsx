import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const serifFont = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hôtel Le Médina & Resto | Luxury Moroccan Haven in Marrakech',
  description:
    'Experience timeless Andalusian-Moroccan elegance, bespoke riad hospitality, gourmet dining, and restorative wellness in the historic heart of Marrakech.',
  keywords: [
    'Hotel Le Medina',
    'Marrakech luxury riad',
    'Boutique hotel Marrakech',
    'Moroccan fine dining',
    'Riad suites Marrakech',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serifFont.variable} ${sansFont.variable} scroll-smooth`}>
      <body className="bg-ivory text-charcoal font-sans antialiased min-h-screen flex flex-col selection:bg-gold selection:text-white">
        {children}
      </body>
    </html>
  );
}
