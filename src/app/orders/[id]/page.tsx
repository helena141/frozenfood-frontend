'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  Sparkles,
  QrCode,
} from 'lucide-react';
import { api } from '@/lib/axios';
import {
  formatRupiah,
  formatEstimasiTiba,
  formatWaktuSingkat,
  getErrorMessage,
} from '@/lib/utils';
import {
  DeliveryResponse,
  PaymentResponse,
  OrderResponse,
} from '@/types/api';
import ShopSidebar from '@/components/shop/sidebar';
import QrisDemoModal from '@/components/shop/qris-demo-modal';

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
    updatedAt: String(target.createdAt || ''),
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

  const [simulatePayError, setSimulatePayError] = useState<string | null>(null);
  const [isCreatingPay, setIsCreatingPay] = useState(false);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);

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

  const handleRefreshAll = () => {
    refetchOrder();
    refetchDelivery();
    refetchPayment();
  };

  const handleCreatePayment = async (metodePay: 'QRIS' | 'TRANSFER') => {
    if (!idOrder) return;
    setSimulatePayError(null);
    setIsCreatingPay(true);
    try {
      const res = await api.post('/api/payments', {
        idOrder,
        metodePay,
      });
      const created = parseValidPayment(res.data);
      if (created) {
        setCachedPayment(created);
      }
      await refetchPayment();
      setIsQrisModalOpen(true);
    } catch (error) {
      setSimulatePayError(
        getErrorMessage(error, 'Gagal membuat pembayaran ke backend.')
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#174634]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Riwayat Pesanan</span>
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

                {formattedEstimasi && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-[#174634]">
                    <Clock className="w-4 h-4 shrink-0 text-[#174634]" />
                    <span>
                      Estimasi Tiba:{' '}
                      <strong className="font-extrabold text-sm">
                        {formattedEstimasi}
                      </strong>
                    </span>
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
                            {delivery.ongkir === 0
                              ? 'GRATIS'
                              : formatRupiah(delivery.ongkir)}
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-500">
                          {delivery.pelaksana}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#f7f6f2]">
                        <span className="text-slate-400 block text-[10px] mb-1">
                          Nama Pengantar / Kurir
                        </span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {delivery.namaPengantar || 'Belum ditugaskan'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200">
                        <span className="text-emerald-800/75 font-medium block text-[10px] uppercase tracking-wider mb-1">
                          Estimasi Tiba (WIB)
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-[#174634] block leading-tight">
                          {formattedEstimasi || 'Menunggu jadwal'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#174634]" />
                    <span>Informasi Pembayaran & Demo QRIS</span>
                  </h2>
                  {payment && (
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
                    {isOngkirPendingAdmin ? (
                      <p className="text-xs text-amber-800 font-medium">
                        Ongkir sedang menunggu konfirmasi admin. Tombol
                        pembayaran QRIS akan aktif setelah admin menetapkan
                        ongkir.
                      </p>
                    ) : isDeliveryCancelled ? (
                      <p className="text-xs text-slate-500">
                        Pengiriman dibatalkan. Pembayaran tidak dapat diproses.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-600">
                          Pilih metode pembayaran untuk memunculkan kode QRIS /
                          Virtual Account:
                        </p>
                        {simulatePayError && (
                          <p className="text-xs text-red-600 font-medium">
                            {simulatePayError}
                          </p>
                        )}
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPayMethod('QRIS')}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                              selectedPayMethod === 'QRIS'
                                ? 'border-[#174634] bg-[#174634] text-white'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            QRIS (Scan QR)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPayMethod('TRANSFER')}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                              selectedPayMethod === 'TRANSFER'
                                ? 'border-[#174634] bg-[#174634] text-white'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            TRANSFER VA
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={isCreatingPay}
                          onClick={() => handleCreatePayment(selectedPayMethod)}
                          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>
                            {isCreatingPay
                              ? 'Membuat Tagihan QRIS...'
                              : `Buat Tagihan & Buka Demo ${selectedPayMethod}`}
                          </span>
                        </button>
                      </>
                    )}
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
                          Total Tagihan (Payment.jumlah)
                        </span>
                        <span className="font-bold text-[#174634] text-sm">
                          {formatRupiah(payment.jumlah)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#f7f6f2]">
                      <span className="text-slate-400 block text-[10px]">
                        Kode Referensi Gateway (gatewayRef)
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {payment.gatewayRef}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          Waktu Pembayaran (paidAt)
                        </span>
                        <span className="font-medium text-slate-800">
                          {payment.paidAt
                            ? formatWaktuSingkat(payment.paidAt)
                            : 'Menunggu Pembayaran'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          Batas Waktu (expiredAt)
                        </span>
                        <span className="font-medium text-slate-800">
                          {payment.expiredAt
                            ? formatWaktuSingkat(payment.expiredAt)
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {!isPaymentSettled && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => setIsQrisModalOpen(true)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 text-xs shadow-sm transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            Buka QRIS & Simulasikan Pembayaran Lunas (Demo)
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <section className="bg-white rounded-3xl p-6 border border-slate-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#174634]" />
                  <span>Rincian Item & Total Keseluruhan</span>
                </h2>
                <button
                  type="button"
                  onClick={handleDownloadNota}
                  disabled={isDownloadingNota}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#174634] hover:underline cursor-pointer"
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
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="pb-2 font-semibold">Nama Produk</th>
                          <th className="pb-2 font-semibold">Batch FEFO</th>
                          <th className="pb-2 font-semibold">Harga Satuan</th>
                          <th className="pb-2 font-semibold">Qty</th>
                          <th className="pb-2 font-semibold text-right">
                            Subtotal Barang
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeOrder.items.map((item) => (
                          <tr key={item.idOrderItem}>
                            <td className="py-3 font-bold text-slate-900">
                              {item.namaProduk}
                            </td>
                            <td className="py-3 font-mono text-[11px] text-slate-500">
                              {item.idProdBatch}
                            </td>
                            <td className="py-3 text-slate-600">
                              {formatRupiah(item.hargaSatuanSnapshot)}
                            </td>
                            <td className="py-3 font-semibold text-slate-800">
                              {item.quantity}
                            </td>
                            <td className="py-3 font-bold text-slate-900 text-right">
                              {formatRupiah(item.subtotalItem)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Barang</span>
                      <span className="font-semibold text-slate-900">
                        {formatRupiah(subtotalBarang)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Ongkir</span>
                      <span className="font-semibold text-[#174634]">
                        {!delivery
                          ? 'Belum ada pengiriman'
                          : isOngkirPendingAdmin
                            ? 'Menunggu konfirmasi admin'
                            : delivery.ongkir === 0
                              ? 'GRATIS'
                              : formatRupiah(delivery.ongkir)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                      <span>Total Keseluruhan</span>
                      <span className="text-[#174634]">
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
                <div className="flex items-start gap-2.5 rounded-2xl bg-[#f7f6f2] p-4 text-xs text-slate-600">
                  <Info className="w-4 h-4 text-[#174634] shrink-0 mt-0.5" />
                  <span>
                    Klik tombol <strong>Unduh Nota PDF</strong> di atas untuk
                    melihat rincian item pesanan resmi.
                  </span>
                </div>
              )}
            </section>
          </div>
        )}

        {payment && (
          <QrisDemoModal
            isOpen={isQrisModalOpen}
            onClose={() => setIsQrisModalOpen(false)}
            gatewayRef={payment.gatewayRef}
            jumlah={payment.jumlah}
            metodePay={payment.metodePay}
            idOrder={idOrder}
            onSuccess={handleRefreshAll}
          />
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
