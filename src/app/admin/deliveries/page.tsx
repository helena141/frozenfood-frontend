'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  User,
  Clock,
  Info,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/axios';
import {
  formatRupiah,
  formatEstimasiTiba,
  getErrorMessage,
} from '@/lib/utils';
import { DeliveryListResponse, DeliveryResponse } from '@/types/api';
import AdminSidebar from '@/components/admin/admin-sidebar';

const STATUS_TABS = [
  { key: '', label: 'Semua Status' },
  {
    key: 'MENUNGGU_KONFIRMASI_ADMIN',
    label: 'Perlu konfirmasi',
  },
  { key: 'MENUNGGU_PICKUP', label: 'Menunggu Pickup' },
  { key: 'DISIAPKAN', label: 'Disiapkan' },
  { key: 'DALAM_PERJALANAN', label: 'Dalam Perjalanan' },
  { key: 'TERKIRIM', label: 'Terkirim' },
  { key: 'GAGAL_KIRIM', label: 'Gagal Kirim' },
  { key: 'DIBATALKAN', label: 'Dibatalkan' },
];

// Aturan transisi status yang diizinkan lewat PATCH /api/deliveries/{id}/status
function getAllowedNextStatuses(currentStatus: string): string[] {
  switch (currentStatus) {
    case 'MENUNGGU_KONFIRMASI_ADMIN':
      // MENUNGGU_PICKUP wajib lewat endpoint /konfirmasi-admin, bukan /status
      return ['DIBATALKAN'];
    case 'MENUNGGU_PICKUP':
      return ['DISIAPKAN', 'DIBATALKAN'];
    case 'DISIAPKAN':
      return ['DALAM_PERJALANAN', 'DIBATALKAN'];
    case 'DALAM_PERJALANAN':
      return ['TERKIRIM', 'GAGAL_KIRIM'];
    case 'GAGAL_KIRIM':
      return ['DALAM_PERJALANAN', 'DIBATALKAN'];
    case 'TERKIRIM':
    case 'DIBATALKAN':
    default:
      return [];
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'MENUNGGU_KONFIRMASI_ADMIN':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'MENUNGGU_PICKUP':
      return 'bg-sky-100 text-sky-900 border-sky-200';
    case 'DISIAPKAN':
      return 'bg-indigo-100 text-indigo-900 border-indigo-200';
    case 'DALAM_PERJALANAN':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case 'TERKIRIM':
      return 'bg-[#174634] text-white border-[#174634]';
    case 'GAGAL_KIRIM':
    case 'DIBATALKAN':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Mengecek apakah estimasiTiba sudah lewat dari jam dinding WIB sekarang
 * tanpa melakukan konversi zona waktu.
 */
function isEstimateOverdue(
  rawEstimasi: string | null | undefined,
  statusDelivery: string,
  nowWallClockIso: string,
  todayYmd: string
): boolean {
  if (!rawEstimasi || !nowWallClockIso) return false;

  // Baris yang sudah selesai / gagal / batal tidak diberi badge Terlambat
  if (
    statusDelivery === 'TERKIRIM' ||
    statusDelivery === 'DIBATALKAN' ||
    statusDelivery === 'GAGAL_KIRIM'
  ) {
    return false;
  }

  const trimmed = rawEstimasi.trim();

  // Format YYYY-MM-DDTHH:mm...
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
  );
  if (isoMatch) {
    const [, yyyy, mm, dd, hh, min] = isoMatch;
    const estimateKey = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    return estimateKey < nowWallClockIso;
  }

  // Format jam saja HH:mm... (dibandingkan terhadap hari ini)
  const timeMatch = trimmed.match(/^(\d{2}):(\d{2})/);
  if (timeMatch && todayYmd) {
    const [, hh, min] = timeMatch;
    const estimateKey = `${todayYmd}T${hh}:${min}`;
    return estimateKey < nowWallClockIso;
  }

  return false;
}

export default function AdminDeliveriesPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(10);
  const [todayYmd, setTodayYmd] = useState<string>('');
  const [nowWallClockIso, setNowWallClockIso] = useState<string>('');

  // State pesan feedback aksi
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null);

  // State Form Konfirmasi Admin (ongkir + namaPengantar)
  const [confirmTarget, setConfirmTarget] = useState<DeliveryResponse | null>(
    null
  );
  const [confirmOngkir, setConfirmOngkir] = useState<string>('');
  const [confirmPengantar, setConfirmPengantar] = useState<string>('');

  // State Form Ubah Pengantar
  const [pengantarTarget, setPengantarTarget] =
    useState<DeliveryResponse | null>(null);
  const [pengantarNama, setPengantarNama] = useState<string>('');

  // State Dialog Konfirmasi Pembatalan Pengiriman
  const [cancelTarget, setCancelTarget] = useState<DeliveryResponse | null>(
    null
  );

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      setTodayYmd(`${yyyy}-${mm}-${dd}`);
      setNowWallClockIso(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    };

    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: deliveryPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DeliveryListResponse>({
    queryKey: ['admin-deliveries', selectedStatus, page, size],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, size };
      if (selectedStatus) {
        params.status = selectedStatus;
        params.statusDelivery = selectedStatus;
      }
      const res = await api.get<DeliveryListResponse | DeliveryResponse[]>(
        '/api/deliveries',
        { params }
      );
      const raw = res.data;
      if (Array.isArray(raw)) {
        const filtered = selectedStatus
          ? raw.filter((d) => d.statusDelivery === selectedStatus)
          : raw;
        const start = page * size;
        return {
          content: filtered.slice(start, start + size),
          page,
          size,
          totalElements: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / size)),
        };
      }
      return raw;
    },
  });

  const deliveries = deliveryPage?.content || [];
  const totalPages = deliveryPage?.totalPages || 0;
  const totalElements = deliveryPage?.totalElements || 0;

  // 1. Aksi PATCH /api/deliveries/{id}/status?statusDelivery=...
  const executeUpdateStatus = async (
    delivery: DeliveryResponse,
    nextStatus: string
  ) => {
    setActionError(null);
    setActionSuccess(null);
    setBusyDeliveryId(delivery.idDelivery);

    try {
      await api.patch(`/api/deliveries/${delivery.idDelivery}/status`, null, {
        params: { statusDelivery: nextStatus },
      });
      setActionSuccess(
        `Status pengiriman #${delivery.idOrder.slice(0, 8)} berhasil diubah menjadi ${nextStatus}.`
      );
      setCancelTarget(null);
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal mengubah status pengiriman.')
      );
    } finally {
      setBusyDeliveryId(null);
    }
  };

  const handleStatusButtonClick = (
    delivery: DeliveryResponse,
    nextStatus: string
  ) => {
    if (nextStatus === 'DIBATALKAN') {
      setActionError(null);
      setActionSuccess(null);
      setCancelTarget(delivery);
      return;
    }
    executeUpdateStatus(delivery, nextStatus);
  };

  // 2. Buka & Submit Form PATCH /api/deliveries/{id}/konfirmasi-admin
  const openConfirmModal = (delivery: DeliveryResponse) => {
    setActionError(null);
    setActionSuccess(null);
    setConfirmTarget(delivery);
    setConfirmOngkir(String(delivery.ongkir ?? 0));
    setConfirmPengantar(delivery.namaPengantar || '');
  };

  const handleSubmitConfirmAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTarget) return;

    if (confirmOngkir.trim() === '') {
      setActionError('Ongkir wajib diisi dan tidak boleh kosong.');
      return;
    }

    const parsedOngkir = Number(confirmOngkir);
    if (Number.isNaN(parsedOngkir) || parsedOngkir < 0) {
      setActionError(
        'Ongkir tidak boleh bernilai negatif (minimal Rp 0).'
      );
      return;
    }

    if (!confirmPengantar.trim()) {
      setActionError('Nama pengantar wajib diisi untuk konfirmasi admin.');
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setBusyDeliveryId(confirmTarget.idDelivery);

    try {
      await api.patch(
        `/api/deliveries/${confirmTarget.idDelivery}/konfirmasi-admin`,
        {
          ongkir: parsedOngkir,
          namaPengantar: confirmPengantar.trim(),
        }
      );
      setActionSuccess(
        `Pengiriman #${confirmTarget.idOrder.slice(0, 8)} berhasil dikonfirmasi dengan ongkir ${formatRupiah(parsedOngkir)} & pengantar ${confirmPengantar.trim()}.`
      );
      setConfirmTarget(null);
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal melakukan konfirmasi admin.')
      );
    } finally {
      setBusyDeliveryId(null);
    }
  };

  // 3. Buka & Submit Form PATCH /api/deliveries/{id}/pengantar
  const openPengantarModal = (delivery: DeliveryResponse) => {
    setActionError(null);
    setActionSuccess(null);
    setPengantarTarget(delivery);
    setPengantarNama(delivery.namaPengantar || '');
  };

  const handleSubmitPengantar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pengantarTarget) return;

    if (!pengantarNama.trim()) {
      setActionError('Nama pengantar tidak boleh kosong.');
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setBusyDeliveryId(pengantarTarget.idDelivery);

    try {
      await api.patch(
        `/api/deliveries/${pengantarTarget.idDelivery}/pengantar`,
        {
          namaPengantar: pengantarNama.trim(),
        }
      );
      setActionSuccess(
        `Nama pengantar untuk order #${pengantarTarget.idOrder.slice(0, 8)} berhasil diperbarui menjadi ${pengantarNama.trim()}.`
      );
      setPengantarTarget(null);
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal memperbarui nama pengantar.')
      );
    } finally {
      setBusyDeliveryId(null);
    }
  };

  return (
    <div className="lezzat-shell">
      <AdminSidebar />

      <main className="lezzat-main">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              MANAJEMEN LOGISTIK & KURIR RANTAI DINGIN
            </p>
            <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
              Kelola Pengiriman
            </h1>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Tabel</span>
          </button>
        </div>

        {/* Catatan Batasan Peran */}
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-[#f2efe9] border border-slate-200/80 p-3.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-[#174634] shrink-0 mt-0.5" />
          <span>
            <strong>Catatan Sistem:</strong> Pembatasan peran menunggu backend.
            Pengiriman berstatus <code>MENUNGGU_KONFIRMASI_ADMIN</code> wajib
            dikonfirmasi ongkir dan nama pengantarnya terlebih dahulu sebelum
            masuk ke tahap pickup.
          </span>
        </div>

        {/* Tab Filter Status */}
        <section className="bg-white rounded-3xl p-4 border border-slate-200 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key || 'ALL'}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(tab.key);
                    setPage(0);
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#174634] text-white shadow-2xs'
                      : 'bg-[#f7f6f2] text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Pesan Error / Sukses dari Backend */}
        {actionError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-red-500 hover:text-red-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-[#174634]"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form Konfirmasi Admin (Tampil saat admin memilih baris MENUNGGU_KONFIRMASI_ADMIN) */}
        {confirmTarget && (
          <section className="mb-6 bg-amber-50/90 rounded-3xl p-6 border border-amber-300 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Konfirmasi Pengiriman Pihak Ketiga (Order #
                  {confirmTarget.idOrder.slice(0, 8)}...)
                </h2>
                <p className="text-xs text-slate-600">
                  Alamat: {confirmTarget.alamatTujuan} ({confirmTarget.jarak}{' '}
                  km)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitConfirmAdmin}
              noValidate
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Ongkir Final (Rp, minimal 0)
                </label>
                <input
                  type="number"
                  step="any"
                  value={confirmOngkir}
                  onChange={(e) => setConfirmOngkir(e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Pengantar / Ekspedisi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lalamove - Budi (AB 1234 XY)"
                  value={confirmPengantar}
                  onChange={(e) => setConfirmPengantar(e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busyDeliveryId === confirmTarget.idDelivery}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {busyDeliveryId === confirmTarget.idDelivery
                    ? 'Menyimpan...'
                    : 'Simpan & Konfirmasi'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Form Ubah Nama Pengantar */}
        {pengantarTarget && (
          <section className="mb-6 bg-white rounded-3xl p-6 border border-[#174634] shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Atur / Ubah Nama Pengantar (Order #
                  {pengantarTarget.idOrder.slice(0, 8)}...)
                </h2>
                <p className="text-xs text-slate-500">
                  Status saat ini: {pengantarTarget.statusDelivery}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPengantarTarget(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitPengantar}
              noValidate
              className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Pengantar / Kurir Toko
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama kurir pengantar..."
                  value={pengantarNama}
                  onChange={(e) => setPengantarNama(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busyDeliveryId === pengantarTarget.idDelivery}
                  className="px-5 py-2.5 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {busyDeliveryId === pengantarTarget.idDelivery
                    ? 'Menyimpan...'
                    : 'Simpan Pengantar'}
                </button>
                <button
                  type="button"
                  onClick={() => setPengantarTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Tabel Daftar Pengiriman */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Pengiriman Pesanan
                </h2>
                <p className="text-xs text-slate-500">
                  Menampilkan {deliveries.length} dari total {totalElements}{' '}
                  pengiriman
                </p>
              </div>
            </div>
          </div>

          {/* 1. LOADING */}
          {isLoading && (
            <div className="space-y-3 animate-pulse py-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-14 rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          {/* 2. ERROR */}
          {!isLoading && isError && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center my-4">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900 mb-1">
                Gagal Memuat Daftar Pengiriman
              </p>
              <p className="text-xs text-slate-600 mb-4">
                {getErrorMessage(error, 'Tidak dapat mengambil data pengiriman.')}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-[#174634] text-white text-xs font-semibold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* 3. KOSONG */}
          {!isLoading && !isError && deliveries.length === 0 && (
            <div className="rounded-2xl bg-[#f7f6f2] p-10 text-center my-2">
              <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 mb-1">
                Tidak ada data pengiriman
              </p>
              <p className="text-xs text-slate-500">
                {selectedStatus
                  ? `Belum ada pengiriman dengan status ${selectedStatus}.`
                  : 'Belum ada pengiriman yang tercatat di sistem.'}
              </p>
            </div>
          )}

          {/* 4. TABEL DATA */}
          {!isLoading && !isError && deliveries.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="py-3 px-3 font-semibold">Order</th>
                      <th className="py-3 px-3 font-semibold">Alamat</th>
                      <th className="py-3 px-3 font-semibold">Jarak</th>
                      <th className="py-3 px-3 font-semibold">Pelaksana</th>
                      <th className="py-3 px-3 font-semibold">Ongkir</th>
                      <th className="py-3 px-3 font-semibold">Pengantar</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold">Estimasi Tiba</th>
                      <th className="py-3 px-3 font-semibold text-right">
                        Aksi Status & Kurir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 align-top">
                    {deliveries.map((d) => {
                      const isBusy = busyDeliveryId === d.idDelivery;
                      const isTerminal =
                        d.statusDelivery === 'TERKIRIM' ||
                        d.statusDelivery === 'DIBATALKAN';
                      const isWaitingConfirm =
                        d.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN';
                      const allowedNext = getAllowedNextStatuses(
                        d.statusDelivery
                      );

                      const overdue = isEstimateOverdue(
                        d.estimasiTiba,
                        d.statusDelivery,
                        nowWallClockIso,
                        todayYmd
                      );

                      const emptyPengantarText =
                        d.pelaksana === 'MOTOR_TOKO'
                          ? 'Karyawan toko'
                          : 'Belum ditentukan';

                      return (
                        <tr
                          key={d.idDelivery}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Kolom 1: Order */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <Link
                              href={`/orders/${d.idOrder}`}
                              className="inline-flex items-center gap-1 font-mono font-bold text-[#174634] hover:underline"
                              title={d.idOrder}
                            >
                              <span>#{d.idOrder.slice(0, 8)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {d.metodeDeliv}
                            </span>
                          </td>

                          {/* Kolom 2: Alamat */}
                          <td className="py-3.5 px-3 max-w-[200px]">
                            <p className="text-slate-800 font-medium line-clamp-2">
                              {d.alamatTujuan}
                            </p>
                          </td>

                          {/* Kolom 3: Jarak */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900">
                              {d.jarak} km
                            </span>
                            {d.sumberJarak && (
                              <span className="block text-[10px] text-slate-400">
                                {d.sumberJarak}
                              </span>
                            )}
                          </td>

                          {/* Kolom 4: Pelaksana */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#f2efe9] text-slate-800 font-semibold text-[11px]">
                              {d.pelaksana}
                            </span>
                          </td>

                          {/* Kolom 5: Ongkir */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {isWaitingConfirm &&
                            d.pelaksana === 'PIHAK_KETIGA' ? (
                              <span className="text-amber-700 font-bold block">
                                Menunggu konfirmasi
                              </span>
                            ) : (
                              <span className="font-bold text-[#174634]">
                                {formatRupiah(d.ongkir)}
                              </span>
                            )}
                          </td>

                          {/* Kolom 6: Pengantar */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                {d.namaPengantar?.trim()
                                  ? d.namaPengantar
                                  : emptyPengantarText}
                              </span>
                            </span>
                            {!isTerminal && !isWaitingConfirm && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => openPengantarModal(d)}
                                className="text-[11px] font-semibold text-[#174634] hover:underline mt-1 cursor-pointer"
                              >
                                Ubah pengantar
                              </button>
                            )}
                          </td>

                          {/* Kolom 7: Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(
                                d.statusDelivery
                              )}`}
                            >
                              {d.statusDelivery}
                            </span>
                          </td>

                          {/* Kolom 8: Estimasi Tiba + Badge Terlambat */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {d.estimasiTiba ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-[#174634] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>
                                    {formatEstimasiTiba(
                                      d.estimasiTiba,
                                      d.metodeDeliv === 'SAMEDAY'
                                        ? true
                                        : undefined,
                                      todayYmd
                                    )}
                                  </span>
                                </span>
                                {overdue && (
                                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                                    Terlambat
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Kolom 9: Aksi sesuai transisi status yang valid */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            {isTerminal ? (
                              <span className="text-[11px] text-slate-400 italic">
                                Status akhir
                              </span>
                            ) : (
                              <div className="inline-flex flex-wrap justify-end gap-1.5">
                                {isWaitingConfirm && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => openConfirmModal(d)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    Konfirmasi Admin
                                  </button>
                                )}

                                {allowedNext.map((nextSt) => {
                                  const isCancelOrFail =
                                    nextSt === 'DIBATALKAN' ||
                                    nextSt === 'GAGAL_KIRIM';
                                  return (
                                    <button
                                      key={nextSt}
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        handleStatusButtonClick(d, nextSt)
                                      }
                                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                        isCancelOrFail
                                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                          : 'bg-[#174634] hover:bg-[#113527] text-white'
                                      }`}
                                    >
                                      {nextSt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginasi */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    Halaman <strong>{page + 1}</strong> dari{' '}
                    <strong>{totalPages}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Sebelumnya</span>
                    </button>
                    <button
                      type="button"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold cursor-pointer"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Dialog Konfirmasi Pembatalan Pengiriman */}
        {cancelTarget && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Yakin membatalkan pengiriman ini? Tindakan ini tidak dapat
                    diurungkan.
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Order #{cancelTarget.idOrder.slice(0, 8)} •{' '}
                    {cancelTarget.alamatTujuan}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                Stok dan status pesanan tidak otomatis dikembalikan.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={busyDeliveryId === cancelTarget.idDelivery}
                  onClick={() => setCancelTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={busyDeliveryId === cancelTarget.idDelivery}
                  onClick={() => executeUpdateStatus(cancelTarget, 'DIBATALKAN')}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {busyDeliveryId === cancelTarget.idDelivery
                    ? 'Membatalkan...'
                    : 'Ya, batalkan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}