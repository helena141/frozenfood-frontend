'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Snowflake,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award,
  Flame,
  Truck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { ProductCatalogResponse } from '@/types/api';
import { formatRupiah } from '@/lib/utils';

interface HeroCarouselProps {
  featuredProducts?: ProductCatalogResponse[];
}

function getFullImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || rawUrl.trim() === '') return null;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const baseUrl = (
    api.defaults.baseURL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8080'
  ).replace(/\/+$/, '');
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

const SLIDES = [
  {
    id: 1,
    badge: 'LEZZAT FROZEN FOOD • FROZNFOOD 2.0',
    title: 'Kualitas Beku Terbaik, Segar Sampai di Meja Makan.',
    desc: 'Pusat belanja frozen food pilihan keluarga & mitra kuliner di Yogyakarta. Dijaga ketat pada suhu rantai dingin -18°C dengan sistem rotasi stok FEFO.',
    highlight: 'Gratis Ongkir ≤ 5 KM',
    subHighlight: 'Kurir Motor Toko & Ekspedisi',
    ctaText: 'Belanja Katalog',
    ctaHref: '#katalog-produk',
    secondaryText: 'Pesanan Saya',
    secondaryHref: '/orders',
    fallbackImg:
      'https://images.unsplash.com/photo-1625938144755-652e08e359b7?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    badge: 'PROGRAM MITRA USAHA & RESELLER (B2B)',
    title: 'Pasokan Grosir Stabil untuk Resto, Kafe & Katering.',
    desc: 'Nikmati harga grosir otomatis (Auto-Tiering) untuk akun B2B, alokasi batch FEFO terjamin segar, serta unduhan Nota PDF resmi di setiap transaksi.',
    highlight: 'Harga Tiering Otomatis',
    subHighlight: 'Faktur & Nota Pesanan Resmi',
    ctaText: 'Daftar Mitra B2B',
    ctaHref: '/register',
    secondaryText: 'Masuk Akun Mitra',
    secondaryHref: '/login',
    fallbackImg:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    badge: 'PENGIRIMAN PINTAR • SMART DELIVERY',
    title: 'Pesan Sebelum 15.00 WIB, Dikirim di Hari yang Sama!',
    desc: 'Sistem kalkulasi jarak koordinat otomatis hingga radius 50 km. Dikemas rapat dalam cooler box berinsulasi agar kualitas beku tetap terjaga.',
    highlight: 'Sameday Delivery',
    subHighlight: 'Operasional 09.00 – 21.00 WIB',
    ctaText: 'Checkout Sekarang',
    ctaHref: '/checkout',
    secondaryText: 'Lacak Pengiriman',
    secondaryHref: '/orders',
    fallbackImg:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 4,
    badge: 'JAMINAN MUTU • FIRST EXPIRED FIRST OUT',
    title: 'Rotasi Batch Pintar, Tanpa Khawatir Stok Lama.',
    desc: 'Setiap produk yang Anda pesan dialokasikan otomatis dari batch produksi terbaik yang terpantau tanggal kedaluwarsanya secara real-time.',
    highlight: '100% Kontrol FEFO',
    subHighlight: 'Higienis, Halal & Rantai Dingin',
    ctaText: 'Lihat Semua Produk',
    ctaHref: '#katalog-produk',
    secondaryText: 'Profil Akun',
    secondaryHref: '/profile',
    fallbackImg:
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&auto=format&fit=crop&q=80',
  },
];

const MARQUEE_ITEMS = [
  '❄️ Jaminan Rantai Dingin -18°C Terjaga Sampai Tujuan',
  '🚚 Gratis Ongkir Radius ≤ 5 KM dengan Kurir Motor Toko',
  '📦 Sistem Stok FEFO (First Expired, First Out) Terjamin Segar',
  '🏢 Tersedia Harga Khusus Mitra Usaha & Grosir (B2B Auto-Tiering)',
  '⚡ Pesan Sebelum 15.00 WIB Dikirim Hari Ini (Sameday Delivery)',
  '💳 Pembayaran Praktis via QRIS & Virtual Account Midtrans',
  '📄 Nota PDF Resmi Otomatis di Setiap Pesanan',
];

export default function HeroCarousel({
  featuredProducts = [],
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const productsWithImages = useMemo(
    () => featuredProducts.filter((p) => Boolean(p.gambar)),
    [featuredProducts]
  );

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % SLIDES.length);
  };

  return (
    <section
      className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative ff-hero-gradient text-white p-4 sm:p-6 overflow-hidden">
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {SLIDES.map((slide, idx) => {
              const matchedProduct =
                productsWithImages[
                  idx % Math.max(1, productsWithImages.length)
                ] ||
                featuredProducts[idx % Math.max(1, featuredProducts.length)];

              const resolvedImg = getFullImageUrl(matchedProduct?.gambar);
              const displayImg = resolvedImg || slide.fallbackImg;
              const displayTitle =
                matchedProduct?.namaProduk ||
                'Koleksi Bakso, Dimsum & Nugget Premium';
              const displayPrice = matchedProduct
                ? formatRupiah(matchedProduct.hargaEceran)
                : slide.highlight;

              return (
                <div
                  key={slide.id}
                  className="w-full shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
                >
                  <div className="lg:col-span-7 space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-[10px] font-bold tracking-wider uppercase">
                      <Sparkles className="w-3 h-3 text-[#F75C03] shrink-0" />
                      <span>{slide.badge}</span>
                    </div>

                    <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight">
                      {slide.title}
                    </h1>

                    <p className="text-xs text-white/85 leading-relaxed max-w-xl">
                      {slide.desc}
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      {slide.ctaHref.startsWith('#') ? (
                        <a
                          href={slide.ctaHref}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>{slide.ctaText}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <Link
                          href={slide.ctaHref}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>{slide.ctaText}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      <Link
                        href={slide.secondaryHref}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors"
                      >
                        <span>{slide.secondaryText}</span>
                      </Link>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/90">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Halal & Higienis</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10">
                        <Truck className="w-3.5 h-3.5 text-white" />
                        <span>{slide.highlight}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10">
                        <Layers className="w-3.5 h-3.5 text-white" />
                        <span>{slide.subHighlight}</span>
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="rounded-xl bg-white/15 backdrop-blur-xs p-3">
                      <div className="aspect-[16/9] rounded-lg overflow-hidden bg-slate-100 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayImg}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                          <Snowflake className="w-3 h-3" />
                          <span>-18°C Fresh</span>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 text-xs shadow-xs">
                          <div className="truncate pr-1">
                            <span className="text-[10px] text-[#4737FF] font-bold uppercase block leading-none">
                              Sorotan #{idx + 1}
                            </span>
                            <p className="font-bold text-slate-800 truncate mt-0.5">
                              {displayTitle}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-md bg-[#F75C03] text-white text-[11px] font-extrabold shrink-0">
                            {displayPrice}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-white/90 px-1">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>Sameday ≤ 15.00 WIB</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Award className="w-3 h-3" />
                          <span>Stok Batch FEFO</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Pilih banner ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  activeIndex === idx
                    ? 'w-7 bg-[#F75C03]'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
            <span className="ml-2 text-[11px] font-semibold text-white/80 hidden sm:inline">
              {activeIndex + 1} / {SLIDES.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Banner sebelumnya"
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Banner berikutnya"
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 text-slate-600 py-2 border-t border-slate-200 overflow-hidden">
        <div className="ff-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-5 text-[11px] font-semibold text-slate-600 whitespace-nowrap"
            >
              <span>{item}</span>
              <span className="text-[#4737FF] font-bold ml-3">•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}