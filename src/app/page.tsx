'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Bell,
  Clock,
  ArrowRight,
  LayoutGrid,
  Star,
  Box,
  Snowflake,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatTanggalIndo, getErrorMessage } from '@/lib/utils';
import { ProductCatalogResponse } from '@/types/api';
import { useAuthStore } from '@/store/auth-store';
import ShopSidebar from '@/components/shop/sidebar';
import ProductCard from '@/components/shop/product-card';
import CartPanel from '@/components/shop/cart-panel';

export default function HomeCatalogPage() {
  const user = useAuthStore((state) => state.user);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [todayDate, setTodayDate] = useState<string>('');

  // Membaca tanggal di sisi klien setelah komponen ter-mount (mencegah error Next.js 16 new Date())
  useEffect(() => {
    setTodayDate(formatTanggalIndo(new Date()));
  }, []);

  const {
    data: products = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProductCatalogResponse[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<ProductCatalogResponse[]>('/api/products');
      return response.data;
    },
  });

  // Menghitung daftar kategori unik beserta jumlah produknya
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const kat = p.kategori || 'Lainnya';
      counts[kat] = (counts[kat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [products]);

  // Filter produk berdasarkan pencarian dan kategori
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCategory =
        selectedCategory === 'SEMUA' || product.kategori === selectedCategory;
      const keyword = searchKeyword.trim().toLowerCase();
      const matchKeyword =
        !keyword ||
        product.namaProduk.toLowerCase().includes(keyword) ||
        (product.deskripsiProduk &&
          product.deskripsiProduk.toLowerCase().includes(keyword)) ||
        (product.kategori && product.kategori.toLowerCase().includes(keyword));
      return matchCategory && matchKeyword;
    });
  }, [products, selectedCategory, searchKeyword]);

  const userInitials = user?.nama
    ? user.nama
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'LZ';

  return (
    <div className="lezzat-shell">
      {/* Kolom 1: Sidebar Kiri */}
      <ShopSidebar />

      {/* Kolom 2: Konten Utama Katalog */}
      <main className="lezzat-main">
        {/* Top Bar: Search & Profil */}
        <header className="flex items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari nugget, dimsum, sosis..."
              aria-label="Cari produk"
              className="w-full rounded-2xl bg-white border border-slate-200 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#174634] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifikasi"
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <Bell className="w-4 h-4" />
            </button>

            {user ? (
              <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-full pl-1.5 pr-3.5 py-1">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                  {userInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-none">
                    {user.nama}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Pelanggan {user.tipeAkun}
                  </p>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-full bg-[#174634] text-white text-xs font-semibold hover:bg-[#113527]"
              >
                Masuk
              </Link>
            )}
          </div>
        </header>

        {/* Baris Sapaan & Jam Operasional */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 mb-1 min-h-[16px]">
              {todayDate}
            </p>
            <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
              Selamat datang, {user ? user.nama.split(' ')[0] : 'Sahabat Lezzat'}.
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Mau masak praktis apa hari ini?
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 text-xs text-slate-600 self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-[#174634]" />
            <span>Antar hari ini, 09:00–21:00 WIB</span>
          </div>
        </section>

        {/* Hero Promo Banner sesuai Figma */}
        <section className="relative rounded-3xl bg-[#174634] text-white p-7 sm:p-10 mb-8 overflow-hidden">
          <div className="relative z-10 max-w-md">
            <span className="inline-block px-3 py-1 rounded-full bg-[#e26d53] text-white text-[10px] font-bold tracking-wider uppercase mb-4">
              PROMO MINGGU INI
            </span>
            <h2 className="font-serif-title text-3xl sm:text-4xl font-bold leading-tight mb-3">
              Makin banyak, makin hemat.
            </h2>
            <p className="text-xs sm:text-sm text-emerald-50/85 mb-6">
              Stok kebutuhan lauk beku pilihan keluarga dengan pengiriman terjaga dingin sampai ke pintu rumahmu.
            </p>
            <a
              href="#katalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#174634] text-xs font-bold hover:bg-emerald-50 transition-colors"
            >
              <span>Belanja sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* Filter Kategori (PILIHAN KATEGORI) */}
        <section id="katalog" className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                PILIHAN KATEGORI
              </p>
              <h2 className="font-serif-title text-xl font-bold text-slate-900">
                Mau makan apa?
              </h2>
            </div>
            {selectedCategory !== 'SEMUA' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('SEMUA')}
                className="text-xs font-semibold text-[#174634] hover:underline cursor-pointer"
              >
                Reset filter
              </button>
            )}
          </div>

          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('SEMUA')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedCategory === 'SEMUA'
                  ? 'border-[#174634] bg-[#174634]/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#174634] text-white flex items-center justify-center shrink-0">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Semua Produk
                </p>
                <p className="text-[11px] text-slate-400">
                  {products.length} produk
                </p>
              </div>
            </button>

            {categories.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'border-[#174634] bg-[#174634]/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    idx % 2 === 0
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-sky-50 text-sky-600'
                  }`}
                >
                  {idx % 2 === 0 ? (
                    <Star className="w-4 h-4" />
                  ) : (
                    <Box className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {cat.count} produk
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Daftar Produk (PALING DISUKAI / Produk populer) */}
        <section id="populer">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                PALING DISUKAI
              </p>
              <h2 className="font-serif-title text-xl font-bold text-slate-900">
                Produk populer
              </h2>
            </div>
          </div>

          {/* 1. KONDISI LOADING */}
          {isLoading && (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}
            >
              {[1, 2, 3, 4].map((skeleton) => (
                <div
                  key={skeleton}
                  className="bg-white rounded-3xl p-4 border border-slate-100 animate-pulse"
                >
                  <div className="h-44 w-full rounded-2xl bg-slate-200 mb-3" />
                  <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-9 w-9 rounded-full bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. KONDISI ERROR */}
          {isError && (
            <div className="rounded-3xl bg-white border border-red-200 p-8 text-center max-w-md mx-auto my-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Gagal memuat katalog produk
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {getErrorMessage(
                  error,
                  'Pastikan server backend Spring Boot di port 8080 sudah menyala.'
                )}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174634] text-white text-xs font-semibold hover:bg-[#113527] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {/* 3. KONDISI KOSONG */}
          {!isLoading && !isError && filteredProducts.length === 0 && (
            <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center my-4">
              <Snowflake className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Produk tidak ditemukan
              </h3>
              <p className="text-xs text-slate-500">
                {searchKeyword || selectedCategory !== 'SEMUA'
                  ? 'Tidak ada produk yang cocok dengan pencarian atau kategori yang dipilih.'
                  : 'Belum ada produk di dalam database katalog.'}
              </p>
            </div>
          )}

          {/* 4. KONDISI DATA TERSEDIA */}
          {!isLoading && !isError && filteredProducts.length > 0 && (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}
            >
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.idProduk}
                  product={product}
                  badgeText={
                    index === 0
                      ? 'TERLARIS'
                      : index === 1
                        ? 'FAVORIT'
                        : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Kolom 3: Panel Keranjang Kanan */}
      <CartPanel />
    </div>
  );
}