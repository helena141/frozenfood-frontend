'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  MapPin,
  User,
  FileText,
  Package,
  Info,
  Sparkles,
  Snowflake,
  Home,
  Search,
  ShoppingBag,
  Heart,
  Store,
  LogOut,
  LogIn,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import {
  DeliveryResponse,
  PaymentResponse,
  OrderResponse,
} from '@/types/api';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const PROGRESS_STEPS = [
  {
    key: 'MENUNGGU_KONFIRMASI_ADMIN',
    label: 'Menunggu Konfirmasi Admin',
    desc: 'Penetapan ongkir & pengantar oleh admin',
  },
  {
    key: 'MENUNGGU_PICKUP',
    label: 'Menunggu Pickup',
    desc: 'Menunggu kurir mengambil paket di gudang',
  },
  {
    key: 'DISIAPKAN',
    label: 'Pesanan Disiapkan',
    desc: 'Produk dikemas dalam cooler box rantai dingin',
  },
  {
    key: 'DALAM_PERJALANAN',
    label: 'Dalam Perjalanan',
    desc: 'Kurir sedang menuju lokasi tujuan Anda',
  },
  {
    key: 'TERKIRIM',
    label: 'Terkirim',
    desc: 'Pesanan telah tiba di lokasi tujuan',
  },
];

const ALL_KNOWN_STATUSES = [
  ...PROGRESS_STEPS.map((s) => s.key),
  'GAGAL_KIRIM',
  'DIBATALKAN',
];

