import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const serifFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hôtel Le Médina & Resto | Hotel & Restoran Mewah di Singkawang",
  description:
    "Nikmati pengalaman menginap istimewa di Hôtel Le Médina & Resto Singkawang. Dilengkapi kamar & suite mewah, restoran hidangan khas otentik, fasilitas lengkap, dan keramahan pelayanan terbaik di Kalimantan Barat.",
  keywords: [
    "Hotel Le Medina",
    "hotel Singkawang",
    "hotel mewah Singkawang",
    "hotel Kalimantan Barat",
    "restoran Singkawang",
    "penginapan Singkawang",
    "reservasi hotel Singkawang",
    "kuliner Singkawang",
  ],
  openGraph: {
    title: "Hôtel Le Médina & Resto | Kemewahan & Keramahan di Singkawang",
    description:
      "Santauari ketenangan dan keanggunan arsitektur di Singkawang, Kalimantan Barat. Nikmati kamar suite eksklusif, kuliner lezat, dan fasilitas istimewa.",
    url: "https://lemedina.singkawang.id",
    siteName: "Hôtel Le Médina & Resto",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Pemandangan Courtyard Utama Hôtel Le Médina & Resto Singkawang",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hôtel Le Médina & Resto | Hotel & Restoran di Singkawang",
    description:
      "Kenyamanan menginap dengan layanan ramah dan restoran lezat di Singkawang, Kalimantan Barat.",
    images: ["https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80"],
  },
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
