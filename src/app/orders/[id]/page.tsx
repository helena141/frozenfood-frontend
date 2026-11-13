'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  QrCode,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/axios';
import {
  formatRupiah,
  formatEstimasiTiba,
  formatWaktuSingkat,
  getErrorMessage,
} from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import {
  DeliveryResponse,
  PaymentResponse,
  OrderResponse,
} from '@/types/api';
import ShopSidebar from '@/components/shop/sidebar';

declare global {
  interface Window {
    snap?: {
      pay: (
        snapToken: string,
        callbacks: {
          onSuccess?: (result: Record<string, unknown>) => void;
          onPending?: (result: Record<string, unknown>) => void;
          onError?: (result: Record<string, unknown>) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

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

function parseValidPayment(raw: unknown): PaymentResponse | null {
  if (!raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== 'object') return null;

  const candidate = item as Record<string, unknown>;
  const target =
    candidate.data && typeof candidate.data === 'object'
      ? (candidate.data as Record<string, unknown>)
      : candidate;

  const gatewayRef =
    typeof target.gatewayRef === 'string' ? target.gatewayRef.trim() : '';
  const idPayment =
    typeof target.idPayment === 'string' ? target.idPayment.trim() : '';

  if (!gatewayRef && !idPayment) {
    return null;
  }

  return {
    idPayment,
    idOrder: String(target.idOrder || ''),
    gatewayRef,
    metodePay: String(target.metodePay || 'QRIS'),
    jumlah: typeof target.jumlah === 'number' ? target.jumlah : 0,
    status: String(target.status || 'PENDING'),
    paidAt: typeof target.paidAt === 'string' ? target.paidAt : null,
    expiredAt: typeof target.expiredAt === 'string' ? target.expiredAt : null,
    createdAt: String(target.createdAt || ''),
    updatedAt: String(target.updatedAt || ''),
  };
}

function parseValidDelivery(raw: unknown): DeliveryResponse | null {
  if (!raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== 'object') return null;

  const candidate = item as Record<string, unknown>;
  const target =
    candidate.data && typeof candidate.data === 'object'
      ? (candidate.data as Record<string, unknown>)
      : candidate;

  if (!target.idDelivery && !target.statusDelivery) {
    return null;
  }

  return target as unknown as DeliveryResponse;
}

function OrderStatusContent() {
  const params = useParams<{ id: string }>();
  const idOrder = params?.id || '';
  const user = useAuthStore((state) => state.user);

  const [todayYmd, setTodayYmd] = useState<string>('');
  const [cachedOrder, setCachedOrder] = useState<OrderResponse | null>(null);
  const [cachedPayment, setCachedPayment] = useState<PaymentResponse | null>(
    null
  );
  const [selectedPayMethod, setSelectedPayMethod] = useState<
    'QRIS' | 'TRANSFER'
  >('QRIS');
  const [isDownloadingNota, setIsDownloadingNota] = useState(false);
  const [notaError, setNotaError] = useState<string | null>(null);

  const [isSnapReady, setIsSnapReady] = useState(false);
  const [isOpeningMidtrans, setIsOpeningMidtrans] = useState(false);
  const [isCreatingPay, setIsCreatingPay] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const hasAutoLaunchedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
    if (window.snap) {
      setIsSnapReady(true);
      return;
    }

    const existingScript = document.getElementById('midtrans-snap-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsSnapReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'midtrans-snap-script';
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    script.onload = () => setIsSnapReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setTodayYmd(`${yyyy}-${mm}-${dd}`);

    if (typeof window !== 'undefined' && idOrder) {
      const raw =
        sessionStorage.getItem(`lezzat-order-${idOrder}`) ||
        localStorage.getItem(`lezzat-order-${idOrder}`);
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
            setCachedPayment(parseValidPayment(parsed.payment));
          }
        } catch {
          // Abaikan
        }
      }
    }
  }, [idOrder]);

  const { data: orderData, refetch: refetchOrder } =
    useQuery<OrderResponse | null>({
      queryKey: ['order-detail', idOrder],
      queryFn: async () => {
        try {
          const res = await api.get<OrderResponse>(`/api/orders/${idOrder}`);
          return res.data;
        } catch {
          return null;
        }
      },
      enabled: Boolean(idOrder),
      retry: false,
    });

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
        return parseValidDelivery(res.data);
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
        const res = await api.get<PaymentResponse[]>(
          `/api/payments/order/${idOrder}`
        );
        return parseValidPayment(res.data);
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

  const activeOrder = orderData ?? cachedOrder ?? null;
  const delivery = deliveryData ?? null;
  const payment = paymentData ?? cachedPayment ?? null;

  const handleRefreshAll = useCallback(() => {
    refetchOrder();
    refetchDelivery();
    refetchPayment();
  }, [refetchOrder, refetchDelivery, refetchPayment]);

  const syncBackendCallbackLunas = useCallback(
    async (targetPayment: PaymentResponse) => {
      try {
        await api.post('/api/payments/callback', {
          gatewayRef: targetPayment.gatewayRef,
          status: 'LUNAS',
          jumlahDikonfirmasi: targetPayment.jumlah,
        });
        setPayNotice(
          'Pembayaran Midtrans berhasil! Status pesanan telah diperbarui menjadi LUNAS.'
        );
        handleRefreshAll();
      } catch (err) {
        setPayError(
          getErrorMessage(
            err,
            'Gagal memperbarui status pembayaran ke server backend.'
          )
        );
      }
    },
    [handleRefreshAll]
  );

  const launchMidtransSnapDirect = useCallback(
    async (targetPayment: PaymentResponse) => {
      setPayError(null);
      setPayNotice(null);
      setIsOpeningMidtrans(true);

      try {
        const res = await fetch('/api/midtrans/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gatewayRef: targetPayment.gatewayRef,
            jumlah: targetPayment.jumlah,
            metodePay: targetPayment.metodePay,
            customerName: user?.nama || 'Pelanggan Froznfood',
            customerEmail: user?.email || 'customer@froznfood.id',
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.token) {
          throw new Error(
            data.message || 'Gagal mengambil token pembayaran dari Midtrans.'
          );
        }

        if (!window.snap) {
          throw new Error(
            'Midtrans Snap sedang dimuat, silakan klik kembali tombol Bayar beberapa detik lagi.'
          );
        }

        window.snap.pay(data.token, {
          onSuccess: async () => {
            await syncBackendCallbackLunas(targetPayment);
          },
          onPending: () => {
            setPayNotice(
              'Menunggu penyelesaian pembayaran di Midtrans. Setelah membayar di Simulator Midtrans, status akan menjadi LUNAS.'
            );
          },
          onError: () => {
            setPayError('Pembayaran gagal atau dibatalkan di Midtrans.');
          },
          onClose: () => {
            // Popup ditutup oleh user
          },
        });
      } catch (err) {
        setPayError(
          err instanceof Error
            ? err.message
            : 'Gagal membuka popup pembayaran Midtrans.'
        );
      } finally {
        setIsOpeningMidtrans(false);
      }
    },
    [user?.nama, user?.email, syncBackendCallbackLunas]
  );

  const isPaymentSettled =
    payment?.status === 'LUNAS' ||
    payment?.status === 'PAID' ||
    payment?.status === 'SUCCESS';

  useEffect(() => {
    if (
      isSnapReady &&
      payment &&
      !isPaymentSettled &&
      !hasAutoLaunchedRef.current
    ) {
      hasAutoLaunchedRef.current = true;
      launchMidtransSnapDirect(payment);
    }
  }, [isSnapReady, payment, isPaymentSettled, launchMidtransSnapDirect]);

  const handleCreateAndOpenMidtrans = async (
    metodePay: 'QRIS' | 'TRANSFER'
  ) => {
    if (!idOrder) return;
    setPayError(null);
    setIsCreatingPay(true);
    try {
      const res = await api.post('/api/payments', {
        idOrder,
        metodePay,
      });
      const created = parseValidPayment(res.data);
      if (created) {
        setCachedPayment(created);
        await refetchPayment();
        await launchMidtransSnapDirect(created);
      }
    } catch (error) {
      setPayError(
        getErrorMessage(error, 'Gagal menginisiasi pembayaran ke backend.')
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
        getErrorMessage(
          error,
          'Gagal mengunduh Nota PDF. Pastikan pesanan valid.'
        )
      );
    } finally {
      setIsDownloadingNota(false);
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

  const subtotalBarang = activeOrder?.items?.length
    ? activeOrder.items.reduce((sum, item) => sum + item.subtotalItem, 0)
    : 0;

  const totalHargaNormalBarang = activeOrder?.items?.length
    ? activeOrder.items.reduce((sum, item) => {
        const hargaNormal =
          typeof item.hargaAsli === 'number' && item.hargaAsli > 0
            ? item.hargaAsli
            : item.hargaSatuanSnapshot;
        return sum + hargaNormal * item.quantity;
      }, 0)
    : 0;

  const totalHematBarang = Math.max(0, totalHargaNormalBarang - subtotalBarang);

  const isOngkirPendingAdmin =
    delivery?.pelaksana === 'PIHAK_KETIGA' &&
    delivery?.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN';

  const ongkirPengiriman =
    delivery && !isOngkirPendingAdmin ? delivery.ongkir : 0;

  const totalTagihanAkhir = subtotalBarang + ongkirPengiriman;

  const formattedEstimasi = delivery?.estimasiTiba
    ? formatEstimasiTiba(
        delivery.estimasiTiba,
        delivery.metodeDeliv === 'SAMEDAY' ? true : undefined,
        todayYmd
      )
    : null;

  const isDeliveryCancelled = currentStatus === 'DIBATALKAN';

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5E5E6A] hover:text-[#4737FF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Riwayat Pesanan</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#4737FF]" />
              <span>Muat Ulang Status</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadNota}
              disabled={isDownloadingNota}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] disabled:opacity-60 text-white text-xs font-bold shadow-sm shadow-[#4737FF]/25 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isDownloadingNota ? 'Mengunduh PDF...' : 'Unduh Nota PDF'}
              </span>
            </button>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
            FROZNFOOD 2.0 • ORDER DETAILS & COLD-CHAIN TRACKING
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] break-all mt-1">
            Pesanan #{idOrder}
          </h1>
        </div>

        {notaError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-2xl border border-[#E5484D]/30 bg-[#E5484D]/10 p-4 text-xs text-[#E5484D] font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notaError}</span>
          </div>
        )}

        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="ff-card bg-white p-6 h-44" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="ff-card bg-white p-6 h-64" />
              <div className="ff-card bg-white p-6 h-64" />
            </div>
          </div>
        )}

        {!isLoading && (isErrorDelivery || isErrorPayment) && (
          <div className="ff-card bg-white p-8 border border-[#E5484D]/30 text-center max-w-lg mx-auto my-8">
            <AlertCircle className="w-10 h-10 text-[#E5484D] mx-auto mb-3" />
            <h2 className="font-heading text-base font-bold text-[#171725] mb-1">
              Gagal Memuat Data Pesanan
            </h2>
            <p className="text-xs text-[#77788A] mb-5">
              {getErrorMessage(
                errorDelivery || errorPayment,
                'Terjadi kesalahan saat menghubungi server.'
              )}
            </p>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        )}

        {!isLoading && !isErrorDelivery && !isErrorPayment && (
          <div className="space-y-6">
            {/* Timeline Status Pengiriman */}
            <section className="ff-card bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-[#E6E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-base font-extrabold text-[#171725]">
                      Timeline Status Pengiriman
                    </h2>
                    <p className="text-xs text-[#77788A]">
                      Status saat ini:{' '}
                      <strong className="text-[#4737FF]">
                        {delivery
                          ? delivery.statusDelivery
                          : 'Belum ada pengiriman'}
                      </strong>
                    </p>
                  </div>
                </div>

                {formattedEstimasi && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E7EFFF] border border-[#D1CDFF] text-xs text-[#4737FF]">
                    <Clock className="w-4 h-4 shrink-0 text-[#4737FF]" />
                    <span>
                      Estimasi Tiba:{' '}
                      <strong className="font-extrabold text-sm text-[#171725]">
                        {formattedEstimasi}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {!delivery ? (
                <div className="rounded-2xl bg-[#F8FAFF] p-6 text-center text-xs text-[#77788A]">
                  Belum ada data pengiriman untuk ID pesanan ini.
                </div>
              ) : isWarningStatus ? (
                <div className="flex items-start gap-3 rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 p-4 text-xs text-[#E5484D]">
                  <XCircle className="w-5 h-5 text-[#E5484D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-0.5">
                      Status Pengiriman: {currentStatus}
                    </p>
                    <p className="text-[#171725]">
                      {currentStatus === 'GAGAL_KIRIM'
                        ? 'Pengiriman mengalami kendala dan gagal dikirim ke tujuan.'
                        : 'Pengiriman pesanan ini telah dibatalkan.'}
                    </p>
                  </div>
                </div>
              ) : isUnknownStatus ? (
                <div className="flex items-start gap-3 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0] p-4 text-xs text-[#171725]">
                  <Info className="w-5 h-5 text-[#4737FF] shrink-0 mt-0.5" />
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
                        className={`rounded-2xl p-4 border-2 transition-all ${
                          isCurrent
                            ? 'border-[#4737FF] bg-[#E7EFFF]/60 shadow-sm'
                            : isCompleted
                              ? 'border-[#159A68]/40 bg-[#159A68]/5'
                              : 'border-[#E6E8F0] bg-[#F8FAFF] opacity-65'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
                              isCurrent
                                ? 'bg-[#4737FF] text-white'
                                : isCompleted
                                  ? 'bg-[#159A68] text-white'
                                  : 'bg-[#E6E8F0] text-[#5E5E6A]'
                            }`}
                          >
                            {index + 1}
                          </span>
                          {isCompleted && (
                            <CheckCircle2
                              className={`w-4 h-4 ${
                                isCurrent ? 'text-[#4737FF]' : 'text-[#159A68]'
                              }`}
                            />
                          )}
                        </div>
                        <p className="font-heading text-xs font-extrabold text-[#171725] mb-1">
                          {step.label}
                        </p>
                        <p className="text-[11px] text-[#77788A] leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Grid 2 Kolom: Detail Pengiriman & Pembayaran Midtrans */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kartu Detail Pengiriman */}
              <section className="ff-card bg-white p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E8F0]">
                  <h2 className="font-heading text-sm font-extrabold text-[#171725] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#4737FF]" />
                    <span>Detail Pengiriman (Smart Delivery)</span>
                  </h2>
                  {delivery && (
                    <span className="px-2.5 py-1 rounded-md bg-[#E7EFFF] text-[#4737FF] text-[10px] font-extrabold uppercase">
                      {delivery.metodeDeliv}
                    </span>
                  )}
                </div>

                {!delivery ? (
                  <div className="rounded-2xl bg-[#F8FAFF] p-5 text-center text-xs text-[#77788A]">
                    Belum ada pengiriman untuk pesanan ini.
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0]">
                      <span className="text-[#77788A] block text-[10px] mb-0.5">
                        Alamat Tujuan
                      </span>
                      <p className="font-bold text-[#171725]">
                        {delivery.alamatTujuan}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px]">
                          Jarak & Sumber
                        </span>
                        <span className="font-extrabold text-[#171725] text-sm">
                          {delivery.jarak} km
                        </span>
                        <span className="block text-[10px] text-[#77788A] mt-0.5">
                          {delivery.sumberJarak || '-'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px]">
                          Pelaksana & Ongkir
                        </span>
                        {isOngkirPendingAdmin ? (
                          <span className="font-bold text-[#D97706] block">
                            Menunggu konfirmasi admin
                          </span>
                        ) : (
                          <span className="font-extrabold text-[#4737FF] text-sm block">
                            {delivery.ongkir === 0
                              ? 'GRATIS'
                              : formatRupiah(delivery.ongkir)}
                          </span>
                        )}
                        <span className="block text-[10px] text-[#77788A] mt-0.5">
                          {delivery.pelaksana}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px] mb-1">
                          Nama Pengantar / Kurir
                        </span>
                        <span className="font-bold text-[#171725] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#4737FF]" />
                          {delivery.namaPengantar || 'Belum ditugaskan'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#E7EFFF] border border-[#D1CDFF]">
                        <span className="text-[#4737FF] font-bold block text-[10px] uppercase tracking-wider mb-1">
                          Estimasi Tiba (WIB)
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-[#171725] block leading-tight">
                          {formattedEstimasi || 'Menunggu jadwal'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Kartu Pembayaran Langsung ke Midtrans Snap */}
              <section className="ff-card bg-white p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E8F0]">
                  <h2 className="font-heading text-sm font-extrabold text-[#171725] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#4737FF]" />
                    <span>Pembayaran Online (Midtrans)</span>
                  </h2>
                  {payment && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        isPaymentSettled
                          ? 'bg-[#159A68]/15 text-[#159A68]'
                          : 'bg-[#D97706]/15 text-[#D97706]'
                      }`}
                    >
                      {payment.status}
                    </span>
                  )}
                </div>

                {payError && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/30 p-3 text-xs text-[#E5484D] font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{payError}</span>
                  </div>
                )}

                {payNotice && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#159A68]/10 border border-[#159A68]/30 p-3 text-xs text-[#159A68] font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{payNotice}</span>
                  </div>
                )}

                {!payment ? (
                  <div className="rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0] p-5 text-center space-y-3">
                    {isOngkirPendingAdmin ? (
                      <p className="text-xs text-[#D97706] font-semibold">
                        Ongkir sedang menunggu konfirmasi admin. Pembayaran
                        Midtrans akan aktif setelah admin menetapkan ongkir.
                      </p>
                    ) : isDeliveryCancelled ? (
                      <p className="text-xs text-[#77788A]">
                        Pengiriman dibatalkan. Pembayaran tidak dapat diproses.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-[#5E5E6A]">
                          Pilih metode pembayaran untuk langsung membuka
                          Midtrans:
                        </p>
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPayMethod('QRIS')}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                              selectedPayMethod === 'QRIS'
                                ? 'border-[#4737FF] bg-[#4737FF] text-white shadow-xs'
                                : 'border-[#E6E8F0] bg-white text-[#171725]'
                            }`}
                          >
                            QRIS
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPayMethod('TRANSFER')}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                              selectedPayMethod === 'TRANSFER'
                                ? 'border-[#4737FF] bg-[#4737FF] text-white shadow-xs'
                                : 'border-[#E6E8F0] bg-white text-[#171725]'
                            }`}
                          >
                            Transfer Virtual Account
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={isCreatingPay || isOpeningMidtrans}
                          onClick={() =>
                            handleCreateAndOpenMidtrans(selectedPayMethod)
                          }
                          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-[#F75C03]/25 transition-all cursor-pointer"
                        >
                          {isCreatingPay || isOpeningMidtrans ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Menghubungkan ke Midtrans...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              <span>
                                Bayar Sekarang via Midtrans ({selectedPayMethod})
                              </span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px]">
                          Metode Pembayaran
                        </span>
                        <span className="font-extrabold text-[#171725]">
                          {payment.metodePay}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px]">
                          Total Tagihan (Payment.jumlah)
                        </span>
                        <span className="font-extrabold text-[#4737FF] text-sm">
                          {formatRupiah(payment.jumlah)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0]">
                      <span className="text-[#77788A] block text-[10px]">
                        Kode Referensi Gateway (gatewayRef)
                      </span>
                      <span className="font-mono font-bold text-[#171725] text-xs">
                        {payment.gatewayRef}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#77788A] block text-[10px]">
                          Waktu Pembayaran (paidAt)
                        </span>
                        <span className="font-semibold text-[#171725]">
                          {payment.paidAt
                            ? formatWaktuSingkat(payment.paidAt)
                            : 'Menunggu Pembayaran'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#77788A] block text-[10px]">
                          Batas Waktu (expiredAt)
                        </span>
                        <span className="font-semibold text-[#171725]">
                          {payment.expiredAt
                            ? formatWaktuSingkat(payment.expiredAt)
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {!isPaymentSettled && (
                      <div className="pt-3 border-t border-[#E6E8F0] space-y-2.5">
                        <button
                          type="button"
                          disabled={isOpeningMidtrans || !isSnapReady}
                          onClick={() => launchMidtransSnapDirect(payment)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#F75C03] hover:bg-[#D94800] disabled:opacity-60 text-white font-extrabold py-3.5 px-4 text-xs shadow-md shadow-[#F75C03]/25 transition-all cursor-pointer"
                        >
                          {isOpeningMidtrans ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Membuka Midtrans Snap...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              <span>
                                {payment.metodePay === 'TRANSFER'
                                  ? 'Bayar via Virtual Account (Midtrans)'
                                  : 'Tampilkan QRIS & Bayar (Midtrans)'}
                              </span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center justify-between text-[11px] text-[#77788A] px-1">
                          <a
                            href="https://simulator.sandbox.midtrans.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-[#2563EB] hover:underline"
                          >
                            <span>Simulator Midtrans Sandbox</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => syncBackendCallbackLunas(payment)}
                            className="font-bold text-[#4737FF] hover:underline cursor-pointer"
                          >
                            Cek / Konfirmasi Status Lunas
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Tabel Rincian Item & Total Keseluruhan */}
            <section className="ff-card bg-white p-6">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E8F0]">
                <h2 className="font-heading text-sm font-extrabold text-[#171725] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#4737FF]" />
                  <span>Rincian Item & Total Keseluruhan</span>
                </h2>
                <button
                  type="button"
                  onClick={handleDownloadNota}
                  disabled={isDownloadingNota}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4737FF] hover:underline cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unduh Nota Resmi (PDF)</span>
                </button>
              </div>

              {activeOrder && activeOrder.items?.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E6E8F0] text-[#77788A] uppercase tracking-wider text-[11px]">
                          <th className="pb-2.5 font-bold">Nama Produk</th>
                          <th className="pb-2.5 font-bold">Batch FEFO</th>
                          <th className="pb-2.5 font-bold">
                            Harga Normal vs Deal/Tier
                          </th>
                          <th className="pb-2.5 font-bold">Qty</th>
                          <th className="pb-2.5 font-bold text-right">
                            Subtotal Barang
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E8F0]">
                        {activeOrder.items.map((item) => {
                          const hasDisc =
                            typeof item.hargaAsli === 'number' &&
                            item.hargaAsli > item.hargaSatuanSnapshot;

                          return (
                            <tr key={item.idOrderItem}>
                              <td className="py-3.5">
                                <span className="font-bold text-[#171725] block">
                                  {item.namaProduk}
                                </span>
                                {hasDisc && item.keteranganPromo && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#F75C03]/15 text-[#D93800] text-[10px] font-extrabold">
                                    {item.keteranganPromo}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 font-mono text-[11px] text-[#77788A]">
                                {item.idProdBatch}
                              </td>
                              <td className="py-3.5">
                                {hasDisc ? (
                                  <div className="flex flex-col">
                                    <span className="text-[11px] text-[#77788A] line-through">
                                      {formatRupiah(item.hargaAsli!)}
                                    </span>
                                    <span className="font-extrabold text-[#F75C03]">
                                      {formatRupiah(item.hargaSatuanSnapshot)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[#5E5E6A] font-semibold">
                                    {formatRupiah(item.hargaSatuanSnapshot)}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 font-bold text-[#171725]">
                                {item.quantity}
                              </td>
                              <td className="py-3.5 text-right">
                                {hasDisc && (
                                  <span className="block text-[10px] text-[#77788A] line-through">
                                    {formatRupiah(
                                      item.hargaAsli! * item.quantity
                                    )}
                                  </span>
                                )}
                                <span
                                  className={`font-extrabold ${
                                    hasDisc
                                      ? 'text-[#F75C03]'
                                      : 'text-[#171725]'
                                  }`}
                                >
                                  {formatRupiah(item.subtotalItem)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-[#E6E8F0] space-y-2 text-xs">
                    {totalHematBarang > 0 && (
                      <>
                        <div className="flex justify-between text-[#77788A]">
                          <span>Total Harga Normal</span>
                          <span className="line-through">
                            {formatRupiah(totalHargaNormalBarang)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[#159A68] font-bold">
                          <span>Total Hemat (Diskon FEFO / Tiering)</span>
                          <span>- {formatRupiah(totalHematBarang)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-[#5E5E6A]">
                      <span>Subtotal Barang</span>
                      <span className="font-bold text-[#171725]">
                        {formatRupiah(subtotalBarang)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#5E5E6A]">
                      <span>Ongkir</span>
                      <span className="font-bold text-[#159A68]">
                        {!delivery
                          ? 'Belum ada pengiriman'
                          : isOngkirPendingAdmin
                            ? 'Menunggu konfirmasi admin'
                            : delivery.ongkir === 0
                              ? 'GRATIS'
                              : formatRupiah(delivery.ongkir)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-extrabold text-[#171725] pt-2.5 border-t border-[#E6E8F0]">
                      <span>Total Keseluruhan</span>
                      <span className="text-[#4737FF] text-base">
                        {isOngkirPendingAdmin
                          ? `${formatRupiah(subtotalBarang)} + Menunggu konfirmasi admin`
                          : formatRupiah(
                              payment?.jumlah || totalTagihanAkhir
                            )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-2xl bg-[#E7EFFF] border border-[#D1CDFF] p-4 text-xs text-[#171725]">
                  <Info className="w-4 h-4 text-[#4737FF] shrink-0 mt-0.5" />
                  <span>
                    Klik tombol <strong>Unduh Nota PDF</strong> di atas untuk
                    melihat rincian item pesanan resmi.
                  </span>
                </div>
              )}
            </section>
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
            <div className="ff-card bg-white p-8 animate-pulse h-64" />
          </main>
        </div>
      }
    >
      <OrderStatusContent />
    </Suspense>
  );
}