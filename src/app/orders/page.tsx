'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

function getOrderStatusBadge(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'LUNAS' || s === 'DIBAYAR' || s === 'SELESAI') {
    return 'bg-[#159A68]/15 text-[#159A68] border border-[#159A68]/30';
  }
  if (s === 'DIPROSES' || s === 'DIKIRIM') {
    return 'bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/30';
  }
  if (s === 'DIBATALKAN' || s === 'GAGAL' || s === 'EXPIRED') {
    return 'bg-[#E5484D]/15 text-[#E5484D] border border-[#E5484D]/30';
  }
  return 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30';
}

export default function OrdersHistoryPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackError, setTrackError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return myOrders;
    return myOrders.filter(
      (o) => (o.status || '').toUpperCase() === statusFilter
    );
  }, [myOrders, statusFilter]);

  const statusTabs = useMemo(() => {
    const unique = Array.from(
      new Set(myOrders.map((o) => (o.status || '').toUpperCase()).filter(Boolean))
    );
    return ['ALL', ...unique];
  }, [myOrders]);

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
        {/* Header Froznfood 2.0 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
              FROZNFOOD 2.0 • ORDER HISTORY & TRACKING
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mt-1">
              Pesanan Saya
            </h1>
          </div>

          {activeUser && (
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#4737FF]" />
              <span>Muat Ulang</span>
            </button>
          )}
        </div>

        {/* Form Lacak Cepat via ID Order */}
        <section className="ff-card bg-white p-5 sm:p-6 mb-6">
          <h2 className="font-heading text-sm font-bold text-[#171725] mb-1">
            Lacak Pesanan dengan ID Order
          </h2>
          <p className="text-xs text-[#77788A] mb-3.5">
            Masukkan kode UUID pesanan untuk melihat status pengiriman,
            pembayaran, atau mengunduh Nota PDF.
          </p>

          <form
            onSubmit={handleTrackById}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={trackOrderId}
                onChange={(e) => setTrackOrderId(e.target.value)}
                placeholder="Contoh: 348bb928-30f4-4492-8c99-33ec3f5553e5"
                className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono text-[#171725] focus:border-[#4737FF] focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold shadow-sm shadow-[#4737FF]/25 transition-all cursor-pointer"
            >
              <span>Lihat Status Pesanan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {trackError && (
            <p className="mt-2 text-xs text-[#E5484D] font-medium">
              {trackError}
            </p>
          )}
        </section>

        {/* Filter Status Pesanan (Muncul jika ada pesanan) */}
        {activeUser && myOrders.length > 0 && statusTabs.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
            {statusTabs.map((st) => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4737FF] text-white shadow-sm shadow-[#4737FF]/25'
                      : 'bg-white border border-[#E6E8F0] text-[#5E5E6A] hover:border-[#4737FF] hover:text-[#171725]'
                  }`}
                >
                  {st === 'ALL' ? `Semua (${myOrders.length})` : st}
                </button>
              );
            })}
          </div>
        )}

        {/* Daftar Riwayat Pesanan Akun */}
        {!activeUser ? (
          <div className="ff-card bg-white p-8 text-center my-6">
            <LogIn className="w-10 h-10 text-[#ACA5FF] mx-auto mb-3" />
            <h3 className="font-heading text-base font-bold text-[#171725] mb-1">
              Masuk untuk Melihat Riwayat Pesanan
            </h3>
            <p className="text-xs text-[#77788A] mb-5 max-w-md mx-auto">
              Silakan masuk ke akun Froznfood Anda agar daftar seluruh pesanan
              B2C maupun B2B otomatis ditampilkan di sini.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold shadow-sm shadow-[#4737FF]/25 transition-all"
            >
              <span>Masuk ke Akun</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="ff-card bg-white p-6 h-36" />
            ))}
          </div>
        ) : isError ? (
          <div className="ff-card bg-white p-8 border border-[#E5484D]/30 text-center my-6">
            <AlertCircle className="w-8 h-8 text-[#E5484D] mx-auto mb-2" />
            <h3 className="font-heading text-sm font-bold text-[#171725] mb-1">
              Gagal Memuat Riwayat Pesanan
            </h3>
            <p className="text-xs text-[#77788A] mb-4">
              {getErrorMessage(
                error,
                'Tidak dapat mengambil daftar pesanan Anda.'
              )}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="ff-card bg-white p-10 text-center my-4">
            <ShoppingBag className="w-10 h-10 text-[#ACA5FF] mx-auto mb-3" />
            <h3 className="font-heading text-sm font-bold text-[#171725] mb-1">
              Belum Ada Riwayat Pesanan
            </h3>
            <p className="text-xs text-[#77788A] mb-5">
              Anda belum memiliki riwayat pesanan pada kategori ini. Yuk mulai
              belanja produk frozen food pilihan!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold shadow-sm shadow-[#F75C03]/25 transition-all"
            >
              <span>Belanja Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const totalQty =
                order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;

              return (
                <div
                  key={order.idOrder}
                  className="ff-card ff-card-interactive bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-3.5 border-b border-[#E6E8F0]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#171725]">
                            #{order.idOrder.slice(0, 8)}...
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              order.tipeOrder === 'B2B'
                                ? 'bg-[#F75C03]/15 text-[#F75C03]'
                                : 'bg-[#E7EFFF] text-[#4737FF]'
                            }`}
                          >
                            {order.tipeOrder}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#77788A] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {order.createdAt
                            ? formatWaktuSingkat(order.createdAt)
                            : '-'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${getOrderStatusBadge(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Ringkasan Item */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-4 space-y-1.5 bg-[#F8FAFF] rounded-2xl p-3.5 border border-[#E6E8F0]/70">
                      {order.items.slice(0, 3).map((item) => (
                        <div
                          key={item.idOrderItem}
                          className="flex items-center justify-between text-xs text-[#5E5E6A]"
                        >
                          <span className="truncate pr-2">
                            <strong className="text-[#171725]">
                              {item.quantity}x
                            </strong>{' '}
                            {item.namaProduk}{' '}
                            <span className="font-mono text-[10px] text-[#77788A]">
                              ({item.idProdBatch})
                            </span>
                          </span>
                          <span className="font-bold text-[#171725] shrink-0">
                            {formatRupiah(item.subtotalItem)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[11px] text-[#77788A] pt-1">
                          +{order.items.length - 3} baris batch lainnya...
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E6E8F0]">
                    <div>
                      <span className="text-[11px] text-[#77788A] block">
                        Total Tagihan ({totalQty} unit)
                      </span>
                      <span className="font-heading text-base font-extrabold text-[#4737FF]">
                        {formatRupiah(order.totalTagihan)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${order.idOrder}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold shadow-sm shadow-[#4737FF]/20 transition-all"
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