import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/providers/query-provider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Froznfood 2.0 — Freshness in Every Bite',
  description:
    'Modern Premium Frozen Food Marketplace. Pilihan frozen food berkualitas dengan penyimpanan rantai dingin terjaga dan pengiriman cepat.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${inter.variable}`}>
      <body className="antialiased selection:bg-[#4737FF] selection:text-white">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}