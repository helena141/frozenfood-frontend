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

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { items, getSubtotal, clearCart } = useCartStore();

  const [estimate, setEstimate] = useState<DeliveryEstimateResponse | null>(
    null
  );
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [pendingOrder, setPendingOrder] = useState<OrderResponse | null>(null);

  const subtotal = getSubtotal();

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

  // Langkah 1: Pratinjau Estimasi Pengiriman (POST /api/deliveries/estimate)
  const handleCalculateEstimate = async () => {
    setEstimateError(null);
    setSubmitError(null);
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

  // Langsung POST /api/deliveries; jika 409 (sudah ada saat retry), ambil via GET
  const ensureDeliveryCreated = async (
    idOrder: string,
    values: CheckoutFormValues
  ): Promise<DeliveryResponse> => {
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

  // Langsung POST /api/payments; jika 409 (sudah ada saat retry), ambil via GET
  const ensurePaymentCreated = async (
    idOrder: string,
    metodePay: string
  ): Promise<PaymentResponse> => {
    try {
      const created = await api.post<PaymentResponse>('/api/payments', {
        idOrder,
        metodePay,
      });
      return created.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const existing = await api.get<PaymentResponse>(
          `/api/payments/order/${idOrder}`
        );
        return existing.data;
      }
      throw err;
    }
  };

  // Langkah 2: Eksekusi Checkout dengan Perlindungan Anti-Pesanan Yatim
  const onSubmit = async (values: CheckoutFormValues) => {
    setSubmitError(null);

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
        const orderRes = await api.post<OrderResponse>('/api/orders/retail', {
          idUser: user.idUser,
          items: items.map((i) => ({
            idProduk: i.product.idProduk,
            quantity: Number.isNaN(i.qty) || i.qty < 1 ? 1 : i.qty,
          })),
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
  const totalAkhirBarangDanOngkir = subtotal + finalOngkirNumber;

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#174634]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
            CHECKOUT PESANAN ECERAN
          </p>
          <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
            Pengiriman & Pembayaran
          </h1>
        </div>

        {items.length === 0 && !pendingOrder ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-8">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h2 className="font-serif-title text-xl font-bold text-slate-900 mb-1">
              Keranjang Belanja Kosong
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Tambahkan produk frozen food pilihanmu terlebih dahulu sebelum
              melakukan checkout.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#174634] text-white text-xs font-semibold hover:bg-[#113527]"
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
              <div className="rounded-3xl bg-[#174634] text-white p-6">
                <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-3">
                  <Snowflake className="w-4 h-4" />
                  <span>Ketentuan Pengiriman Rantai Dingin (Cold Chain)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-emerald-50/90 leading-relaxed">
                  <div className="bg-white/10 rounded-2xl p-3.5">
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
                  <div className="bg-white/10 rounded-2xl p-3.5">
                    <p className="font-bold text-white mb-1">
                      Tarif Ongkir & Jam Operasional
                    </p>
                    <p>
                      • <strong>≤ 5 km:</strong> Gratis Ongkir!
                      <br />• <strong>Mulai 6 km:</strong> Rp 10.000 + Rp
                      1.000/km (Maks Rp 35.000).
                      <br />• <strong>Jam 09.00–21.00 WIB:</strong> Pesan
                      sebelum 15.00 WIB dikirim hari ini, lewat 15.00 WIB
                      dikirim besok.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 1: Lokasi & Koordinat Pengiriman */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        1. Lokasi Tujuan Pengiriman
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Alamat diketik sebagai teks, sedangkan perhitungan jarak
                        sistem mengacu pada titik koordinat
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating || Boolean(pendingOrder)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f2efe9] hover:bg-slate-200/70 disabled:opacity-50 text-[#174634] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>
                      {isLocating ? 'Mengambil GPS...' : 'Gunakan Lokasi Saya'}
                    </span>
                  </button>
                </div>

                {/* Tombol Preset Lokasi Contoh */}
                <div className="rounded-2xl bg-[#f7f6f2] p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#174634]" />
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
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#174634] disabled:opacity-50 text-left transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {preset.label}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                          {preset.lat}, {preset.lng}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="alamatTujuan"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Alamat Lengkap Tujuan (Teks Catatan Kurir)
                  </label>
                  <textarea
                    id="alamatTujuan"
                    rows={2}
                    disabled={Boolean(pendingOrder)}
                    placeholder="Contoh: Jl. Melati No. 12, RT 04/RW 02, Patokan pagar hitam..."
                    {...register('alamatTujuan')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none disabled:bg-slate-100"
                  />
                  {errors.alamatTujuan && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.alamatTujuan.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="latitudeTujuan"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
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
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none disabled:bg-slate-100"
                    />
                    {errors.latitudeTujuan && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.latitudeTujuan.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="longitudeTujuan"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
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
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none disabled:bg-slate-100"
                    />
                    {errors.longitudeTujuan && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.longitudeTujuan.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCalculateEstimate}
                  disabled={isEstimating || Boolean(pendingOrder)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
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
                    className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{estimateError}</span>
                  </div>
                )}

                {estimate && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#174634]">
                        <CheckCircle2 className="w-4 h-4" />
                        Hasil Keputusan Pintar (Smart Delivery)
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-[#174634] text-white text-[10px] font-bold uppercase">
                        {estimate.pelaksana === 'MOTOR_TOKO'
                          ? 'MOTOR_TOKO (Kurir Toko)'
                          : 'PIHAK_KETIGA (Ekspedisi Mitra)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white rounded-xl p-3 border border-emerald-100">
                        <span className="text-slate-400 block text-[10px]">
                          Jarak Tempuh
                        </span>
                        <span className="font-bold text-slate-900">
                          {estimate.jarakKm.toFixed(1)} km (Bulat:{' '}
                          {estimate.jarakDibulatkanKm} km)
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {estimate.sumberJarak}
                        </span>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-emerald-100">
                        <span className="text-slate-400 block text-[10px]">
                          Biaya Ongkir
                        </span>
                        {isPihakKetiga ? (
                          <>
                            <span className="font-bold text-amber-700 block">
                              Menunggu konfirmasi admin
                            </span>
                            {estimate.ongkir > 0 && (
                              <span className="block text-[10px] text-slate-400">
                                Perkiraan: {formatRupiah(estimate.ongkir)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-[#174634]">
                              {formatRupiah(estimate.ongkir)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {estimate.ongkirBersifatEstimasi
                                ? 'Bersifat Estimasi'
                                : 'Tarif Tetap'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Kartu Estimasi Tiba (WIB) yang sudah diperbarui */}
                      <div className="bg-emerald-50/90 rounded-xl p-3 border border-emerald-300 shadow-2xs">
                        <span className="text-emerald-800/80 font-medium block text-[10px] uppercase tracking-wider mb-0.5">
                          Estimasi Tiba (WIB)
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-[#174634] block leading-tight">
                          {formatEstimasiTiba(
                            estimate.estimasiTiba,
                            estimate.jadwalHariIni
                          )}
                        </span>
                        <span className="block text-[10px] text-emerald-700 font-medium mt-1">
                          ~{estimate.menitPerjalanan} menit perjalanan
                        </span>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-emerald-100">
                        <span className="text-slate-400 block text-[10px]">
                          Muatan Fisik
                        </span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Scale className="w-3 h-3" />{' '}
                          {estimate.beratMuatanKg} kg
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          Volume: {estimate.volumeMuatanLiter} L
                        </span>
                      </div>
                    </div>

                    {isPihakKetiga && (
                      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Pengiriman ini menggunakan{' '}
                          <strong>PIHAK_KETIGA</strong>. Ongkir belum final dan{' '}
                          <strong>menunggu konfirmasi admin</strong>.
                        </span>
                      </div>
                    )}

                    {estimate.alasan && estimate.alasan.length > 0 && (
                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-800">
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
                      <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                        <p className="font-semibold">Peringatan:</p>
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
              <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      2. Metode Pembayaran & Catatan
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Pilih metode pembayaran simulasi yang tersedia
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setValue('metodePay', 'QRIS')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedMetodePay === 'QRIS'
                        ? 'border-[#174634] bg-[#174634]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">QRIS</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pembayaran digital via kode referensi
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue('metodePay', 'TRANSFER')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedMetodePay === 'TRANSFER'
                        ? 'border-[#174634] bg-[#174634]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">TRANSFER</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Transfer rekening bank
                    </p>
                  </button>

                  <div
                    aria-disabled="true"
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-500">
                        Tunai (COD)
                      </p>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold uppercase">
                        Segera hadir
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bayar tunai ke pengantar belum tersedia
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="catatan"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Catatan Pesanan (Opsional)
                  </label>
                  <input
                    id="catatan"
                    type="text"
                    disabled={Boolean(pendingOrder)}
                    placeholder="Contoh: Tolong titipkan di satpam jika sedang tidak di rumah"
                    {...register('catatan')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Ringkasan Pesanan & Tombol Submit */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 xl:sticky xl:top-6 space-y-5">
              <h2 className="font-serif-title text-xl font-bold text-slate-900">
                Ringkasan Pesanan
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map(({ product, qty }) => {
                  const safeQty = Number.isNaN(qty) || qty < 1 ? 1 : qty;
                  return (
                    <div
                      key={product.idProduk}
                      className="flex items-start justify-between gap-2 text-xs pb-3 border-b border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {product.namaProduk}
                        </p>
                        <p className="text-slate-400">
                          {safeQty} x {formatRupiah(product.hargaEceran)}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {formatRupiah(product.hargaEceran * safeQty)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal Barang</span>
                  <span className="font-medium text-slate-800">
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Ongkos Kirim</span>
                  <span className="font-medium text-[#174634] text-right">
                    {!estimate
                      ? 'Hitung estimasi dulu'
                      : isPihakKetiga
                        ? 'Menunggu konfirmasi admin'
                        : formatRupiah(estimate.ongkir)}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-bold text-slate-900 pt-3 border-t border-slate-200">
                  <span>Total Tagihan Akhir</span>
                  <span className="text-right">
                    {!estimate
                      ? formatRupiah(subtotal)
                      : isPihakKetiga
                        ? `${formatRupiah(subtotal)} + Ongkir Admin`
                        : formatRupiah(totalAkhirBarangDanOngkir)}
                  </span>
                </div>
              </div>

              {pendingOrder && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800">
                  Pesanan <strong>#{pendingOrder.idOrder.slice(0, 8)}...</strong>{' '}
                  sudah tercatat. Klik tombol di bawah untuk melanjutkan
                  pembuatan pengiriman & pembayaran tanpa memotong stok ulang.
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !estimate || Boolean(estimateError)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#174634] hover:bg-[#113527] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3.5 px-5 text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
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