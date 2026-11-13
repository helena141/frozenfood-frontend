'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Snowflake,
  ShieldCheck,
  Truck,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Layers,
  CheckCircle2,
  Building2,
  Clock,
  FileText,
  ArrowRight,
  Star,
  Sparkles,
  Tag,
  Utensils,
  Fish,
  Beef,
  Soup,
  Cookie,
  PackageCheck,
  Quote,
  ThumbsUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { ProductCatalogResponse } from '@/types/api';
import { formatRupiah, getErrorMessage, getProductStock } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import ShopSidebar from '@/components/shop/sidebar';
import ProductCard from '@/components/shop/product-card';
import HeroCarousel from '@/components/shop/hero-carousel';
import ShopFooter from '@/components/shop/footer';
import IncompleteProfileBanner from '@/components/auth/incomplete-profile-banner';
import CustomerAvatar from '@/components/shop/customer-avatar';

interface ProductPromoInfo {
  isClearance: boolean;
  discountPercent: number;
  originalPrice: number | null;
  effectivePrice: number;
  stokClearance: number;
  nearestExpDate: string | null;
}

const DEALS_MARQUEE_TEXTS = [
  '🔥 DISKON SPESIAL CLEARANCE H-7 HINGGA 50% & FEFO DEAL H-30 DISKON 20%!',
  '❄️ 100% TERJAGA BEKU PADA SUHU RANTAI DINGIN -18°C & SIAP MASAK HARI INI',
  '💸 HARGA PROMO OTOMATIS TERPOTONG DI KERANJANG & SAAT PEMBAYARAN MIDTRANS',
  '📦 STOK BATCH PROMO TERBATAS — SIAPA CEPAT DIA DAPAT!',
  '🚚 GRATIS ONGKIR RADIUS ≤ 5 KM DENGAN KURIR TOKO BERINSULASI',
];

