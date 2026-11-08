'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Minus,
  Plus,
  Snowflake,
  ShoppingBag,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatRupiah } from '@/lib/utils';

export default function CartPanel() {
  const { items, updateQty, removeItem, getTotalItems, getSubtotal } =
    useCartStore();

  // Mencegah hydration mismatch antara SSR (0 item) dan localStorage di browser
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayItems = mounted ? items : [];
  const totalItems = mounted ? getTotalItems() : 0;
  const subtotal = mounted ? getSubtotal() : 0;

  return (
    <aside className="lezzat-cart">
      <div className="flex-1 overflow-y-auto pr-1">
        {/* Header Keranjang */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif-title text-xl font-bold text-slate-900">
            Keranjangmu
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-[#f2efe9] text-slate-700 text-xs font-semibold">
            {totalItems} item
          </span>
        </div>

        {/* Kondisi Keranjang Kosong */}
        {displayItems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Keranjang masih kosong
            </p>
            <p className="text-xs text-slate-400">
              Pilih produk frozen food favoritmu dari katalog untuk mulai
              belanja.
            </p>
          </div>
        ) : (
          /* Daftar Item di Keranjang */
          <div className="space-y-4">
            {displayItems.map(({ product, qty }) => {
              const safeQty = Number.isNaN(qty) || qty < 1 ? 1 : qty;
              const maxStock =
                typeof product.totalStokOnline === 'number' &&
                !Number.isNaN(product.totalStokOnline)
                  ? product.totalStokOnline
                  : 99;

              return (
                <div
                  key={product.idProduk}
                  className="flex items-start gap-3 pb-4 border-b border-slate-100"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {product.gambar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.gambar}
                        alt={product.namaProduk}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Snowflake className="w-5 h-5 text-[#174634]/40" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {product.namaProduk}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(product.idProduk)}
                        aria-label={`Hapus ${product.namaProduk}`}
                        className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5 mb-2">
                      {formatRupiah(product.hargaEceran)}
                    </p>

                    {/* Tombol Kuantitas (- 1 +) */}
                    <div className="inline-flex items-center gap-3 rounded-full bg-[#f2efe9] px-2.5 py-1">
                      <button
                        type="button"
                        onClick={() => updateQty(product.idProduk, safeQty - 1)}
                        aria-label="Kurangi jumlah"
                        className="text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-900 min-w-[14px] text-center">
                        {safeQty}
                      </span>
                      <button
                        type="button"
                        disabled={safeQty >= maxStock}
                        onClick={() => updateQty(product.idProduk, safeQty + 1)}
                        aria-label="Tambah jumlah"
                        className="text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ringkasan & Tombol Checkout */}
      <div className="pt-5 border-t border-slate-200 mt-4">
        <div className="space-y-2 text-xs mb-4">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium text-slate-700">
              {formatRupiah(subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Pengiriman</span>
            <span className="font-semibold text-[#174634]">Gratis ≤ 5 km</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
            <span>Total</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
        </div>

        <Link
          href={displayItems.length > 0 ? '/checkout' : '#'}
          aria-disabled={displayItems.length === 0}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-5 text-xs font-semibold transition-colors ${
            displayItems.length > 0
              ? 'bg-[#174634] hover:bg-[#113527] text-white'
              : 'bg-slate-200 text-slate-400 pointer-events-none'
          }`}
        >
          <span>Checkout sekarang</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Snowflake className="w-3.5 h-3.5 text-sky-500" />
          <span>Dijaga beku hingga tiba di rumah</span>
        </div>
      </div>
    </aside>
  );
}