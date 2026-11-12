'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Snowflake,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { ProductCatalogResponse } from '@/types/api';
import { getErrorMessage, getProductStock } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import ShopSidebar from '@/components/shop/sidebar';
import ProductCard from '@/components/shop/product-card';
import IncompleteProfileBanner from '@/components/auth/incomplete-profile-banner';

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const map = new Map<string, number>();
    activeProducts.forEach((p) => {
      const cat = (p.kategori || 'Lainnya').trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [activeProducts]);

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

  const featuredVisualProduct = useMemo(
    () => activeProducts.find((p) => Boolean(p.gambar)) || activeProducts[0],
    [activeProducts]
  );

  const totalCartItems = mounted ? getTotalItems() : 0;
  void items;

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main space-y-8">
        <IncompleteProfileBanner />

        {/* Header Bar Pencarian & Keranjang */}
        <div className="bg-white rounded-2xl border border-[#E6E8F0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="relative flex-1 min-w-[240px] max-w-xl">
            <Search className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari bakso, nugget, dimsum, sosis premium..."
              className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-4 py-2.5 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {mounted && user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFF] border border-[#E6E8F0] text-xs">
                <span className="text-[#77788A]">Halo,</span>
                <strong className="text-[#171725]">{user.nama}</strong>
                <span className="px-2 py-0.5 rounded bg-[#E7EFFF] text-[#4737FF] text-[10px] font-extrabold">
                  {user.tipeAkun}
                </span>
              </div>
            )}

            <Link
              href="/checkout"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold shadow-sm shadow-[#F75C03]/25 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Keranjang</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-[#F75C03] text-[10px] font-extrabold">
                {totalCartItems}
              </span>
            </Link>
          </div>
        </div>

        {/* Hero Section Froznfood 2.0 */}
        <section className="ff-hero-gradient rounded-3xl p-7 sm:p-10 lg:p-12 text-white relative overflow-hidden shadow-lg shadow-[#4737FF]/15">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB36B]" />
                <span>FROZNFOOD 2.0 • FRESHNESS IN EVERY BITE</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold leading-[1.12] tracking-tight">
                Frozen Favorites, Delivered Fresh.
              </h1>

              <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-xl">
                Nikmati pilihan frozen food berkualitas untuk keluarga dengan
                harga terbaik dan pengiriman yang praktis.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#katalog-produk"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#F75C03]/30 transition-all"
                >
                  <span>Belanja Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-xs transition-colors"
                >
                  <span>Pesanan Saya</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-3xl p-4 shadow-2xl">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#101018]/40 relative">
                  {featuredVisualProduct?.gambar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredVisualProduct.gambar}
                      alt={featuredVisualProduct.namaProduk}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="https://images.unsplash.com/photo-1625938144755-652e08e359b7?w=800&auto=format&fit=crop&q=80"
                      alt="Premium Frozen Food"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-3 left-3 right-3 bg-[#101018]/80 backdrop-blur-md rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-[#ACA5FF] font-bold uppercase block">
                        Produk Pilihan Katalog
                      </span>
                      <p className="font-bold text-white truncate">
                        {featuredVisualProduct?.namaProduk ||
                          'Koleksi Bakso, Dimsum & Nugget Premium'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#159A68] text-white text-[10px] font-extrabold shrink-0">
                      -18°C Fresh
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Froznfood */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: ShieldCheck,
              title: 'Produk Berkualitas',
              desc: 'Terbuat dari bahan pilihan berkualitas tinggi dan bersertifikasi higienis.',
            },
            {
              icon: Snowflake,
              title: 'Penyimpanan Terjaga',
              desc: 'Suhu freezer -18°C dikontrol ketat dengan rotasi stok FEFO otomatis.',
            },
            {
              icon: Truck,
              title: 'Pengiriman Terpercaya',
              desc: 'Armada kurir berinsulasi menjaga kesegaran hingga tiba di pintu Anda.',
            },
            {
              icon: CheckCircle2,
              title: 'Belanja Praktis',
              desc: 'Pemesanan cepat, transparan, dan dilengkapi unduhan invoice resmi.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="ff-card p-5 flex items-start gap-3.5 bg-white"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#171725]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#77788A] mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Kategori Produk */}
        {categories.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg sm:text-xl font-extrabold text-[#171725]">
                  Kategori Produk
                </h2>
                <p className="text-xs text-[#77788A]">
                  Pilih kategori sesuai kebutuhan hidangan Anda
                </p>
              </div>
              {selectedCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs font-bold text-[#4737FF] hover:underline cursor-pointer"
                >
                  Tampilkan Semua ({activeProducts.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#4737FF] text-white shadow-sm shadow-[#4737FF]/25'
                    : 'bg-white border border-[#E6E8F0] text-[#5E5E6A] hover:border-[#4737FF]'
                }`}
              >
                Semua Kategori ({activeProducts.length})
              </button>

              {categories.map((cat) => {
                const isActive = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#4737FF] text-white shadow-sm shadow-[#4737FF]/25'
                        : 'bg-white border border-[#E6E8F0] text-[#171725] hover:border-[#4737FF]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F1F3F8] text-[#77788A]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Grid Katalog Produk */}
        <section id="katalog-produk" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-[#171725]">
                Katalog Frozen Food Pilihan
              </h2>
              <p className="text-xs text-[#77788A]">
                Menampilkan {filteredProducts.length} produk dari inventori aktif
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E6E8F0] text-xs font-semibold text-[#171725] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#4737FF]"
                />
                <span>Hanya Stok Tersedia</span>
              </label>

              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E6E8F0] hover:bg-[#F1F3F8] text-xs font-semibold text-[#171725] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="ff-card h-80 animate-pulse bg-white p-4 space-y-4"
                >
                  <div className="h-44 rounded-2xl bg-[#F1F3F8]" />
                  <div className="h-4 w-2/3 rounded bg-[#F1F3F8]" />
                  <div className="h-4 w-1/2 rounded bg-[#F1F3F8]" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="ff-card p-8 text-center max-w-lg mx-auto my-6">
              <AlertCircle className="w-10 h-10 text-[#E5484D] mx-auto mb-3" />
              <h3 className="font-heading text-base font-bold text-[#171725] mb-1">
                Gagal Memuat Katalog Produk
              </h3>
              <p className="text-xs text-[#77788A] mb-5">
                {getErrorMessage(
                  error,
                  'Pastikan server backend sedang berjalan.'
                )}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-5 py-2.5 rounded-xl bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
              >
                Muat Ulang Katalog
              </button>
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length === 0 && (
            <div className="ff-card p-12 text-center">
              <Layers className="w-10 h-10 text-[#ACA5FF] mx-auto mb-3" />
              <h3 className="font-heading text-base font-bold text-[#171725] mb-1">
                Produk Tidak Ditemukan
              </h3>
              <p className="text-xs text-[#77788A] mb-4">
                Coba ubah kata kunci pencarian atau reset filter kategori.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setOnlyAvailable(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.idProduk} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}