function resolveProductImageUrl(rawUrl?: string | null): string | null {
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

function extractProductPromo(
  product: ProductCatalogResponse,
  overridePercent?: number
): ProductPromoInfo {
  const raw = product as unknown as Record<string, unknown>;
  const basePrice = Number(product.hargaEceran || 0);

  const isClearance = Boolean(raw.isClearance);
  const stokClearance =
    typeof raw.stokClearance === 'number' ? raw.stokClearance : 0;
  const hargaClearance =
    typeof raw.hargaClearance === 'number' && raw.hargaClearance > 0
      ? raw.hargaClearance
      : null;
  const nearestExpDate =
    typeof raw.nearestExpDate === 'string' && raw.nearestExpDate.trim() !== ''
      ? raw.nearestExpDate.trim()
      : null;

  if (isClearance && hargaClearance !== null && hargaClearance < basePrice) {
    const pct = Math.max(
      1,
      Math.round(((basePrice - hargaClearance) / basePrice) * 100)
    );
    return {
      isClearance: true,
      discountPercent: pct,
      originalPrice: basePrice,
      effectivePrice: hargaClearance,
      stokClearance,
      nearestExpDate,
    };
  }

  if (isClearance) {
    const pct = overridePercent ?? 50;
    const calculatedClearance = Math.round((basePrice * (100 - pct)) / 100);
    return {
      isClearance: true,
      discountPercent: pct,
      originalPrice: basePrice,
      effectivePrice: calculatedClearance,
      stokClearance,
      nearestExpDate,
    };
  }

  if (overridePercent && overridePercent > 0 && overridePercent < 90) {
    const discounted = Math.round((basePrice * (100 - overridePercent)) / 100);
    return {
      isClearance: false,
      discountPercent: overridePercent,
      originalPrice: basePrice,
      effectivePrice: discounted,
      stokClearance: 0,
      nearestExpDate,
    };
  }

  return {
    isClearance: false,
    discountPercent: 0,
    originalPrice: null,
    effectivePrice: basePrice,
    stokClearance: 0,
    nearestExpDate,
  };
}

function getCategoryVisual(categoryName: string) {
  const lower = categoryName.toLowerCase();
  if (
    lower.includes('ikan') ||
    lower.includes('seafood') ||
    lower.includes('udang') ||
    lower.includes('cumi')
  ) {
    return { Icon: Fish, desc: 'Olahan laut segar bebas pengawet' };
  }
  if (
    lower.includes('sapi') ||
    lower.includes('daging') ||
    lower.includes('beef') ||
    lower.includes('sosis')
  ) {
    return { Icon: Beef, desc: 'Potongan & olahan daging pilihan' };
  }
  if (
    lower.includes('bakso') ||
    lower.includes('dimsum') ||
    lower.includes('kuah') ||
    lower.includes('dumpling')
  ) {
    return { Icon: Soup, desc: 'Kenyal, gurih & praktis disajikan' };
  }
  if (
    lower.includes('nugget') ||
    lower.includes('ayam') ||
    lower.includes('chicken') ||
    lower.includes('karaage')
  ) {
    return { Icon: Utensils, desc: 'Lauk praktis favorit keluarga' };
  }
  if (
    lower.includes('kentang') ||
    lower.includes('snack') ||
    lower.includes('camilan') ||
    lower.includes('roti')
  ) {
    return { Icon: Cookie, desc: 'Camilan renyah pendamping santai' };
  }
  return { Icon: Snowflake, desc: 'Kualitas rantai dingin -18°C' };
}

const CUSTOMER_REVIEWS = [
  {
    id: 1,
    name: 'Ibu Ratna Sari',
    role: 'Pelanggan Retail (B2C) • Sleman',
    rating: 5,
    date: '2 hari lalu',
    tag: 'Pengiriman Sameday Cepat',
    comment:
      'Pesan jam 11 siang, jam 1 siang sudah sampai di rumah dalam kondisi masih beku karena kurir tokonya pakai cooler box. Nugget dan dimsumnya segar!',
    verified: true,
  },
  {
    id: 2,
    name: 'Hendra Wijaya (Kedai Dimsum)',
    role: 'Mitra Bisnis (B2B) • Malioboro',
    rating: 5,
    date: '4 hari lalu',
    tag: 'Stok FEFO & Nota PDF',
    comment:
      'Sangat terbantu dengan sistem FEFO Lezzat Frozen Food. Setiap restock untuk kedai, masa kedaluwarsanya selalu panjang dan langsung dapat Nota PDF otomatis.',
    verified: true,
  },
  {
    id: 3,
    name: 'Nadia Putri',
    role: 'Pelanggan Retail (B2C) • Yogyakarta',
    rating: 5,
    date: 'Minggu lalu',
    tag: 'Gratis Ongkir ≤ 5 KM',
    comment:
      'Rumah saya jaraknya 3,8 km dari gudang dan benar-benar dapat Gratis Ongkir! Pembayaran pakai QRIS Midtrans langsung lunas otomatis.',
    verified: true,
  },
  {
    id: 4,
    name: 'Bapak Arifin (Katering Berkah)',
    role: 'Mitra Bisnis (B2B) • Bantul',
    rating: 5,
    date: 'Minggu lalu',
    tag: 'Harga Grosir B2B',
    comment:
      'Begitu login pakai akun B2B, harga grosirnya sangat masuk untuk usaha katering kami. Kualitas bakso sapi dan sosis bratwurst-nya konsisten.',
    verified: true,
  },
];

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [mounted, setMounted] = useState(false);
  const [todayMs, setTodayMs] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [addedDealId, setAddedDealId] = useState<string | null>(null);
  const [isDealsPaused, setIsDealsPaused] = useState(false);

  const dealsSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setTodayMs(now.getTime());
  }, []);

  const scrollDealsSlider = (direction: 'left' | 'right') => {
    const slider = dealsSliderRef.current;
    if (!slider) return;
    const step = 362;
    if (direction === 'right') {
      const isAtEnd =
        slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 24;
      if (isAtEnd) {
        slider.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: step, behavior: 'smooth' });
      }
    } else {
      slider.scrollBy({ left: -step, behavior: 'smooth' });
    }
  };

  const {
    data: products = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProductCatalogResponse[]>({
    queryKey: ['catalog-products'],
    queryFn: async () => {
      const res = await api.get<ProductCatalogResponse[]>('/api/products');
      return res.data;
    },
  });

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive !== false),
    [products]
  );

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; sampleImg?: string }>();
    activeProducts.forEach((p) => {
      const cat = (p.kategori || 'Lainnya').trim();
      const prev = map.get(cat) || { count: 0, sampleImg: undefined };
      map.set(cat, {
        count: prev.count + 1,
        sampleImg: prev.sampleImg || p.gambar || undefined,
      });
    });
    return Array.from(map.entries()).map(([name, info]) => ({
      name,
      count: info.count,
      sampleImg: info.sampleImg,
    }));
  }, [activeProducts]);

  const fefoDealProducts = useMemo(() => {
    const available = activeProducts.filter((p) => getProductStock(p) > 0);
    const clearanceItems = available.filter((p) => {
      const raw = p as unknown as Record<string, unknown>;
      return Boolean(raw.isClearance);
    });

    const sourceList =
      clearanceItems.length > 0
        ? clearanceItems
        : [...available]
            .sort((a, b) => getProductStock(a) - getProductStock(b))
            .slice(0, 8);

    return sourceList.map((product, idx) => {
      const totalStock = getProductStock(product);
      const fallbackPct = idx % 2 === 0 ? 20 : 15;
      const promo = extractProductPromo(
        product,
        clearanceItems.length > 0 ? undefined : fallbackPct
      );

      const originalPrice = promo.originalPrice ?? product.hargaEceran;
      const discountedPrice = promo.effectivePrice;
      const savedAmount = Math.max(0, originalPrice - discountedPrice);
      const displayStock =
        promo.stokClearance > 0 ? promo.stokClearance : totalStock;

      let daysLeft: number | null = null;
      if (promo.nearestExpDate && todayMs !== null) {
        const expDate = new Date(`${promo.nearestExpDate}T00:00:00`);
        if (!Number.isNaN(expDate.getTime())) {
          const diffDays = Math.ceil(
            (expDate.getTime() - todayMs) / (1000 * 60 * 60 * 24)
          );
          daysLeft = Math.max(0, diffDays);
        }
      }

      return {
        product,
        isRealClearance: promo.isClearance,
        displayStock,
        nearestExpDate: promo.nearestExpDate,
        daysLeft,
        discountPct: promo.discountPercent,
        originalPrice,
        discountedPrice,
        savedAmount,
      };
    });
  }, [activeProducts, todayMs]);

  useEffect(() => {
    if (isDealsPaused || fefoDealProducts.length <= 1) return;
    const timer = setInterval(() => {
      const slider = dealsSliderRef.current;
      if (!slider) return;
      const isAtEnd =
        slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 24;
      if (isAtEnd) {
        slider.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: 362, behavior: 'smooth' });
      }
    }, 3200);

    return () => clearInterval(timer);
  }, [isDealsPaused, fefoDealProducts.length]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      const matchesCat =
        selectedCategory === 'ALL' ||
        (product.kategori || 'Lainnya').toLowerCase() ===
          selectedCategory.toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        product.namaProduk.toLowerCase().includes(q) ||
        (product.kategori && product.kategori.toLowerCase().includes(q)) ||
        (product.deskripsiProduk &&
          product.deskripsiProduk.toLowerCase().includes(q));

      const matchesStock = !onlyAvailable || getProductStock(product) > 0;

      return matchesCat && matchesSearch && matchesStock;
    });
  }, [activeProducts, selectedCategory, searchQuery, onlyAvailable]);

  const handleQuickAddDeal = (
    product: ProductCatalogResponse,
    discountedPrice: number
  ) => {
    if (getProductStock(product) <= 0) return;
    addItem(
      {
        ...product,
        hargaEceran: discountedPrice,
      },
      1
    );
    setAddedDealId(product.idProduk);
    setTimeout(() => setAddedDealId(null), 1300);
  };

  const totalCartItems = mounted ? getTotalItems() : 0;
  void items;

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        <div className="max-w-[1200px] mx-auto space-y-5 sm:space-y-6">
          <IncompleteProfileBanner />

          {/* Header Bar Pencarian, Foto Profil & Keranjang */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari bakso, nugget, dimsum, sosis premium..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 focus:bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:border-[#4737FF] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2.5">
              {mounted && user && (
                <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  {/* Klik foto untuk melihat ukuran penuh (Popup) */}
                  <CustomerAvatar
                    user={user as unknown as Record<string, unknown>}
                    size="sm"
                    enablePreview
                  />
                  {/* Klik nama untuk menuju halaman Profil */}
                  <Link
                    href="/profile"
                    className="hidden sm:flex items-center gap-1.5 hover:text-[#4737FF] transition-colors"
                  >
                    <span className="text-slate-500">Halo,</span>
                    <strong className="text-slate-800">{user.nama}</strong>
                    <span className="px-2 py-0.5 rounded-md bg-[#4737FF]/10 text-[#4737FF] text-[10px] font-extrabold">
                      {user.tipeAkun}
                    </span>
                  </Link>
                </div>
              )}

              <Link
                href="/checkout"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold shadow-2xs transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Keranjang</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white text-[#F75C03] text-[10px] font-extrabold">
                  {totalCartItems}
                </span>
              </Link>
            </div>
          </div>

          {/* Banner Hero Ringkas + Running Marquee */}
          <HeroCarousel featuredProducts={activeProducts} />

          {/* Strip Keunggulan Utama */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Produk Berkualitas',
                  desc: 'Bahan pilihan berkualitas tinggi & bersertifikasi higienis.',
                },
                {
                  icon: Snowflake,
                  title: 'Suhu -18°C Terjaga',
                  desc: 'Freezer dikontrol ketat dengan rotasi stok FEFO otomatis.',
                },
                {
                  icon: Truck,
                  title: 'Pengiriman Aman',
                  desc: 'Kurir berinsulasi menjaga kesegaran hingga pintu Anda.',
                },
                {
                  icon: CheckCircle2,
                  title: 'Belanja Praktis',
                  desc: 'Pemesanan cepat, transparan & nota PDF otomatis.',
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`flex items-start gap-3 ${
                      idx > 0 ? 'pt-3 sm:pt-0 sm:pl-4' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#4737FF]/10 text-[#4737FF] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-heading text-xs font-bold text-slate-800">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 1. SHOP BY CATEGORY */}
          {categories.length > 0 && (
            <section
              id="kategori-pilihan"
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#4737FF]">
                    <Sparkles className="w-3 h-3 text-[#F75C03]" />
                    <span>SHOP BY CATEGORY</span>
                  </span>
                  <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-800">
                    Belanja Berdasarkan Kategori
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    document
                      .getElementById('katalog-produk')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#4737FF] hover:underline cursor-pointer"
                >
                  Semua Kategori ({activeProducts.length}) →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {categories.map((cat) => {
                  const visual = getCategoryVisual(cat.name);
                  const Icon = visual.Icon;
                  const isSelected = selectedCategory === cat.name;

                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(isSelected ? 'ALL' : cat.name);
                        document
                          .getElementById('katalog-produk')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`group text-left p-3.5 rounded-xl transition-all cursor-pointer flex flex-col justify-between min-h-[116px] ${
                        isSelected
                          ? 'bg-[#4737FF] text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-[#4737FF]/8 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#4737FF]/10 text-[#4737FF]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-slate-600'
                          }`}
                        >
                          {cat.count} item
                        </span>
                      </div>

                      <div className="mt-3">
                        <p
                          className={`font-heading text-xs font-extrabold line-clamp-1 ${
                            isSelected ? 'text-white' : 'text-slate-800'
                          }`}
                        >
                          {cat.name}
                        </p>
                        <p
                          className={`text-[11px] line-clamp-1 mt-0.5 ${
                            isSelected ? 'text-white/80' : 'text-slate-500'
                          }`}
                        >
                          {visual.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. FEFO FLASH FOOD DEALS (Auto-Scroll + Running Marquee Diskon Spesial) */}
          {fefoDealProducts.length > 0 && (
            <section
              id="fefo-deals"
              onMouseEnter={() => setIsDealsPaused(true)}
              onMouseLeave={() => setIsDealsPaused(false)}
              className="relative rounded-2xl overflow-hidden border border-[#F75C03]/40 shadow-sm text-white"
              style={{
                background:
                  'linear-gradient(135deg, #F75C03 0%, #D93800 50%, #3529BF 100%)',
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(rgba(255, 255, 255, 0.75) 1px, transparent 1px), repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 8px, transparent 8px, transparent 16px)',
                  backgroundSize: '14px 14px, 100% 100%',
                }}
              />

              {/* Pita Teks Berjalan Diskon Spesial */}
              <div className="relative z-10 bg-black/20 backdrop-blur-xs border-b border-white/15 py-1.5 overflow-hidden">
                <div className="ff-marquee-track">
                  {[...DEALS_MARQUEE_TEXTS, ...DEALS_MARQUEE_TEXTS].map(
                    (text, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-5 text-[11px] font-extrabold text-amber-200 whitespace-nowrap tracking-wide"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                        <span>{text}</span>
                        <span className="text-white/50 ml-3">•</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="relative z-10 p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/20">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-300 text-slate-900 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                        <Zap className="w-3 h-3 fill-slate-900" />
                        <span>BIG DEALS • FEFO FLASH SALE</span>
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-[10px] font-semibold text-white">
                        <Snowflake className="w-3 h-3 text-amber-300" />
                        <span>Kualitas Fresh -18°C Terjamin</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-300/30 text-[10px] font-bold text-emerald-100">
                        <span>
                          {isDealsPaused ? '⏸ Dijeda' : '▶ Geser Otomatis'}
                        </span>
                      </span>
                    </div>

                    <h2 className="font-heading text-sm sm:text-base font-extrabold text-white tracking-tight">
                      Penawaran Batch Prioritas FEFO (H-30 Diskon 20% • Clearance H-7 Diskon 50%)
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold text-white/85 mr-1 hidden md:inline">
                      {fefoDealProducts.length} produk promo
                    </span>
                    <button
                      type="button"
                      onClick={() => scrollDealsSlider('left')}
                      aria-label="Geser produk promo ke kiri"
                      className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollDealsSlider('right')}
                      aria-label="Geser produk promo ke kanan"
                      className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={dealsSliderRef}
                  className="flex items-stretch gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {fefoDealProducts.map(
                    ({
                      product,
                      displayStock,
                      nearestExpDate,
                      daysLeft,
                      discountPct,
                      originalPrice,
                      discountedPrice,
                      savedAmount,
                    }) => {
                      const isAdded = addedDealId === product.idProduk;
                      const imgUrl = resolveProductImageUrl(product.gambar);

                      return (
                        <div
                          key={product.idProduk}
                          className="w-[310px] sm:w-[350px] shrink-0 snap-start group rounded-xl bg-white text-slate-800 p-3 shadow-sm hover:shadow-md transition-all flex items-center gap-3"
                        >
                          <Link
                            href={`/products/${product.idProduk}`}
                            className="relative w-24 h-24 sm:w-26 sm:h-26 rounded-lg bg-slate-100 overflow-hidden block shrink-0"
                          >
                            {imgUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imgUrl}
                                alt={product.namaProduk}
                                className="w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#4737FF]/40">
                                <Snowflake className="w-6 h-6" />
                              </div>
                            )}

                            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F75C03] text-white text-[9px] font-extrabold shadow-2xs">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Diskon {discountPct}%</span>
                            </div>

                            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-white/95 text-[#D93800] text-[9px] font-extrabold truncate shadow-2xs">
                                {daysLeft !== null
                                  ? `⏳ Exp ${daysLeft} Hari Lagi`
                                  : nearestExpDate
                                    ? `Exp ${nearestExpDate}`
                                    : 'Prioritas FEFO'}
                              </span>
                            </div>
                          </Link>

                          <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-1.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#4737FF] truncate">
                                  {product.kategori || 'Batch FEFO'}
                                </span>
                                {savedAmount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-[#D93800] text-[9px] font-extrabold shrink-0">
                                    Hemat {formatRupiah(savedAmount)}
                                  </span>
                                )}
                              </div>

                              <Link
                                href={`/products/${product.idProduk}`}
                                className="font-heading text-xs sm:text-[13px] font-extrabold text-slate-800 hover:text-[#4737FF] line-clamp-1 block"
                              >
                                {product.namaProduk}
                              </Link>

                              <div className="pt-0.5">
                                <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                                  <span>Stok Batch Promo</span>
                                  <span className="font-bold text-[#F75C03]">
                                    Sisa {displayStock} pack
                                  </span>
                                </div>
                                <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#F75C03] to-amber-500 rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        90,
                                        Math.max(25, 100 - displayStock)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-end justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 leading-none">
                                  <span className="text-[10px] text-slate-400 line-through font-semibold">
                                    {formatRupiah(originalPrice)}
                                  </span>
                                  <span className="text-[9px] font-extrabold text-[#159A68]">
                                    (-{discountPct}%)
                                  </span>
                                </div>
                                <span className="font-heading text-sm font-extrabold text-[#F75C03] block whitespace-nowrap mt-0.5">
                                  {formatRupiah(discountedPrice)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickAddDeal(product, discountedPrice)
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 shadow-2xs ${
                                  isAdded
                                    ? 'bg-[#159A68] text-white'
                                    : 'bg-[#F75C03] hover:bg-[#D94800] text-white'
                                }`}
                              >
                                <ShoppingBag className="w-3 h-3" />
                                <span>
                                  {isAdded ? 'Masuk!' : '+ Ambil Deal'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 3. KATALOG LENGKAP FROZEN FOOD */}
          <section id="katalog-produk" className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-800">
                    Katalog Lengkap Lezzat Frozen Food
                  </h2>
                  <p className="text-xs text-slate-500">
                    Menampilkan {filteredProducts.length} produk dari inventori
                    aktif FEFO
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedCategory !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('ALL')}
                      className="px-3 py-1.5 rounded-lg bg-[#4737FF]/10 text-[#4737FF] text-xs font-bold cursor-pointer"
                    >
                      Filter: {selectedCategory} ✕
                    </button>
                  )}

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-[#4737FF]"
                    />
                    <span>Stok Tersedia</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#4737FF]" />
                    <span>Segarkan</span>
                  </button>
                </div>
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === 'ALL'
                        ? 'bg-[#4737FF] text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua ({activeProducts.length})
                  </button>
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#4737FF] text-white'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cat.name} ({cat.count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border border-slate-200 bg-white h-72 animate-pulse p-3.5 space-y-3"
                  >
                    <div className="h-40 rounded-lg bg-slate-100" />
                    <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                    <div className="h-3.5 w-1/2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && isError && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center max-w-md mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h3 className="font-heading text-sm font-bold text-slate-800 mb-1">
                  Gagal Memuat Katalog Produk
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {getErrorMessage(
                    error,
                    'Pastikan server backend sedang berjalan.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-4 py-2 rounded-lg bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
                >
                  Muat Ulang Katalog
                </button>
              </div>
            )}

            {!isLoading && !isError && filteredProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                <Layers className="w-8 h-8 text-[#4737FF]/50 mx-auto mb-2" />
                <h3 className="font-heading text-sm font-bold text-slate-800 mb-1">
                  Produk Tidak Ditemukan
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Coba ubah kata kunci pencarian atau reset filter kategori.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setOnlyAvailable(false);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            )}

            {!isLoading && !isError && filteredProducts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.idProduk} product={product} />
                ))}
              </div>
            )}
          </section>

          {/* 4. PENILAIAN & ULASAN PELANGGAN */}
          <section
            id="ulasan-pelanggan"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center pb-4 border-b border-slate-100">
              <div className="lg:col-span-5 flex items-center gap-4">
                <div className="w-18 h-18 rounded-2xl bg-[#4737FF] text-white flex flex-col items-center justify-center shrink-0 p-3">
                  <span className="font-heading text-2xl font-extrabold leading-none">
                    4.9
                  </span>
                  <span className="text-[10px] text-white/80 mt-1">
                    dari 5.0
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#159A68] text-[10px] font-bold">
                    <ThumbsUp className="w-3 h-3" />
                    <span>99% Pelanggan Puas</span>
                  </span>
                  <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-800">
                    Penilaian Toko dari Pelanggan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ulasan terverifikasi pelanggan B2C & mitra usaha B2B.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">
                      Suhu Beku
                    </span>
                    <span className="font-extrabold text-[#159A68]">5.0 ★</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tetap -18°C saat tiba
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">
                      Kurir Toko
                    </span>
                    <span className="font-extrabold text-[#4737FF]">4.9 ★</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tepat sesuai estimasi WIB
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">
                      Stok FEFO
                    </span>
                    <span className="font-extrabold text-[#4737FF]">4.9 ★</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Masa kedaluwarsa panjang
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {CUSTOMER_REVIEWS.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl bg-slate-50 flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5 text-[#F75C03]">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 fill-[#F75C03] text-[#F75C03]"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {rev.date}
                      </span>
                    </div>

                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#4737FF]/10 text-[#4737FF] text-[10px] font-bold">
                      {rev.tag}
                    </span>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      <Quote className="w-3 h-3 text-slate-400 inline mr-1 -mt-0.5" />
                      {rev.comment}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {rev.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {rev.role}
                      </p>
                    </div>
                    {rev.verified && (
                      <span
                        title="Transaksi Terverifikasi"
                        className="w-5 h-5 rounded-full bg-emerald-50 text-[#159A68] flex items-center justify-center shrink-0"
                      >
                        <PackageCheck className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. TENTANG LEZZAT FROZEN FOOD */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-7 space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#4737FF]/10 text-[#4737FF] text-[10px] font-extrabold uppercase tracking-wider">
                TENTANG LEZZAT FROZEN FOOD
              </span>
              <h2 className="font-heading text-base sm:text-lg font-extrabold text-slate-800">
                Solusi Rantai Dingin Terpadu untuk Rumah Tangga & Bisnis Kuliner
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong>Lezzat Frozen Food (Froznfood 2.0)</strong>{' '}
                mengintegrasikan manajemen inventori{' '}
                <em>First Expired, First Out (FEFO)</em> dengan pengiriman
                berpendingin. Baik untuk belanja rumah tangga (B2C) maupun
                pasokan rutin restoran, kafe, dan reseller (B2B).
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Gabung Mitra B2B / Pelanggan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#4737FF]" />
                  <span>Lacak Pesanan & Nota PDF</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-[#4737FF]/10 text-[#4737FF] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <p className="font-heading font-bold text-slate-800">
                  Jadwal Sameday
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Buka 09.00–21.00 WIB. Pesan sebelum 15.00 WIB dikirim hari ini.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#159A68] flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="font-heading font-bold text-slate-800">
                  Nota PDF Resmi
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pembayaran QRIS & VA Midtrans disertai unduhan invoice PDF.
                </p>
              </div>
            </div>
          </section>

          <ShopFooter />
        </div>
      </main>
    </div>
  );
}