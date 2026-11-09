'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Search,
  ArrowRight,
  Package,
  Clock,
  RefreshCw,
  AlertCircle,
  FileText,
  LogIn,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, formatWaktuSingkat, getErrorMessage } from '@/lib/utils';
import { OrderResponse } from '@/types/api';
import { useAuthStore } from '@/store/auth-store';
import ShopSidebar from '@/components/shop/sidebar';
import CartPanel from '@/components/shop/cart-panel';

export default function OrdersHistoryPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? user : null;

  const {
    data: myOrders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<OrderResponse[]>({
    queryKey: ['my-orders', activeUser?.idUser],
    queryFn: async () => {
      const res = await api.get<OrderResponse[]>('/api/orders/my');
      return res.data;
    },
    enabled: Boolean(activeUser),
  });

  const handleTrackById = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    const cleanId = trackOrderId.trim().replace(/^#/, '');
    if (!cleanId) {
      setTrackError('Masukkan ID Pesanan (UUID) yang ingin dilacak.');
      return;
    }
    router.push(`/orders/${cleanId}`);
  };

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              RIWAYAT & PELACAKAN PESANAN
            </p>
            <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
              Pesanan Saya
            </h1>
          </div>

          {activeUser && (
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
          )}
        </div>

        {/* Form Lacak Cepat via ID Order */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Lacak Pesanan dengan ID Order
          </h2>
          <p className="text-xs text-slate-500 mb-3.5">
            Masukkan kode UUID pesanan untuk melihat status pengiriman, pembayaran, atau mengunduh Nota PDF.
          </p>

          <form
            onSubmit={handleTrackById}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={trackOrderId}
                onChange={(e) => setTrackOrderId(e.target.value)}
                placeholder="Contoh: 348bb928-30f4-4492-8c99-33ec3f5553e5"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:border-[#174634] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#174634] hover:bg-[#113527] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Lihat Status Pesanan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {trackError && (
            <p className="mt-2 text-xs text-red-600 font-medium">{trackError}</p>
          )}
        </section>

        {/* Daftar Riwayat Pesanan Akun */}
        {!activeUser ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center my-6">
            <LogIn className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Masuk untuk Melihat Riwayat Pesanan
            </h3>
            <p className="text-xs text-slate-500 mb-5 max-w-md mx-auto">
              Silakan masuk ke akun Lezzat Anda agar daftar seluruh pesanan B2C maupun B2B otomatis ditampilkan di sini.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#174634] text-white text-xs font-semibold hover:bg-[#113527]"
            >
              <span>Masuk ke Akun</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl p-6 border border-slate-200 h-36"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-white rounded-3xl p-8 border border-red-200 text-center my-6">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Gagal Memuat Riwayat Pesanan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {getErrorMessage(error, 'Tidak dapat mengambil daftar pesanan Anda.')}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174634] text-white text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : myOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center my-4">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Belum Ada Riwayat Pesanan
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Anda belum memiliki riwayat pesanan. Yuk mulai belanja produk frozen food pilihan!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#174634] text-white text-xs font-semibold hover:bg-[#113527]"
            >
              <span>Belanja Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order) => {
              const totalQty =
                order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
              const isPaid =
                order.status === 'DIBAYAR' ||
                order.status === 'LUNAS' ||
                order.status === 'DIPROSES' ||
                order.status === 'SELESAI';

              return (
                <div
                  key={order.idOrder}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-[#174634]/50 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            #{order.idOrder.slice(0, 8)}...
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#f2efe9] text-[#174634] text-[10px] font-bold uppercase">
                            {order.tipeOrder}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {order.createdAt
                            ? formatWaktuSingkat(order.createdAt)
                            : '-'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Ringkasan Item */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      {order.items.slice(0, 3).map((item) => (
                        <div
                          key={item.idOrderItem}
                          className="flex items-center justify-between text-xs text-slate-600"
                        >
                          <span className="truncate pr-2">
                            <strong className="text-slate-800">
                              {item.quantity}x
                            </strong>{' '}
                            {item.namaProduk}{' '}
                            <span className="font-mono text-[10px] text-slate-400">
                              ({item.idProdBatch})
                            </span>
                          </span>
                          <span className="font-semibold text-slate-800 shrink-0">
                            {formatRupiah(item.subtotalItem)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[11px] text-slate-400">
                          +{order.items.length - 3} baris batch lainnya...
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        Total Tagihan ({totalQty} unit)
                      </span>
                      <span className="text-sm font-bold text-[#174634]">
                        {formatRupiah(order.totalTagihan)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${order.idOrder}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174634] hover:bg-[#113527] text-white text-xs font-semibold transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Detail, Pengiriman & Nota</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CartPanel />
    </div>
  );
}
