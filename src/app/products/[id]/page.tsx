'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Snowflake,
  Minus,
  Plus,
  ShoppingBag,
  AlertCircle,
  Scale,
  Box,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/axios';
import {
  formatRupiah,
  getErrorMessage,
  getProductStock,
  hasExplicitStock,
} from '@/lib/utils';
import { ProductCatalogResponse } from '@/types/api';
import { useCartStore } from '@/store/cart-store';
import ShopSidebar from '@/components/shop/sidebar';
import CartPanel from '@/components/shop/cart-panel';

function formatGramDisplay(rawBerat: number | undefined | null): string {
  const val = Number(rawBerat || 0);
  if (val <= 0) return '500 g';
  const grams = val <= 50 ? Math.round(val * 1000) : Math.round(val);
  return `${grams.toLocaleString('id-ID')} g`;
}

function ProductDetailContent() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const addItem = useCartStore((state) => state.addItem);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery<ProductCatalogResponse>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await api.get<ProductCatalogResponse>(
        `/api/products/${productId}`
      );
      return response.data;
    },
    enabled: Boolean(productId),
  });

  const explicitStock = product ? hasExplicitStock(product) : false;
  const safeStock = product ? getProductStock(product) : 0;

  const handleAddToCart = () => {
    if (!product || product.isActive === false || safeStock <= 0) return;
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5E5E6A] hover:text-[#4737FF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </Link>
        </div>

        {isLoading && (
          <div className="ff-card bg-white p-6 sm:p-8 animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-80 rounded-2xl bg-[#F1F3F8]" />
            <div className="space-y-4">
              <div className="h-4 w-24 bg-[#F1F3F8] rounded" />
              <div className="h-8 w-3/4 bg-[#F1F3F8] rounded" />
              <div className="h-6 w-1/3 bg-[#F1F3F8] rounded" />
              <div className="h-24 w-full bg-[#F1F3F8] rounded" />
            </div>
          </div>
        )}

        {isError && (
          <div className="ff-card bg-white p-8 border border-[#E5484D]/30 text-center max-w-md mx-auto">
            <AlertCircle className="w-8 h-8 text-[#E5484D] mx-auto mb-2" />
            <h2 className="font-heading text-base font-bold text-[#171725] mb-1">
              Produk tidak ditemukan
            </h2>
            <p className="text-xs text-[#77788A] mb-4">
              {getErrorMessage(error, 'Gagal memuat detail produk.')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        )}

        {!isLoading && !isError && product && (
          <div className="ff-card bg-white p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F1F3F8] border border-[#E6E8F0] flex items-center justify-center">
              {product.gambar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.gambar}
                  alt={product.namaProduk}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-[#4737FF]/50 bg-gradient-to-br from-[#E7EFFF] to-[#F8FAFF] w-full h-full justify-center">
                  <Snowflake className="w-16 h-16 mb-2" />
                  <span className="text-xs font-bold text-[#77788A]">
                    {product.kategori || 'Froznfood Quality'}
                  </span>
                </div>
              )}

              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[#171725] text-[11px] font-bold shadow-xs">
                  -18°C Cold Chain
                </span>
              </div>
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-lg bg-[#E7EFFF] text-[#4737FF] text-xs font-extrabold uppercase tracking-wider mb-3">
                {product.kategori}
              </span>

              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mb-2">
                {product.namaProduk}
              </h1>

              <div className="mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77788A] block">
                  Harga Eceran
                </span>
                <p className="font-heading text-2xl sm:text-3xl font-extrabold text-[#4737FF]">
                  {formatRupiah(product.hargaEceran)}
                </p>
              </div>

              <p className="text-sm text-[#5E5E6A] leading-relaxed mb-6">
                {product.deskripsiProduk ||
                  'Produk frozen food berkualitas tinggi yang disimpan dengan standar rantai dingin terbaik (-18°C) dan rotasi stok FEFO.'}
              </p>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0] mb-6 text-xs">
                <div>
                  <span className="text-[#77788A] flex items-center gap-1 mb-0.5">
                    <Scale className="w-3.5 h-3.5 text-[#4737FF]" /> Berat
                  </span>
                  <span className="font-bold text-[#171725]">
                    {formatGramDisplay(product.berat)}
                  </span>
                </div>
                <div>
                  <span className="text-[#77788A] flex items-center gap-1 mb-0.5">
                    <Box className="w-3.5 h-3.5 text-[#4737FF]" /> Volume
                  </span>
                  <span className="font-bold text-[#171725]">
                    {product.volume ?? 0} ml
                  </span>
                </div>
                <div>
                  <span className="text-[#77788A] block mb-0.5">
                    Stok Online
                  </span>
                  {explicitStock ? (
                    <span
                      className={`font-extrabold ${
                        safeStock > 0 ? 'text-[#159A68]' : 'text-[#E5484D]'
                      }`}
                    >
                      {safeStock > 0 ? `${safeStock} tersedia` : 'Habis'}
                    </span>
                  ) : (
                    <span className="font-bold text-[#171725]">
                      Sesuai Batch FEFO
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3.5">
                <div className="inline-flex items-center gap-4 rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="text-[#5E5E6A] hover:text-[#4737FF] cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-extrabold text-[#171725] min-w-[20px] text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    disabled={qty >= safeStock}
                    onClick={() => setQty((q) => Math.min(safeStock, q + 1))}
                    className="text-[#5E5E6A] hover:text-[#4737FF] disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={product.isActive === false || safeStock <= 0}
                  onClick={handleAddToCart}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl font-extrabold py-3.5 px-6 text-sm transition-all cursor-pointer ${
                    product.isActive === false || safeStock <= 0
                      ? 'bg-[#F1F3F8] text-[#77788A] cursor-not-allowed'
                      : added
                        ? 'bg-[#159A68] text-white'
                        : 'bg-[#F75C03] hover:bg-[#D94800] text-white shadow-md shadow-[#F75C03]/25'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Berhasil Masuk Keranjang</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        {safeStock > 0 ? 'Tambah ke Keranjang' : 'Stok Habis'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E6E8F0] flex items-center gap-2 text-xs text-[#77788A]">
                <ShieldCheck className="w-4 h-4 text-[#159A68] shrink-0" />
                <span>
                  Jaminan kualitas beku higienis & rotasi batch otomatis (First
                  Expired, First Out).
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      <CartPanel />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="lezzat-shell">
          <ShopSidebar />
          <main className="lezzat-main">
            <div className="ff-card bg-white p-8 animate-pulse h-80" />
          </main>
          <CartPanel />
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}