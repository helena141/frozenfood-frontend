'use client';

import React from 'react';
import Link from 'next/link';
import {
  Snowflake,
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  Navigation,
  Heart,
} from 'lucide-react';

export default function ShopFooter() {
  return (
    <footer className="rounded-2xl bg-white text-slate-700 border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom 1: Tentang Lezzat Frozen Food */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4737FF] flex items-center justify-center text-white shrink-0">
              <Snowflake className="w-4 h-4" />
            </div>
            <div>
              <span className="font-heading text-base font-extrabold text-slate-800 block leading-none">
                Lezzat Frozen Food
              </span>
              <span className="text-[10px] font-bold tracking-wider text-[#4737FF] uppercase block mt-0.5">
                FROZNFOOD 2.0 MARKETPLACE
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Pusat belanja makanan beku keluarga (B2C) dan mitra distribusi usaha
            kuliner (B2B) di Yogyakarta. Produk disimpan pada suhu standar{' '}
            <span className="font-semibold text-[#159A68]">-18°C Fresh</span>{' '}
            dengan rotasi stok FEFO transparan.
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-[#159A68]" />
              <span>100% Halal & Higienis</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700">
              <CreditCard className="w-3.5 h-3.5 text-[#4737FF]" />
              <span>QRIS & Virtual Account</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#4737FF] shrink-0" />
              <span>
                <strong className="text-slate-700">09.00 – 21.00 WIB</strong>{' '}
                (Sameday ≤ 15.00 WIB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#159A68] shrink-0" />
              <span>+62 812-3456-7890 (WhatsApp CS & B2B)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#4737FF] shrink-0" />
              <span>halo@lezzatfrozenfood.id</span>
            </div>
          </div>
        </div>

        {/* Kolom 2: Navigasi Cepat */}
        <div className="lg:col-span-3 space-y-2.5">
          <h3 className="font-heading text-xs font-extrabold uppercase tracking-wider text-[#4737FF]">
            Navigasi & Layanan
          </h3>
          <ul className="space-y-2 text-xs text-slate-600">
            <li>
              <a
                href="#kategori-pilihan"
                className="hover:text-[#4737FF] transition-colors inline-block"
              >
                Belanja Berdasarkan Kategori
              </a>
            </li>
            <li>
              <a
                href="#fefo-deals"
                className="hover:text-[#F75C03] text-[#F75C03] font-semibold transition-colors inline-block"
              >
                Promo Food Deals (Batch FEFO)
              </a>
            </li>
            <li>
              <a
                href="#ulasan-pelanggan"
                className="hover:text-[#4737FF] transition-colors inline-block"
              >
                Ulasan & Rating Pelanggan
              </a>
            </li>
            <li>
              <Link
                href="/checkout"
                className="hover:text-[#4737FF] transition-colors inline-block"
              >
                Keranjang & Estimasi Ongkir
              </Link>
            </li>
            <li>
              <Link
                href="/orders"
                className="hover:text-[#4737FF] transition-colors inline-block"
              >
                Lacak Pesanan & Nota PDF
              </Link>
            </li>
            <li className="pt-1">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4737FF] hover:bg-[#3529BF] text-white text-[11px] font-bold transition-colors"
              >
                <span>Daftar Mitra Grosir (B2B)</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Kolom 3: Lokasi Gudang & Google Maps Ringkas */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-xs font-extrabold uppercase tracking-wider text-[#4737FF] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#4737FF]" />
                <span>Lokasi Toko & Gudang Cold-Storage</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Jl. Malioboro / Suryatmajan, Kota Yogyakarta, DIY
              </p>
            </div>

            <a
              href="https://www.google.com/maps?q=-7.7925,110.3658"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-[#4737FF] text-[#4737FF] hover:text-white text-[11px] font-bold transition-colors shrink-0"
            >
              <Navigation className="w-3 h-3" />
              <span>Google Maps</span>
            </a>
          </div>

          <div className="rounded-xl overflow-hidden bg-slate-100 h-36 relative">
            <iframe
              title="Lokasi Gudang Lezzat Frozen Food Yogyakarta"
              src="https://www.google.com/maps?q=-7.7925,110.3658&hl=id&z=14&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] shadow-2xs">
              <span className="font-semibold text-slate-700 truncate">
                📍 Kurir Toko (Gratis ≤ 5 km)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#159A68] font-bold text-[10px] shrink-0">
                Stok Fresh -18°C
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Hak Cipta */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <p className="flex items-center gap-1">
          <span>© 2026</span>
          <strong className="text-slate-600">Lezzat Frozen Food</strong>
          <span>(Froznfood 2.0). Dibuat dengan</span>
          <Heart className="w-3 h-3 text-[#F75C03] fill-[#F75C03] inline" />
          <span>untuk keluarga & mitra kuliner Indonesia.</span>
        </p>
        <p className="font-semibold text-[#4737FF]">
          Cold-Chain -18°C • FEFO Inventory • Smart Delivery
        </p>
      </div>
    </footer>
  );
}