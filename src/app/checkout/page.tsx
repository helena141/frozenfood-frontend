'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Truck,
  Snowflake,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Calculator,
  Scale,
  Info,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/axios';
import {
  evaluateCartItemPricing,
  formatRupiah,
  formatEstimasiTiba,
  getErrorMessage,
} from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import {
  DeliveryEstimateResponse,
  OrderResponse,
  DeliveryResponse,
  PaymentResponse,
} from '@/types/api';
import ShopSidebar from '@/components/shop/sidebar';

// 4 Preset Lokasi sesuai Bagian A6
const DEMO_LOCATIONS = [
  {
    label: 'Malioboro, Yogyakarta',
    alamat:
      'Jl. Malioboro No. 52, Suryatmajan, Kec. Danurejan, Kota Yogyakarta',
    lat: -7.7925,
    lng: 110.365,
  },
  {
    label: 'Gamping, Sleman',
    alamat: 'Jl. Wates Km 5, Ambarketawang, Kec. Gamping, Kabupaten Sleman',
    lat: -7.7993,
    lng: 110.318,
  },
  {
    label: 'Klaten, Jawa Tengah',
    alamat:
      'Jl. Pemuda No. 140, Tonggalan, Kec. Klaten Tengah, Kabupaten Klaten',
    lat: -7.7058,
    lng: 110.6008,
  },
  {
    label: 'Jakarta Monas',
    alamat: 'Jl. Medan Merdeka Barat No. 12, Gambir, Jakarta Pusat',
    lat: -6.1754,
    lng: 106.8272,
  },
];

