import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Lezzat Frozen Food",
  description: "B2B & B2C Headless E-Commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}