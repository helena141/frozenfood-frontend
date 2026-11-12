'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Check,
  Snowflake,
  Layers,
  Eye,
} from 'lucide-react';
import { ProductCatalogResponse } from '@/types/api';
import { formatRupiah, getProductStock } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';

interface ProductCardProps {
  product: ProductCatalogResponse;
}

function formatGramLabel(rawBerat: number | undefined | null): string {
  const val = Number(rawBerat || 0);
  if (val <= 0) return '500 g';
  const grams = val <= 50 ? Math.round(val * 1000) : Math.round(val);
  return `${grams.toLocaleString('id-ID')} g`;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);
  const [added, setAdded] = useState(false);

  const stock = getProductStock(product);
  const isOutOfStock = stock <= 0;
  const isB2B = user?.tipeAkun === 'B2B';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="group ff-card ff-card-interactive flex flex-col overflow-hidden bg-white">
      <Link
        href={`/products/${product.idProduk}`}
        className="relative aspect-[4/3] w-full bg-[#F1F3F8] overflow-hidden block"
      >
        {product.gambar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.gambar}
            alt={product.namaProduk}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#4737FF]/40 bg-gradient-to-br from-[#E7EFFF] to-[#F8FAFF]">
            <Snowflake className="w-10 h-10 mb-1.5" />
            <span className="text-[11px] font-semibold text-[#77788A]">
              Froznfood Quality
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[#171725] text-[10px] font-bold shadow-xs">
            {product.kategori || 'Frozen Food'}
          </span>

          {isB2B && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#4737FF] text-white text-[10px] font-bold shadow-sm">
              <Layers className="w-3 h-3" />
              <span>Akun Mitra B2B</span>
            </span>
          )}
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-xs ${
              isOutOfStock
                ? 'bg-[#E5484D] text-white'
                : stock <= 10
                  ? 'bg-[#D97706] text-white'
                  : 'bg-[#101018]/75 text-white'
            }`}
          >
            {isOutOfStock ? 'Stok Habis' : `Stok: ${stock} unit`}
          </span>

          <span className="px-2 py-0.5 rounded-md bg-white/90 text-[#171725] text-[10px] font-semibold">
            {formatGramLabel(product.berat)}
          </span>
        </div>
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <Link
            href={`/products/${product.idProduk}`}
            className="font-heading text-base font-bold text-[#171725] hover:text-[#4737FF] transition-colors line-clamp-1"
          >
            {product.namaProduk}
          </Link>
          <p className="text-xs text-[#77788A] line-clamp-2 mt-1 leading-relaxed min-h-[2.25rem]">
            {product.deskripsiProduk ||
              'Produk frozen food higienis dengan penyimpanan rantai dingin -18°C.'}
          </p>
        </div>

        <div className="pt-3 border-t border-[#E6E8F0] flex items-end justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#77788A] block">
              Harga Eceran
            </span>
            <span className="font-heading text-lg font-extrabold text-[#4737FF]">
              {formatRupiah(product.hargaEceran)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/products/${product.idProduk}`}
              aria-label={`Detail ${product.namaProduk}`}
              className="p-2.5 rounded-xl border border-[#E6E8F0] hover:border-[#4737FF] text-[#5E5E6A] hover:text-[#4737FF] transition-colors"
            >
              <Eye className="w-4 h-4" />
            </Link>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isOutOfStock
                  ? 'bg-[#F1F3F8] text-[#77788A] cursor-not-allowed'
                  : added
                    ? 'bg-[#159A68] text-white'
                    : 'bg-[#F75C03] hover:bg-[#D94800] text-white shadow-sm shadow-[#F75C03]/25'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Masuk</span>
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
      </div>
    </div>
  );
}