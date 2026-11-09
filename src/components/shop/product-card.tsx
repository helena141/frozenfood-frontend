'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Plus, Snowflake } from 'lucide-react';
import { ProductCatalogResponse } from '@/types/api';
import { formatRupiah, getProductStock } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

interface ProductCardProps {
  product: ProductCatalogResponse;
  badgeText?: string;
}

export default function ProductCard({ product, badgeText }: ProductCardProps) {
  const { items, addItem } = useCartStore();

  const safeStock = getProductStock(product);

  const isProductActive = product.isActive ?? true;

  const itemInCart = items.find((i) => i.product.idProduk === product.idProduk);
  const currentQtyInCart =
    itemInCart && !Number.isNaN(itemInCart.qty) ? itemInCart.qty : 0;

  const isOutOfStock =
    !isProductActive || safeStock <= 0 || currentQtyInCart >= safeStock;

  const handleAddToCart = () => {
    addItem(
      {
        ...product,
        totalStokOnline: safeStock,
        isActive: isProductActive,
      },
      1
    );
  };

  return (
    <div className="group bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Gambar Produk */}
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-slate-100 mb-3"
          style={{ height: '190px' }}
        >
          {product.gambar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.gambar}
              alt={product.namaProduk}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#f2efe9] text-[#174634]">
              <Snowflake className="w-10 h-10 opacity-50 mb-1.5" />
              <span className="text-xs font-semibold opacity-75">
                {product.kategori || 'Frozen Food'}
              </span>
            </div>
          )}

          {/* Badge Kiri Atas */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {safeStock <= 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                Stok Habis
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-white/95 text-slate-800 text-[10px] font-bold tracking-wider uppercase shadow-xs">
                {badgeText || product.kategori || 'TERSEDIA'}
              </span>
            )}
          </div>

          {/* Tombol Favorit Kanan Atas */}
          <button
            type="button"
            aria-label="Simpan ke favorit"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-slate-500 hover:text-red-500 shadow-xs transition-colors"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Info Kategori, Berat, & Nama Produk */}
        <div className="px-1">
          <p className="text-[11px] text-slate-400 font-medium mb-1">
            {product.kategori || 'Frozen Food'}
            {typeof product.berat === 'number' ? ` • ${product.berat}g` : ''}
          </p>
          <Link
            href={`/products/${product.idProduk}`}
            className="block font-bold text-slate-900 text-sm hover:text-[#174634] transition-colors truncate mb-1"
          >
            {product.namaProduk}
          </Link>
          <p className="text-[11px] text-slate-500 mb-3">
            Stok tersedia:{' '}
            <span className="font-semibold text-slate-700">{safeStock}</span>
          </p>
        </div>
      </div>

      {/* Harga & Tombol Tambah Keranjang */}
      <div className="px-1 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="block text-[10px] text-slate-400">Harga Eceran</span>
          <span className="font-bold text-sm text-slate-900">
            {formatRupiah(product.hargaEceran)}
          </span>
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          aria-label={`Tambah ${product.namaProduk} ke keranjang`}
          className="w-9 h-9 rounded-full bg-[#174634] hover:bg-[#113527] disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}