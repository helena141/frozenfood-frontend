'use client';

import React, { useSyncExternalStore } from 'react';
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
import { useAuthStore } from '@/store/auth-store';
import {
  evaluateCartItemPricing,
  formatRupiah,
  getProductStock,
} from '@/lib/utils';

const emptySubscribe = () => () => {};

export default function CartPanel() {
  const {
    items,
    updateQty,
    removeItem,
    getTotalItems,
    getSubtotal,
    getOriginalSubtotal,
    getTotalSaved,
  } = useCartStore();
  const user = useAuthStore((state) => state.user);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const displayItems = mounted ? items : [];
  const totalItems = mounted ? getTotalItems() : 0;
  const subtotal = mounted ? getSubtotal(user?.tipeAkun) : 0;
  const originalSubtotal = mounted ? getOriginalSubtotal() : 0;
  const totalSaved = mounted ? getTotalSaved(user?.tipeAkun) : 0;

  return (
    <aside className="lezzat-cart hidden xl:flex xl:flex-col xl:w-[310px] shrink-0 bg-white border-l border-[#E6E8F0] p-5 h-screen sticky top-0 justify-between">
      <div className="flex-1 overflow-y-auto pr-1">
        {/* Header Keranjang */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E6E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h2 className="font-heading text-base font-extrabold text-[#171725]">
              Keranjangmu
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#F75C03]/15 text-[#F75C03] text-xs font-extrabold">
            {totalItems} item
          </span>
        </div>

        {/* Kondisi Keranjang Kosong */}
        {displayItems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0] text-[#ACA5FF] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="font-heading text-sm font-bold text-[#171725] mb-1">
              Keranjang masih kosong
            </p>
            <p className="text-xs text-[#77788A] leading-relaxed">
              Pilih produk frozen food favoritmu dari katalog untuk mulai
              belanja.
            </p>
          </div>
        ) : (
          /* Daftar Item di Keranjang */
          <div className="space-y-3.5">
            {displayItems.map(({ product, qty }) => {
              const safeQty = Number.isNaN(qty) || qty < 1 ? 1 : qty;
              const maxStock = Math.max(getProductStock(product), safeQty);
              const pricing = evaluateCartItemPricing(
                product,
                safeQty,
                user?.tipeAkun
              );

              return (
                <div
                  key={product.idProduk}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0] hover:border-[#D1CDFF] transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#E7EFFF] overflow-hidden shrink-0 flex items-center justify-center">
                    {product.gambar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.gambar}
                        alt={product.namaProduk}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Snowflake className="w-5 h-5 text-[#4737FF]/50" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-[#171725] truncate">
                        {product.namaProduk}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(product.idProduk)}
                        aria-label={`Hapus ${product.namaProduk}`}
                        className="text-[#77788A] hover:text-[#E5484D] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {pricing.hasDiscount ? (
                      <div className="mt-0.5 mb-2 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-[#77788A] line-through">
                            {formatRupiah(pricing.originalUnitPrice)}
                          </span>
                          <span className="text-xs font-extrabold text-[#F75C03]">
                            {formatRupiah(pricing.effectiveUnitPrice)}
                          </span>
                        </div>
                        {pricing.primaryPromoLabel && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-[#F75C03]/15 text-[#D93800] text-[9px] font-extrabold">
                            {pricing.primaryPromoLabel}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-extrabold text-[#4737FF] mt-0.5 mb-2">
                        {formatRupiah(product.hargaEceran)}
                      </p>
                    )}

                    {/* Tombol Kuantitas (- 1 +) */}
                    <div className="inline-flex items-center gap-2.5 rounded-lg bg-white border border-[#E6E8F0] px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateQty(product.idProduk, safeQty - 1)}
                        aria-label="Kurangi jumlah"
                        className="text-[#5E5E6A] hover:text-[#4737FF] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-extrabold text-[#171725] min-w-[16px] text-center">
                        {safeQty}
                      </span>
                      <button
                        type="button"
                        disabled={safeQty >= maxStock}
                        onClick={() => updateQty(product.idProduk, safeQty + 1)}
                        aria-label="Tambah jumlah"
                        className="text-[#5E5E6A] hover:text-[#4737FF] disabled:opacity-30 cursor-pointer"
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
      <div className="pt-4 border-t border-[#E6E8F0] mt-4">
        <div className="space-y-2 text-xs mb-4">
          {totalSaved > 0 && (
            <>
              <div className="flex justify-between text-[#77788A]">
                <span>Harga Normal</span>
                <span className="line-through">
                  {formatRupiah(originalSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#159A68] font-bold">
                <span>Hemat Diskon / Tier</span>
                <span>- {formatRupiah(totalSaved)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-[#77788A]">
            <span>Subtotal</span>
            <span className="font-semibold text-[#171725]">
              {formatRupiah(subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-[#77788A]">
            <span>Pengiriman</span>
            <span className="font-bold text-[#159A68]">Gratis ≤ 5 km</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-[#171725] pt-2.5 border-t border-[#E6E8F0]">
            <span>Total</span>
            <span className="text-[#4737FF]">{formatRupiah(subtotal)}</span>
          </div>
        </div>

        <Link
          href={displayItems.length > 0 ? '/checkout' : '#'}
          aria-disabled={displayItems.length === 0}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-5 text-xs font-extrabold transition-all ${
            displayItems.length > 0
              ? 'bg-[#F75C03] hover:bg-[#D94800] text-white shadow-md shadow-[#F75C03]/25'
              : 'bg-[#F1F3F8] text-[#77788A] pointer-events-none'
          }`}
        >
          <span>Checkout sekarang</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#77788A]">
          <Snowflake className="w-3.5 h-3.5 text-[#4737FF]" />
          <span>Dijaga beku -18°C hingga tiba di rumah</span>
        </div>
      </div>
    </aside>
  );
}