const checkoutSchema = z.object({
  alamatTujuan: z.string().min(5, 'Alamat lengkap tujuan wajib diisi'),
  latitudeTujuan: z.coerce
    .number({ invalid_type_error: 'Latitude harus berupa angka' })
    .min(-90, 'Latitude minimal -90')
    .max(90, 'Latitude maksimal 90'),
  longitudeTujuan: z.coerce
    .number({ invalid_type_error: 'Longitude harus berupa angka' })
    .min(-180, 'Longitude minimal -180')
    .max(180, 'Longitude maksimal 180'),
  catatan: z.string().optional(),
  metodePay: z.enum(['QRIS', 'TRANSFER'], {
    required_error: 'Pilih metode pembayaran',
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function extractFirstPayment(raw: unknown): PaymentResponse | null {
  if (!raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== 'object') return null;

  const obj = item as Partial<PaymentResponse>;
  if (!obj.idPayment && !obj.gatewayRef) return null;

  return obj as PaymentResponse;
}

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const {
    items,
    getSubtotal,
    getOriginalSubtotal,
    getTotalSaved,
    clearCart,
  } = useCartStore();

  const [estimate, setEstimate] = useState<DeliveryEstimateResponse | null>(
    null
  );
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [pendingOrder, setPendingOrder] = useState<OrderResponse | null>(null);

  const subtotal = getSubtotal(user?.tipeAkun);
  const originalSubtotal = getOriginalSubtotal();
  const totalSaved = getTotalSaved(user?.tipeAkun);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      alamatTujuan: DEMO_LOCATIONS[0].alamat,
      latitudeTujuan: DEMO_LOCATIONS[0].lat,
      longitudeTujuan: DEMO_LOCATIONS[0].lng,
      catatan: '',
      metodePay: 'QRIS',
    },
  });

  const selectedMetodePay = watch('metodePay');

  const handleSelectDemoLocation = (preset: (typeof DEMO_LOCATIONS)[number]) => {
    if (pendingOrder) return;
    setEstimateError(null);
    setEstimate(null);
    setValue('alamatTujuan', preset.alamat, { shouldValidate: true });
    setValue('latitudeTujuan', preset.lat, { shouldValidate: true });
    setValue('longitudeTujuan', preset.lng, { shouldValidate: true });
  };

  const handleUseCurrentLocation = () => {
    if (pendingOrder) return;
    if (!navigator.geolocation) {
      setEstimateError('Browser Anda tidak mendukung fitur Geolocation.');
      return;
    }
    setIsLocating(true);
    setEstimateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue(
          'latitudeTujuan',
          Number(position.coords.latitude.toFixed(6)),
          { shouldValidate: true }
        );
        setValue(
          'longitudeTujuan',
          Number(position.coords.longitude.toFixed(6)),
          { shouldValidate: true }
        );
        setEstimate(null);
        setIsLocating(false);
      },
      () => {
        setEstimateError(
          'Gagal mengambil lokasi GPS. Pastikan izin lokasi browser aktif atau gunakan tombol lokasi contoh di bawah.'
        );
        setIsLocating(false);
      }
    );
  };

  const handleCalculateEstimate = async () => {
    setEstimateError(null);
    setSubmitError(null);
    setInfoNotice(null);
    const lat = Number(getValues('latitudeTujuan'));
    const lng = Number(getValues('longitudeTujuan'));

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setEstimateError('Masukkan angka Latitude dan Longitude yang valid.');
      return;
    }

    if (items.length === 0) {
      setEstimateError('Keranjang belanja Anda kosong.');
      return;
    }

    setIsEstimating(true);
    try {
      const payload = {
        latitudeTujuan: lat,
        longitudeTujuan: lng,
        items: items.map((item) => ({
          idProduk: item.product.idProduk,
          quantity:
            Number.isNaN(item.qty) || item.qty < 1 ? 1 : item.qty,
        })),
      };

      const response = await api.post<DeliveryEstimateResponse>(
        '/api/deliveries/estimate',
        payload
      );
      setEstimate(response.data);
    } catch (error) {
      setEstimate(null);
      setEstimateError(
        getErrorMessage(error, 'Gagal menghitung estimasi pengiriman.')
      );
    } finally {
      setIsEstimating(false);
    }
  };

  const ensureDeliveryCreated = async (
    idOrder: string,
    values: CheckoutFormValues
  ): Promise<DeliveryResponse> => {
    try {
      const existing = await api.get<DeliveryResponse>(
        `/api/deliveries/order/${idOrder}`
      );
      if (existing.data && existing.data.idDelivery) {
        return existing.data;
      }
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 404) {
        throw err;
      }
    }

    try {
      const created = await api.post<DeliveryResponse>('/api/deliveries', {
        idOrder,
        alamatTujuan: values.alamatTujuan,
        latitudeTujuan: Number(values.latitudeTujuan),
        longitudeTujuan: Number(values.longitudeTujuan),
      });
      return created.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const existing = await api.get<DeliveryResponse>(
          `/api/deliveries/order/${idOrder}`
        );
        return existing.data;
      }
      throw err;
    }
  };

  const ensurePaymentCreated = async (
    idOrder: string,
    metodePay: string
  ): Promise<PaymentResponse> => {
    try {
      const existingRes = await api.get<PaymentResponse[]>(
        `/api/payments/order/${idOrder}`
      );
      const existingPayment = extractFirstPayment(existingRes.data);
      if (existingPayment) {
        return existingPayment;
      }
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 404) {
        throw err;
      }
    }

    try {
      const created = await api.post<PaymentResponse>('/api/payments', {
        idOrder,
        metodePay,
      });
      return created.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const existingRes = await api.get<PaymentResponse[]>(
          `/api/payments/order/${idOrder}`
        );
        const existingPayment = extractFirstPayment(existingRes.data);
        if (existingPayment) {
          return existingPayment;
        }
      }
      throw err;
    }
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    setSubmitError(null);
    setInfoNotice(null);

    if (!user) {
      router.push('/login');
      return;
    }

    if (!user.idUser) {
      setSubmitError(
        'Data idUser belum ditemukan pada sesi login Anda. Silakan Keluar Akun (Logout) lalu Login kembali.'
      );
      return;
    }

    if (!estimate) {
      setSubmitError(
        'Silakan klik tombol "Hitung Estimasi Ongkir & Jadwal" terlebih dahulu sebelum membuat pesanan.'
      );
      return;
    }

    let activeOrder = pendingOrder;

    try {
      if (!activeOrder) {
        const mappedItems = items.map((i) => ({
          idProduk: i.product.idProduk,
          quantity: Number.isNaN(i.qty) || i.qty < 1 ? 1 : i.qty,
        }));

        const orderRes =
          user.tipeAkun === 'B2B'
            ? await api.post<OrderResponse>('/api/orders/checkout', {
                items: mappedItems,
              })
            : await api.post<OrderResponse>('/api/orders/retail', {
                idUser: user.idUser,
                items: mappedItems,
                catatan: values.catatan || undefined,
              });

        activeOrder = orderRes.data;
        setPendingOrder(activeOrder);

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            `lezzat-order-${activeOrder.idOrder}`,
            JSON.stringify({ order: activeOrder })
          );
        }
      }

      const deliveryData = await ensureDeliveryCreated(
        activeOrder.idOrder,
        values
      );

      const isThirdPartyPending =
        deliveryData.pelaksana === 'PIHAK_KETIGA' ||
        deliveryData.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN';

      if (isThirdPartyPending) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            `lezzat-order-${activeOrder.idOrder}`,
            JSON.stringify({
              order: activeOrder,
              delivery: deliveryData,
              payment: null,
            })
          );
        }

        setInfoNotice(
          'Menunggu konfirmasi ongkir dari admin. Anda dapat membayar setelah dikonfirmasi'
        );
        clearCart();
        setTimeout(() => {
          router.push(`/orders/${activeOrder!.idOrder}`);
        }, 1200);
        return;
      }

      const paymentData = await ensurePaymentCreated(
        activeOrder.idOrder,
        values.metodePay
      );

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `lezzat-order-${activeOrder.idOrder}`,
          JSON.stringify({
            order: activeOrder,
            delivery: deliveryData,
            payment: paymentData,
          })
        );
      }

      clearCart();
      router.push(`/orders/${activeOrder.idOrder}`);
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          'Terjadi kendala saat menyelesaikan pengiriman/pembayaran. Klik tombol "Coba Lagi Lanjutkan Proses" di bawah.'
        )
      );
    }
  };

  const isPihakKetiga =
    estimate?.pelaksana === 'PIHAK_KETIGA' ||
    estimate?.perluKonfirmasiAdmin === true;

  const finalOngkirNumber =
    estimate && !isPihakKetiga ? estimate.ongkir : 0;
  const pratinjauTotalKeseluruhan = subtotal + finalOngkirNumber;

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5E5E6A] hover:text-[#4737FF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
            {user?.tipeAkun === 'B2B'
              ? 'FROZNFOOD 2.0 • CHECKOUT GROSIR MITRA (B2B AUTO-TIERING & FEFO)'
              : 'FROZNFOOD 2.0 • CHECKOUT PESANAN ECERAN (B2C)'}
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mt-1">
            Pengiriman & Pembayaran
          </h1>
        </div>

        {items.length === 0 && !pendingOrder && !infoNotice ? (
          <div className="ff-card bg-white p-8 text-center max-w-lg mx-auto my-8">
            <ShoppingBag className="w-12 h-12 text-[#ACA5FF] mx-auto mb-3" />
            <h2 className="font-heading text-xl font-extrabold text-[#171725] mb-1">
              Keranjang Belanja Kosong
            </h2>
            <p className="text-xs text-[#77788A] mb-6">
              Tambahkan produk frozen food pilihanmu terlebih dahulu sebelum
              melakukan checkout.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold shadow-sm shadow-[#F75C03]/25 transition-all"
            >
              <span>Mulai Belanja</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start"
            noValidate
          >
            <div className="xl:col-span-2 space-y-6">
              {/* Kartu Informasi Aturan Pengiriman Rantai Dingin */}
              <div className="rounded-3xl ff-hero-gradient text-white p-6 shadow-md shadow-[#4737FF]/15">
                <div className="flex items-center gap-2 text-[#FFB36B] text-xs font-extrabold uppercase tracking-wider mb-3">
                  <Snowflake className="w-4 h-4" />
                  <span>Ketentuan Pengiriman Rantai Dingin (Cold Chain)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/90 leading-relaxed">
                  <div className="bg-white/10 border border-white/15 backdrop-blur-xs rounded-2xl p-3.5">
                    <p className="font-bold text-white mb-1">
                      Jangkauan & Armada Kurir
                    </p>
                    <p>
                      • Maksimal jarak pengiriman <strong>50 km</strong>.
                      <br />• <strong>≤ 15 km:</strong> Diantar kurir motor toko.
                      <br />• <strong>15–50 km:</strong> Kurir pihak ketiga
                      (ongkir menunggu konfirmasi admin).
                    </p>
                  </div>
                  <div className="bg-white/10 border border-white/15 backdrop-blur-xs rounded-2xl p-3.5">
                    <p className="font-bold text-white mb-1">
                      Tarif Ongkir Online & Jam Operasional
                    </p>
                    <p>
                      • <strong>≤ 5 km:</strong> GRATIS!
                      <br />• <strong>Mulai 6 km:</strong> Rp 10.000 + Rp
                      1.000/km (Maks Rp 35.000), ikut dibayar online.
                      <br />• <strong>Jam 09.00–21.00 WIB:</strong> Pesan
                      sebelum 15.00 WIB dikirim hari ini, lewat 15.00 WIB
                      dikirim besok.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 1: Lokasi & Koordinat Pengiriman */}
              <div className="ff-card bg-white p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E6E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-heading text-sm font-extrabold text-[#171725]">
                        1. Lokasi Tujuan Pengiriman
                      </h2>
                      <p className="text-[11px] text-[#77788A]">
                        Alamat diketik sebagai teks, sedangkan perhitungan jarak
                        sistem mengacu pada titik koordinat
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating || Boolean(pendingOrder)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E7EFFF] hover:bg-[#D1CDFF] disabled:opacity-50 text-[#4737FF] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>
                      {isLocating ? 'Mengambil GPS...' : 'Gunakan Lokasi Saya'}
                    </span>
                  </button>
                </div>

                {/* Tombol Preset Lokasi Contoh */}
                <div className="rounded-2xl bg-[#F8FAFF] p-3.5 border border-[#E6E8F0]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#171725] mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#F75C03]" />
                    <span>
                      Pilih Cepat Titik Koordinat Contoh (Uji Estimasi Backend):
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {DEMO_LOCATIONS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={Boolean(pendingOrder)}
                        onClick={() => handleSelectDemoLocation(preset)}
                        className="p-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:border-[#4737FF] disabled:opacity-50 text-left transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[#171725] leading-snug">
                          {preset.label}
                        </p>
                        <p className="text-[10px] font-mono text-[#77788A] mt-1">
                          {preset.lat}, {preset.lng}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="alamatTujuan"
                    className="block text-xs font-semibold text-[#171725] mb-1.5"
                  >
                    Alamat Lengkap Tujuan (Teks Catatan Kurir)
                  </label>
                  <textarea
                    id="alamatTujuan"
                    rows={2}
                    disabled={Boolean(pendingOrder)}
                    placeholder="Contoh: Jl. Melati No. 12, RT 04/RW 02, Patokan pagar hitam..."
                    {...register('alamatTujuan')}
                    className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none disabled:bg-[#F1F3F8] transition-colors"
                  />
                  {errors.alamatTujuan && (
                    <p className="mt-1 text-xs text-[#E5484D]">
                      {errors.alamatTujuan.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="latitudeTujuan"
                      className="block text-xs font-semibold text-[#171725] mb-1.5"
                    >
                      Latitude Tujuan
                    </label>
                    <input
                      id="latitudeTujuan"
                      type="number"
                      step="any"
                      disabled={Boolean(pendingOrder)}
                      {...register('latitudeTujuan', {
                        onChange: () => setEstimate(null),
                      })}
                      className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none disabled:bg-[#F1F3F8] transition-colors"
                    />
                    {errors.latitudeTujuan && (
                      <p className="mt-1 text-xs text-[#E5484D]">
                        {errors.latitudeTujuan.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="longitudeTujuan"
                      className="block text-xs font-semibold text-[#171725] mb-1.5"
                    >
                      Longitude Tujuan
                    </label>
                    <input
                      id="longitudeTujuan"
                      type="number"
                      step="any"
                      disabled={Boolean(pendingOrder)}
                      {...register('longitudeTujuan', {
                        onChange: () => setEstimate(null),
                      })}
                      className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none disabled:bg-[#F1F3F8] transition-colors"
                    />
                    {errors.longitudeTujuan && (
                      <p className="mt-1 text-xs text-[#E5484D]">
                        {errors.longitudeTujuan.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCalculateEstimate}
                  disabled={isEstimating || Boolean(pendingOrder)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] disabled:opacity-60 text-white text-xs font-bold shadow-sm shadow-[#4737FF]/25 transition-all cursor-pointer"
                >
                  <Calculator className="w-4 h-4" />
                  <span>
                    {isEstimating
                      ? 'Menghitung Estimasi...'
                      : 'Hitung Estimasi Ongkir & Jadwal'}
                  </span>
                </button>

                {estimateError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-2xl border border-[#E5484D]/30 bg-[#E5484D]/10 p-4 text-xs text-[#E5484D]"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{estimateError}</span>
                  </div>
                )}

                {estimate && (
                  <div className="rounded-2xl border border-[#D1CDFF] bg-[#F8FAFF] p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#4737FF]">
                        <CheckCircle2 className="w-4 h-4 text-[#159A68]" />
                        Hasil Keputusan Pintar (Smart Delivery)
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          estimate.pelaksana === 'MOTOR_TOKO'
                            ? 'bg-[#4737FF] text-white'
                            : 'bg-[#F75C03] text-white'
                        }`}
                      >
                        {estimate.pelaksana === 'MOTOR_TOKO'
                          ? 'MOTOR_TOKO (Kurir Toko)'
                          : 'PIHAK_KETIGA (Ekspedisi Mitra)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white rounded-xl p-3 border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px]">
                          Jarak Tempuh
                        </span>
                        <span className="font-bold text-[#171725]">
                          {estimate.jarakKm.toFixed(1)} km (Bulat:{' '}
                          {estimate.jarakDibulatkanKm} km)
                        </span>
                        <span className="block text-[10px] text-[#77788A]">
                          {estimate.sumberJarak}
                        </span>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px]">
                          Biaya Ongkir
                        </span>
                        {isPihakKetiga ? (
                          <>
                            <span className="font-bold text-[#D97706] block">
                              Menunggu konfirmasi admin
                            </span>
                            {estimate.ongkir > 0 && (
                              <span className="block text-[10px] text-[#77788A]">
                                Perkiraan: {formatRupiah(estimate.ongkir)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-extrabold text-[#4737FF]">
                              {estimate.ongkir === 0
                                ? 'GRATIS'
                                : formatRupiah(estimate.ongkir)}
                            </span>
                            <span className="block text-[10px] text-[#77788A]">
                              {estimate.ongkirBersifatEstimasi
                                ? 'Bersifat Estimasi'
                                : 'Dibayar Online'}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="bg-[#E7EFFF] rounded-xl p-3 border border-[#D1CDFF]">
                        <span className="text-[#4737FF] font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                          Estimasi Tiba (WIB)
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-[#171725] block leading-tight">
                          {formatEstimasiTiba(
                            estimate.estimasiTiba,
                            estimate.jadwalHariIni
                          )}
                        </span>
                        <span className="block text-[10px] text-[#4737FF] font-semibold mt-1">
                          ~{estimate.menitPerjalanan} menit perjalanan
                        </span>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-[#E6E8F0]">
                        <span className="text-[#77788A] block text-[10px]">
                          Muatan Fisik
                        </span>
                        <span className="font-bold text-[#171725] flex items-center gap-1">
                          <Scale className="w-3 h-3 text-[#4737FF]" />{' '}
                          {estimate.beratMuatanKg} kg
                        </span>
                        <span className="block text-[10px] text-[#77788A]">
                          Volume: {estimate.volumeMuatanLiter} L
                        </span>
                      </div>
                    </div>

                    {isPihakKetiga && (
                      <div className="flex items-start gap-2 rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 p-3 text-xs text-[#171725]">
                        <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                        <span>
                          Pengiriman ini menggunakan{' '}
                          <strong>PIHAK_KETIGA</strong>. Menunggu konfirmasi
                          ongkir dari admin. Anda dapat membayar setelah
                          dikonfirmasi.
                        </span>
                      </div>
                    )}

                    {estimate.alasan && estimate.alasan.length > 0 && (
                      <div className="text-xs text-[#5E5E6A] space-y-1">
                        <p className="font-bold text-[#171725]">
                          Alasan Keputusan Sistem:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {estimate.alasan.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {estimate.peringatan && estimate.peringatan.length > 0 && (
                      <div className="rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 p-3 text-xs text-[#D97706] space-y-1">
                        <p className="font-bold">Peringatan:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {estimate.peringatan.map((warn, idx) => (
                            <li key={idx}>{warn}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bagian 2: Metode Pembayaran & Catatan */}
              <div className="ff-card bg-white p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#E6E8F0]">
                  <div className="w-9 h-9 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-extrabold text-[#171725]">
                      2. Metode Pembayaran Online & Catatan
                    </h2>
                    <p className="text-[11px] text-[#77788A]">
                      {isPihakKetiga
                        ? 'Untuk pengiriman pihak ketiga, pembayaran dilakukan di halaman detail pesanan setelah ongkir dikonfirmasi admin'
                        : 'Subtotal barang dan ongkir dibayar sekaligus secara online'}
                    </p>
                  </div>
                </div>

                {!isPihakKetiga && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('metodePay', 'QRIS')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        selectedMetodePay === 'QRIS'
                          ? 'border-[#4737FF] bg-[#E7EFFF]/60'
                          : 'border-[#E6E8F0] hover:border-[#ACA5FF] bg-[#F8FAFF]'
                      }`}
                    >
                      <p className="text-xs font-extrabold text-[#171725]">
                        QRIS
                      </p>
                      <p className="text-[11px] text-[#77788A] mt-0.5">
                        Pembayaran digital via kode referensi
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('metodePay', 'TRANSFER')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        selectedMetodePay === 'TRANSFER'
                          ? 'border-[#4737FF] bg-[#E7EFFF]/60'
                          : 'border-[#E6E8F0] hover:border-[#ACA5FF] bg-[#F8FAFF]'
                      }`}
                    >
                      <p className="text-xs font-extrabold text-[#171725]">
                        TRANSFER
                      </p>
                      <p className="text-[11px] text-[#77788A] mt-0.5">
                        Transfer rekening bank
                      </p>
                    </button>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="catatan"
                    className="block text-xs font-semibold text-[#171725] mb-1.5"
                  >
                    Catatan Pesanan (Opsional)
                  </label>
                  <input
                    id="catatan"
                    type="text"
                    disabled={Boolean(pendingOrder)}
                    placeholder="Contoh: Tolong titipkan di satpam jika sedang tidak di rumah"
                    {...register('catatan')}
                    className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none disabled:bg-[#F1F3F8] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Ringkasan Pesanan & Tombol Submit */}
            <div className="ff-card bg-white p-6 xl:sticky xl:top-6 space-y-5">
              <h2 className="font-heading text-lg font-extrabold text-[#171725]">
                Ringkasan Pesanan
              </h2>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {items.map(({ product, qty }) => {
                  const safeQty = Number.isNaN(qty) || qty < 1 ? 1 : qty;
                  const pricing = evaluateCartItemPricing(
                    product,
                    safeQty,
                    user?.tipeAkun
                  );

                  return (
                    <div
                      key={product.idProduk}
                      className="flex flex-col gap-1.5 text-xs pb-3 border-b border-[#E6E8F0]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[#171725]">
                            {product.namaProduk}
                          </p>
                          {pricing.hasDiscount ? (
                            <div className="mt-0.5 space-y-0.5">
                              {pricing.lines.map((line, idx) => (
                                <p key={idx} className="text-[11px] text-[#5E5E6A]">
                                  {line.qty} x{' '}
                                  {line.isDiscounted && (
                                    <span className="line-through text-[#77788A] mr-1">
                                      {formatRupiah(pricing.originalUnitPrice)}
                                    </span>
                                  )}
                                  <strong
                                    className={
                                      line.isDiscounted
                                        ? 'text-[#F75C03]'
                                        : 'text-[#171725]'
                                    }
                                  >
                                    {formatRupiah(line.unitPrice)}
                                  </strong>{' '}
                                  {line.isDiscounted && (
                                    <span className="inline-block ml-1 px-1.5 py-0.5 rounded bg-[#F75C03]/15 text-[#D93800] text-[9px] font-extrabold">
                                      {line.label}
                                    </span>
                                  )}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[#77788A]">
                              {safeQty} x {formatRupiah(product.hargaEceran)}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {pricing.hasDiscount && (
                            <span className="block text-[10px] text-[#77788A] line-through">
                              {formatRupiah(pricing.originalSubtotal)}
                            </span>
                          )}
                          <span
                            className={`font-extrabold ${
                              pricing.hasDiscount
                                ? 'text-[#F75C03]'
                                : 'text-[#171725]'
                            }`}
                          >
                            {formatRupiah(pricing.finalSubtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 text-xs pt-2">
                {totalSaved > 0 && (
                  <>
                    <div className="flex justify-between text-[#77788A]">
                      <span>Total Harga Normal</span>
                      <span className="line-through">
                        {formatRupiah(originalSubtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#159A68] font-bold">
                      <span>Total Hemat (Diskon / Tiering)</span>
                      <span>- {formatRupiah(totalSaved)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-[#77788A]">
                  <span>Subtotal Barang</span>
                  <span className="font-semibold text-[#171725]">
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-[#77788A]">
                  <span>Ongkir</span>
                  <span className="font-bold text-[#159A68] text-right">
                    {!estimate
                      ? 'Hitung estimasi dulu'
                      : isPihakKetiga
                        ? 'Menunggu konfirmasi admin'
                        : estimate.ongkir === 0
                          ? 'GRATIS'
                          : formatRupiah(estimate.ongkir)}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-extrabold text-[#171725] pt-3 border-t border-[#E6E8F0]">
                  <span>Total Keseluruhan</span>
                  <span className="text-right text-[#4737FF]">
                    {!estimate
                      ? formatRupiah(subtotal)
                      : isPihakKetiga
                        ? 'Menunggu konfirmasi admin'
                        : formatRupiah(pratinjauTotalKeseluruhan)}
                  </span>
                </div>
              </div>

              {pendingOrder && !infoNotice && (
                <div className="rounded-2xl bg-[#D97706]/10 border border-[#D97706]/30 p-3.5 text-xs text-[#171725]">
                  Pesanan <strong>#{pendingOrder.idOrder.slice(0, 8)}...</strong>{' '}
                  sudah tercatat. Klik tombol di bawah untuk melanjutkan
                  pembuatan pengiriman & pembayaran tanpa memotong stok ulang.
                </div>
              )}

              {infoNotice && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-2xl border border-[#159A68]/30 bg-[#159A68]/10 p-3.5 text-xs font-bold text-[#159A68]"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoNotice}</span>
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-[#E5484D]/30 bg-[#E5484D]/10 p-3.5 text-xs text-[#E5484D]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !estimate ||
                  Boolean(estimateError) ||
                  Boolean(infoNotice)
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#F75C03] hover:bg-[#D94800] disabled:bg-[#F1F3F8] disabled:text-[#77788A] text-white font-extrabold py-3.5 px-5 text-xs shadow-md shadow-[#F75C03]/25 transition-all cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
              >
                {pendingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Melanjutkan Proses...'
                        : 'Coba Lagi Lanjutkan Proses'}
                    </span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Memproses Pesanan...'
                        : isPihakKetiga
                          ? 'Buat Pesanan (Menunggu Konfirmasi Ongkir)'
                          : 'Buat Pesanan & Bayar'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}