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
  title: 'Hotel Le Medina & Resto | Hotel dan Restoran di Singkawang',
  description:
    'Nikmati kenyamanan menginap, layanan ramah, pilihan hidangan restoran, dan fasilitas hotel di Singkawang, Kalimantan Barat.',
  keywords: [
    'Hotel Le Medina',
    'hotel Singkawang',
    'hotel Kalimantan Barat',
    'restoran Singkawang',
    'penginapan Singkawang',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${serifFont.variable} ${sansFont.variable} scroll-smooth`}>
      <body className="bg-ivory text-charcoal font-sans antialiased min-h-screen flex flex-col selection:bg-gold selection:text-white">
        {children}
      </body>
    </html>
  );
}
