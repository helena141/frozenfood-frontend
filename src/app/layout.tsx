import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/providers/query-provider';

export const metadata: Metadata = {
  title: 'Lezzat Frozen Food — E-Commerce',
  description: 'Headless B2C, B2B & Admin Frozen Food E-Commerce Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}