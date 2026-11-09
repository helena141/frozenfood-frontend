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

function ProductDetailContent() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const addItem = useCartStore((state) => state.addItem);
  const [qty, setQty] = useState(1);

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

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#174634]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </Link>
        </div>

        {isLoading && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-80 rounded-2xl bg-slate-200" />
            <div className="space-y-4">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-8 w-3/4 bg-slate-200 rounded" />
              <div className="h-6 w-1/3 bg-slate-200 rounded" />
              <div className="h-24 w-full bg-slate-200 rounded" />
            </div>
          </div>
        )}

        {isError && (
          <div className="bg-white rounded-3xl p-8 border border-red-200 text-center max-w-md mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Produk tidak ditemukan
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {getErrorMessage(error, 'Gagal memuat detail produk.')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174634] text-white text-xs font-semibold"
            >
              Kembali ke Beranda
            </Link>
          </div>
        )}

        {!isLoading && !isError && product && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/70 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
              {product.gambar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.gambar}
                  alt={product.namaProduk}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-[#174634]/50">
                  <Snowflake className="w-16 h-16 mb-2" />
                  <span className="text-xs font-semibold">
                    {product.kategori}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#f2efe9] text-[#174634] text-xs font-bold uppercase tracking-wider mb-3">
                {product.kategori}
              </span>

              <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                {product.namaProduk}
              </h1>

              <p className="text-2xl font-bold text-[#174634] mb-4">
                {formatRupiah(product.hargaEceran)}
              </p>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {product.deskripsiProduk ||
                  'Produk frozen food berkualitas tinggi yang disimpan dengan standar rantai dingin terbaik.'}
              </p>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#f7f6f2] mb-6 text-xs">
                <div>
                  <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <Scale className="w-3.5 h-3.5" /> Berat
                  </span>
                  <span className="font-bold text-slate-800">
                    {product.berat} g
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <Box className="w-3.5 h-3.5" /> Volume
                  </span>
                  <span className="font-bold text-slate-800">
                    {product.volume ?? 0} ml
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">
                    Stok Online
                  </span>
                  {explicitStock ? (
                    <span
                      className={`font-bold ${
                        safeStock > 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {safeStock > 0 ? `${safeStock} tersedia` : 'Habis'}
                    </span>
                  ) : (
                    <span className="font-bold text-slate-700">
                      Sesuai Batch FEFO
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center gap-4 rounded-2xl border border-slate-200 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-slate-900 min-w-[20px] text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    disabled={qty >= safeStock}
                    onClick={() => setQty((q) => Math.min(safeStock, q + 1))}
                    className="text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={product.isActive === false || safeStock <= 0}
                  onClick={() => addItem(product, qty)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#174634] hover:bg-[#113527] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3.5 px-6 text-sm transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {safeStock > 0 ? 'Tambah ke Keranjang' : 'Stok Habis'}
                  </span>
                </button>
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
            <div className="bg-white rounded-3xl p-8 border border-slate-100 animate-pulse h-80" />
          </main>
          <CartPanel />
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}