// Sidebar aman dengan Suspense
function ShopSidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Beranda', href: '/', icon: Home, active: pathname === '/' },
    {
      label: 'Jelajahi',
      href: '/#katalog',
      icon: Search,
      active: pathname.startsWith('/products'),
    },
    {
      label: 'Pesanan',
      href: '/checkout',
      icon: ShoppingBag,
      active: pathname.startsWith('/orders') || pathname === '/checkout',
    },
    { label: 'Favorit', href: '/#populer', icon: Heart, active: false },
  ];

  return (
    <aside className="lezzat-sidebar">
      <div>
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-full bg-[#174634] flex items-center justify-center text-white shadow-sm">
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-serif-title text-2xl font-bold text-slate-900 leading-none">
              Lezzat
            </span>
            <span className="block text-[9px] font-semibold tracking-[0.22em] text-slate-400 uppercase mt-1">
              FROZEN FOOD
            </span>
          </div>
        </Link>

        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase px-3 mb-3">
          MENU UTAMA
        </p>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-[#174634] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-[#f2efe9] p-4">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#174634] mb-3 shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-900 mb-1">
            Punya usaha kuliner?
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
            Dapatkan harga khusus mitra.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#174634] hover:underline"
          >
            <span>Pelajari</span>
            <span>→</span>
          </Link>
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar akun ({user.nama})</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#174634] hover:underline"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk ke akun</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

function ShopSidebar() {
  return (
    <Suspense fallback={<div className="w-64 bg-white border-r h-screen" />}>
      <ShopSidebarContent />
    </Suspense>
  );
}

function normalizePaymentResponse(raw: unknown): PaymentResponse | null {
  if (!raw) return null;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate || typeof candidate !== 'object') return null;

  const obj = candidate as Partial<PaymentResponse> & {
    data?: PaymentResponse;
  };
  const target = obj.data && typeof obj.data === 'object' ? obj.data : obj;

  if (!target.idPayment && !target.gatewayRef) {
    return null;
  }

  return {
    idPayment: String(target.idPayment || ''),
    idOrder: String(target.idOrder || ''),
    gatewayRef: String(target.gatewayRef || ''),
    metodePay: String(target.metodePay || 'QRIS'),
    jumlah: typeof target.jumlah === 'number' ? target.jumlah : 0,
    status: String(target.status || 'PENDING'),
    paidAt: target.paidAt ?? null,
    expiredAt: target.expiredAt ?? null,
    createdAt: String(target.createdAt || ''),
    updatedAt: String(target.updatedAt || ''),
  };
}

function normalizeDeliveryResponse(raw: unknown): DeliveryResponse | null {
  if (!raw) return null;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate || typeof candidate !== 'object') return null;

  const obj = candidate as Partial<DeliveryResponse> & {
    data?: DeliveryResponse;
  };
  const target = obj.data && typeof obj.data === 'object' ? obj.data : obj;

  if (!target.idDelivery && !target.statusDelivery) {
    return null;
  }

  return target as DeliveryResponse;
}

function OrderStatusContent() {
  const params = useParams<{ id: string }>();
  const idOrder = params?.id || '';

  const [cachedOrder, setCachedOrder] = useState<OrderResponse | null>(null);
  const [cachedPayment, setCachedPayment] = useState<PaymentResponse | null>(
    null
  );
  const [manualGatewayRef, setManualGatewayRef] = useState('MOCK-GATEWAY-REF-001');
  const [isDownloadingNota, setIsDownloadingNota] = useState(false);
  const [notaError, setNotaError] = useState<string | null>(null);

  const [isSimulatingPay, setIsSimulatingPay] = useState(false);
  const [simulatePayError, setSimulatePayError] = useState<string | null>(null);
  const [isCreatingPay, setIsCreatingPay] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && idOrder) {
      const raw = sessionStorage.getItem(`lezzat-order-${idOrder}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            order?: OrderResponse;
            payment?: unknown;
          };
          if (parsed.order) {
            setCachedOrder(parsed.order);
          }
          if (parsed.payment) {
            const norm = normalizePaymentResponse(parsed.payment);
            if (norm) {
              setCachedPayment(norm);
              if (norm.gatewayRef) setManualGatewayRef(norm.gatewayRef);
            }
          }
        } catch {
          // Abaikan
        }
      }
    }
  }, [idOrder]);

  const {
    data: deliveryData,
    isLoading: isLoadingDelivery,
    isError: isErrorDelivery,
    error: errorDelivery,
    refetch: refetchDelivery,
  } = useQuery<DeliveryResponse | null>({
    queryKey: ['delivery-order', idOrder],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/deliveries/order/${idOrder}`);
        return normalizeDeliveryResponse(res.data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(idOrder),
    retry: false,
  });

  const {
    data: paymentData,
    isLoading: isLoadingPayment,
    isError: isErrorPayment,
    error: errorPayment,
    refetch: refetchPayment,
  } = useQuery<PaymentResponse | null>({
    queryKey: ['payment-order', idOrder],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/payments/order/${idOrder}`);
        return normalizePaymentResponse(res.data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(idOrder),
    retry: false,
  });

  const delivery = deliveryData ?? null;
  const payment = paymentData ?? cachedPayment ?? null;

  const handleRefreshAll = () => {
    refetchDelivery();
    refetchPayment();
  };

  const handleCreateMissingPayment = async (metodePay: 'QRIS' | 'TRANSFER') => {
    if (!idOrder) return;
    setSimulatePayError(null);
    setIsCreatingPay(true);
    try {
      const res = await api.post('/api/payments', {
        idOrder,
        metodePay,
      });
      const created = normalizePaymentResponse(res.data);
      if (created) {
        setCachedPayment(created);
        if (created.gatewayRef) setManualGatewayRef(created.gatewayRef);
      }
      await refetchPayment();
    } catch (error) {
      setSimulatePayError(
        getErrorMessage(error, 'Gagal membuat pembayaran untuk pesanan ini.')
      );
    } finally {
      setIsCreatingPay(false);
    }
  };

  const handleDownloadNota = async () => {
    if (!idOrder) return;
    setNotaError(null);
    setIsDownloadingNota(true);

    try {
      const response = await api.get(`/api/orders/${idOrder}/nota`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `nota-${idOrder}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setNotaError(
        getErrorMessage(error, 'Gagal mengunduh Nota PDF.')
      );
    } finally {
      setIsDownloadingNota(false);
    }
  };

  const handleSimulatePaymentSuccess = async () => {
    const activeRef = payment?.gatewayRef || manualGatewayRef;
    if (!activeRef) {
      setSimulatePayError('Kode referensi gatewayRef wajib diisi.');
      return;
    }

    setSimulatePayError(null);
    setIsSimulatingPay(true);

    try {
      const nominalKonfirmasi =
        payment && payment.jumlah > 0 ? payment.jumlah : totalTagihanAkhir;

      await api.post('/api/payments/callback', {
        gatewayRef: activeRef,
        status: 'LUNAS',
        jumlahDikonfirmasi: nominalKonfirmasi,
      });
      await refetchPayment();
      await refetchDelivery();
    } catch (error) {
      setSimulatePayError(
        getErrorMessage(error, 'Gagal menyimulasikan pembayaran lunas.')
      );
    } finally {
      setIsSimulatingPay(false);
    }
  };

  const isLoading = isLoadingDelivery || isLoadingPayment;
  const currentStatus = delivery?.statusDelivery || '';
  const currentStepIndex = PROGRESS_STEPS.findIndex(
    (s) => s.key === currentStatus
  );
  const isWarningStatus =
    currentStatus === 'GAGAL_KIRIM' || currentStatus === 'DIBATALKAN';
  const isUnknownStatus =
    Boolean(currentStatus) && !ALL_KNOWN_STATUSES.includes(currentStatus);

  const subtotalBarang = cachedOrder
    ? cachedOrder.items.reduce((sum, item) => sum + item.subtotalItem, 0)
    : 0;

  const isOngkirPendingAdmin =
    delivery?.pelaksana === 'PIHAK_KETIGA' &&
    delivery?.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN';

  const ongkirPengiriman =
    delivery && !isOngkirPendingAdmin ? delivery.ongkir : 0;

  const totalTagihanAkhir = subtotalBarang + ongkirPengiriman;

  const isPaymentSettled =
    payment?.status === 'LUNAS' ||
    payment?.status === 'PAID' ||
    payment?.status === 'SUCCESS';

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#174634]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Pencarian Pesanan</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Status</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadNota}
              disabled={isDownloadingNota}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isDownloadingNota ? 'Mengunduh PDF...' : 'Unduh Nota PDF'}
              </span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
            STATUS PESANAN & LACAK PENGIRIMAN
          </p>
          <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900 break-all">
            Pesanan #{idOrder}
          </h1>
        </div>

        {notaError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notaError}</span>
          </div>
        )}

        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 h-44" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 h-64" />
              <div className="bg-white rounded-3xl p-6 border border-slate-200 h-64" />
            </div>
          </div>
        )}

        {!isLoading && (isErrorDelivery || isErrorPayment) && (
          <div className="bg-white rounded-3xl p-8 border border-red-200 text-center max-w-lg mx-auto my-8">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Gagal Memuat Data Pesanan
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              {getErrorMessage(
                errorDelivery || errorPayment,
                'Terjadi kesalahan saat menghubungi server.'
              )}
            </p>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174634] text-white text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        )}

        {!isLoading && !isErrorDelivery && !isErrorPayment && (
          <div className="space-y-6">
            <section className="bg-white rounded-3xl p-6 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Timeline Status Pengiriman
                    </h2>
                    <p className="text-xs text-slate-500">
                      Status saat ini:{' '}
                      <strong className="text-[#174634]">
                        {delivery
                          ? delivery.statusDelivery
                          : 'Belum ada pengiriman'}
                      </strong>
                    </p>
                  </div>
                </div>

                {delivery?.estimasiTiba && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#174634]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Estimasi Tiba: {delivery.estimasiTiba}</span>
                  </div>
                )}
              </div>

              {!delivery ? (
                <div className="rounded-2xl bg-[#f7f6f2] p-6 text-center text-xs text-slate-500">
                  Belum ada data pengiriman untuk ID pesanan ini.
                </div>
              ) : isWarningStatus ? (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-300 p-4 text-xs text-amber-900">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-0.5">
                      Status Pengiriman: {currentStatus}
                    </p>
                    <p>
                      {currentStatus === 'GAGAL_KIRIM'
                        ? 'Pengiriman mengalami kendala dan gagal dikirim ke tujuan.'
                        : 'Pengiriman pesanan ini telah dibatalkan.'}
                    </p>
                  </div>
                </div>
              ) : isUnknownStatus ? (
                <div className="flex items-start gap-3 rounded-2xl bg-slate-100 border border-slate-300 p-4 text-xs text-slate-800">
                  <Info className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-0.5">
                      Status Pengiriman: {currentStatus}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {PROGRESS_STEPS.map((step, index) => {
                    const isCompleted =
                      currentStepIndex > -1 && index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <div
                        key={step.key}
                        className={`rounded-2xl p-4 border transition-all ${
                          isCurrent
                            ? 'border-[#174634] bg-[#174634]/5 shadow-xs'
                            : isCompleted
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-slate-200/80 bg-slate-50/60 opacity-65'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                              isCompleted
                                ? 'bg-[#174634] text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {index + 1}
                          </span>
                          {isCompleted && (
                            <CheckCircle2 className="w-4 h-4 text-[#174634]" />
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 mb-1">
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#174634]" />
                    <span>Detail Pengiriman (Smart Delivery)</span>
                  </h2>
                  {delivery && (
                    <span className="px-2.5 py-1 rounded-full bg-[#f2efe9] text-[#174634] text-[10px] font-bold uppercase">
                      {delivery.metodeDeliv}
                    </span>
                  )}
                </div>

                {!delivery ? (
                  <div className="rounded-2xl bg-[#f7f6f2] p-5 text-center text-xs text-slate-500">
                    Belum ada pengiriman untuk pesanan ini.
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">
                        Alamat Tujuan
                      </span>
                      <p className="font-semibold text-slate-800">
                        {delivery.alamatTujuan}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-2xl bg-[#f7f6f2]">
                        <span className="text-slate-400 block text-[10px]">
                          Jarak & Sumber
                        </span>
                        <span className="font-bold text-slate-900">
                          {delivery.jarak} km
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {delivery.sumberJarak || '-'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#f7f6f2]">
                        <span className="text-slate-400 block text-[10px]">
                          Pelaksana & Ongkir
                        </span>
                        {isOngkirPendingAdmin ? (
                          <span className="font-bold text-amber-700 block">
                            Menunggu konfirmasi admin
                          </span>
                        ) : (
                          <span className="font-bold text-[#174634] block">
                            {formatRupiah(delivery.ongkir)}
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-500">
                          {delivery.pelaksana}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Kartu Informasi Pembayaran dengan input manual gatewayRef cadangan */}
              <section className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#174634]" />
                    <span>Informasi Pembayaran</span>
                  </h2>
                  {payment && payment.status && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        isPaymentSettled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  )}
                </div>

                {!payment ? (
                  <div className="rounded-2xl bg-[#f7f6f2] p-5 text-center space-y-3">
                    <p className="text-xs text-slate-500">
                      Belum ada pembayaran tercatat untuk pesanan ini.
                    </p>
                    {simulatePayError && (
                      <p className="text-xs text-red-600">{simulatePayError}</p>
                    )}
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        disabled={isCreatingPay}
                        onClick={() => handleCreateMissingPayment('QRIS')}
                        className="px-3.5 py-2 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                      >
                        {isCreatingPay ? 'Membuat...' : 'Buat Pembayaran QRIS'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-[#f7f6f2]">
                        <span className="text-slate-400 block text-[10px]">
                          Metode Pembayaran
                        </span>
                        <span className="font-bold text-slate-900">
                          {payment.metodePay}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#f7f6f2]">
                        <span className="text-slate-400 block text-[10px]">
                          Nominal Pembayaran Tercatat
                        </span>
                        <span className="font-bold text-[#174634] text-sm">
                          {formatRupiah(payment.jumlah)}
                        </span>
                      </div>
                    </div>

                    {/* Input manual gatewayRef agar bisa diedit jika kosong */}
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Kode Referensi Gateway (gatewayRef) — Dapat diedit:
                      </label>
                      <input
                        type="text"
                        value={payment.gatewayRef || manualGatewayRef}
                        onChange={(e) => setManualGatewayRef(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white focus:border-[#174634] focus:outline-none"
                        placeholder="Contoh: MOCK-REF-12345"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          Waktu Pembayaran (paidAt)
                        </span>
                        <span className="font-medium text-slate-800">
                          {payment.paidAt || 'Belum dibayar'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          Batas Waktu (expiredAt)
                        </span>
                        <span className="font-medium text-slate-800">
                          {payment.expiredAt || '-'}
                        </span>
                      </div>
                    </div>

                    {isDemoMode && !isPaymentSettled && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        {simulatePayError && (
                          <p className="text-xs text-red-600">
                            {simulatePayError}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={handleSimulatePaymentSuccess}
                          disabled={isSimulatingPay}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 px-4 text-xs transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {isSimulatingPay
                              ? 'Menyimulasikan Callback...'
                              : 'Simulasikan pembayaran berhasil (Mode Demo)'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrderStatusDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="lezzat-shell">
          <ShopSidebar />
          <main className="lezzat-main">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 animate-pulse h-64" />
          </main>
        </div>
      }
    >
      <OrderStatusContent />
    </Suspense>
  );
}