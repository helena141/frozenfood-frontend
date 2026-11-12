'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Check,
  Snowflake,
  Layers,
} from 'lucide-react';
import { ProductCatalogResponse } from '@/types/api';
import {
  formatRupiah,
  getProductStock,
  hasExplicitStock,
} from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';

export interface ProductCardProps {
  product: ProductCatalogResponse;
  promoPercent?: number;
  onAddedToCart?: (product: ProductCatalogResponse) => void;
}

const numberFormatterId = new Intl.NumberFormat('id-ID');

export function formatGramLabel(rawBerat: number | undefined | null): string {
  const val = Number(rawBerat || 0);
  if (val <= 0) return '500 g';
  const grams = val <= 50 ? Math.round(val * 1000) : Math.round(val);
  return `${numberFormatterId.format(grams)} g`;
}

export function extractProductPromo(
  product: ProductCatalogResponse,
  overridePercent?: number
): { discountPercent: number; originalPrice: number | null } {
  const raw = product as unknown as Record<string, unknown>;
  const apiDiscount =
    typeof raw.diskonPersen === 'number'
      ? raw.diskonPersen
      : typeof raw.discountPercent === 'number'
        ? raw.discountPercent
        : 0;

  const discountPercent = overridePercent ?? apiDiscount;

  const apiOriginalPrice =
    typeof raw.hargaCoret === 'number' && raw.hargaCoret > product.hargaEceran
      ? raw.hargaCoret
      : typeof raw.hargaAsli === 'number' && raw.hargaAsli > product.hargaEceran
        ? raw.hargaAsli
        : null;

  if (apiOriginalPrice) {
    const calculatedPct = Math.round(
      ((apiOriginalPrice - product.hargaEceran) / apiOriginalPrice) * 100
    );
    return {
      discountPercent: discountPercent > 0 ? discountPercent : calculatedPct,
      originalPrice: apiOriginalPrice,
    };
  }

  if (discountPercent > 0 && discountPercent < 90) {
    const originalPrice = Math.round(
      product.hargaEceran / (1 - discountPercent / 100)
    );
    return { discountPercent, originalPrice };
  }

  return { discountPercent: 0, originalPrice: null };
}

export default function ProductCard({
  product,
  promoPercent,
  onAddedToCart,
}: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);
  const [added, setAdded] = useState(false);

  const explicitStock = hasExplicitStock(product);
  const stock = getProductStock(product);
  const isOutOfStock =
    product.isActive === false || (explicitStock && stock <= 0) || stock <= 0;
  const isLowStock = !isOutOfStock && explicitStock && stock <= 10;
  const isB2B = user?.tipeAkun === 'B2B';

  const { discountPercent, originalPrice } = extractProductPromo(
    product,
    promoPercent
  );

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem(product, 1);
    setAdded(true);
    if (onAddedToCart) {
      onAddedToCart(product);
    }
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <Link
      href={`/products/${product.idProduk}`}
      className={`group rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4737FF] ${
        isOutOfStock ? 'opacity-65' : ''
      }`}
    >
      {/* Gambar Rasio 4:3 */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {product.gambar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.gambar}
            alt={product.namaProduk}
            loading="lazy"
            className={`w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-300 ${
              isOutOfStock ? 'grayscale-[35%]' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#4737FF]/40 bg-slate-50">
            <Snowflake className="w-9 h-9 mb-1" />
            <span className="text-[11px] font-semibold text-slate-400">
              Lezzat Frozen Food
            </span>
          </div>
        )}

        {/* Badge Sudut Atas: Promo / Stok Terbatas / Habis */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1">
            {isOutOfStock ? (
              <span className="px-2 py-0.5 rounded-lg bg-slate-600 text-white text-[10px] font-bold shadow-2xs">
                Habis
              </span>
            ) : discountPercent > 0 ? (
              <span className="px-2 py-0.5 rounded-lg bg-[#F75C03] text-white text-[10px] font-extrabold shadow-2xs">
                Promo -{discountPercent}%
              </span>
            ) : isLowStock ? (
              <span className="px-2 py-0.5 rounded-lg bg-[#F75C03] text-white text-[10px] font-bold shadow-2xs">
                Stok terbatas
              </span>
            ) : null}
          </div>

          {isB2B && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#4737FF] text-white text-[10px] font-bold shadow-2xs">
              <Layers className="w-3 h-3" />
              <span>B2B</span>
            </span>
          )}
        </div>

        {/* Informasi Berat Satuan di Sudut Bawah */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {!isOutOfStock && !isLowStock && (
            <span className="px-2 py-0.5 rounded-lg bg-[#159A68] text-white text-[10px] font-bold">
              Tersedia
            </span>
          )}
          <span className="ml-auto px-2 py-0.5 rounded-lg bg-white/95 text-slate-700 text-[10px] font-semibold shadow-2xs">
            {formatGramLabel(product.berat)}
          </span>
        </div>
      </div>

      {/* Konten Kartu */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-block px-2 py-0.5 rounded-lg bg-[#4737FF]/10 text-[#4737FF] text-[10px] font-bold truncate max-w-[140px]">
              {product.kategori || 'Frozen Food'}
            </span>
            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              {formatGramLabel(product.berat)}
            </span>
          </div>

          <h3 className="font-heading text-sm font-bold text-slate-800 group-hover:text-[#4737FF] transition-colors line-clamp-2 min-h-[2.5rem] leading-snug">
            {product.namaProduk}
          </h3>
        </div>

        {/* Harga & Tombol + Keranjang */}
        <div className="pt-2.5 border-t border-slate-100 flex items-end justify-between gap-2">
          <div className="min-w-0">
            {originalPrice ? (
              <span className="text-[10px] text-slate-400 line-through block leading-none mb-0.5">
                {formatRupiah(originalPrice)}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-400 block leading-none mb-0.5">
                Harga satuan
              </span>
            )}
            <span className="font-heading text-base font-extrabold text-[#4737FF] block truncate">
              {formatRupiah(product.hargaEceran)}
            </span>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            aria-label={
              isOutOfStock
                ? `${product.namaProduk} habis`
                : `Tambah ${product.namaProduk} ke keranjang`
            }
            className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4737FF] ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : added
                  ? 'bg-[#159A68] text-white'
                  : 'bg-[#F75C03] hover:bg-[#D94800] text-white shadow-2xs'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Ditambahkan</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>+ Keranjang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}