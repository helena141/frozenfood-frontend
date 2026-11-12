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

function getAllowedNextStatuses(currentStatus: string): string[] {
  switch (currentStatus) {
    case 'MENUNGGU_KONFIRMASI_ADMIN':
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
      return 'bg-[#D97706]/15 text-[#D97706] border-[#D97706]/30';
    case 'MENUNGGU_PICKUP':
      return 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/30';
    case 'DISIAPKAN':
      return 'bg-[#4737FF]/15 text-[#4737FF] border-[#4737FF]/30';
    case 'DALAM_PERJALANAN':
      return 'bg-[#F75C03]/15 text-[#F75C03] border-[#F75C03]/30';
    case 'TERKIRIM':
      return 'bg-[#159A68] text-white border-[#159A68]';
    case 'GAGAL_KIRIM':
    case 'DIBATALKAN':
      return 'bg-[#E5484D]/15 text-[#E5484D] border-[#E5484D]/30';
    default:
      return 'bg-[#F1F3F8] text-[#5E5E6A] border-[#E6E8F0]';
  }
}

function isEstimateOverdue(
  rawEstimasi: string | null | undefined,
  statusDelivery: string,
  nowWallClockIso: string,
  todayYmd: string
): boolean {
  if (!rawEstimasi || !nowWallClockIso) return false;

  if (
    statusDelivery === 'TERKIRIM' ||
    statusDelivery === 'DIBATALKAN' ||
    statusDelivery === 'GAGAL_KIRIM'
  ) {
    return false;
  }

  const trimmed = rawEstimasi.trim();

  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
  );
  if (isoMatch) {
    const [, yyyy, mm, dd, hh, min] = isoMatch;
    const estimateKey = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    return estimateKey < nowWallClockIso;
  }

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

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<DeliveryResponse | null>(
    null
  );
  const [confirmOngkir, setConfirmOngkir] = useState<string>('');
  const [confirmPengantar, setConfirmPengantar] = useState<string>('');

  const [pengantarTarget, setPengantarTarget] =
    useState<DeliveryResponse | null>(null);
  const [pengantarNama, setPengantarNama] = useState<string>('');

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
        {/* Header SaaS Froznfood 2.0 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
              FROZNFOOD 2.0 • COLD-CHAIN LOGISTICS
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mt-1">
              Manajemen Pengiriman
            </h1>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4737FF]" />
            <span>Muat Ulang Tabel</span>
          </button>
        </div>

        {/* Catatan Sistem */}
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-[#E7EFFF] border border-[#D1CDFF] p-3.5 text-xs text-[#171725]">
          <Info className="w-4 h-4 text-[#4737FF] shrink-0 mt-0.5" />
          <span>
            <strong>Catatan Sistem:</strong> Pengiriman berstatus{' '}
            <code className="font-mono text-[#4737FF]">
              MENUNGGU_KONFIRMASI_ADMIN
            </code>{' '}
            wajib dikonfirmasi ongkir dan nama pengantarnya terlebih dahulu
            sebelum masuk ke tahap pickup.
          </span>
        </div>

        {/* Tab Filter Status */}
        <section className="ff-card p-4 bg-white mb-6">
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4737FF] text-white shadow-sm shadow-[#4737FF]/25'
                      : 'bg-[#F8FAFF] border border-[#E6E8F0] text-[#5E5E6A] hover:border-[#4737FF] hover:text-[#171725]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Pesan Error / Sukses */}
        {actionError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-[#E5484D]/30 bg-[#E5484D]/10 p-4 text-xs text-[#E5484D]"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-[#E5484D] hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-[#159A68]/30 bg-[#159A68]/10 p-4 text-xs text-[#159A68]"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-[#159A68] hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form Konfirmasi Admin */}
        {confirmTarget && (
          <section className="mb-6 ff-card p-6 border-2 border-[#F75C03] bg-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E8F0]">
              <div>
                <h2 className="font-heading text-sm font-extrabold text-[#171725]">
                  Konfirmasi Pengiriman Pihak Ketiga (Order #
                  {confirmTarget.idOrder.slice(0, 8)}...)
                </h2>
                <p className="text-xs text-[#77788A]">
                  Alamat: {confirmTarget.alamatTujuan} ({confirmTarget.jarak}{' '}
                  km)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="text-[#77788A] hover:text-[#171725] cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                  Ongkir Final (Rp, minimal 0)
                </label>
                <input
                  type="number"
                  step="any"
                  value={confirmOngkir}
                  onChange={(e) => setConfirmOngkir(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                  Nama Pengantar / Ekspedisi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lalamove - Budi (AB 1234 XY)"
                  value={confirmPengantar}
                  onChange={(e) => setConfirmPengantar(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busyDeliveryId === confirmTarget.idDelivery}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {busyDeliveryId === confirmTarget.idDelivery
                    ? 'Menyimpan...'
                    : 'Simpan & Konfirmasi'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#E6E8F0] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Form Ubah Nama Pengantar */}
        {pengantarTarget && (
          <section className="mb-6 ff-card p-6 border-2 border-[#4737FF] bg-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E8F0]">
              <div>
                <h2 className="font-heading text-sm font-extrabold text-[#171725]">
                  Atur / Ubah Nama Pengantar (Order #
                  {pengantarTarget.idOrder.slice(0, 8)}...)
                </h2>
                <p className="text-xs text-[#77788A]">
                  Status saat ini: {pengantarTarget.statusDelivery}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPengantarTarget(null)}
                className="text-[#77788A] hover:text-[#171725] cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                  Nama Pengantar / Kurir Toko
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama kurir pengantar..."
                  value={pengantarNama}
                  onChange={(e) => setPengantarNama(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busyDeliveryId === pengantarTarget.idDelivery}
                  className="px-5 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {busyDeliveryId === pengantarTarget.idDelivery
                    ? 'Menyimpan...'
                    : 'Simpan Pengantar'}
                </button>
                <button
                  type="button"
                  onClick={() => setPengantarTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#F1F3F8] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Tabel Daftar Pengiriman */}
        <section className="ff-card p-6 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E6E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-extrabold text-[#171725]">
                  Daftar Pengiriman Pesanan
                </h2>
                <p className="text-xs text-[#77788A]">
                  Menampilkan {deliveries.length} dari total {totalElements}{' '}
                  pengiriman
                </p>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-3 animate-pulse py-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-14 rounded-2xl bg-[#F1F3F8]" />
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 p-8 text-center my-4">
              <AlertCircle className="w-8 h-8 text-[#E5484D] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171725] mb-1">
                Gagal Memuat Daftar Pengiriman
              </p>
              <p className="text-xs text-[#77788A] mb-4">
                {getErrorMessage(
                  error,
                  'Tidak dapat mengambil data pengiriman.'
                )}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!isLoading && !isError && deliveries.length === 0 && (
            <div className="rounded-2xl bg-[#F8FAFF] p-10 text-center my-2">
              <Truck className="w-10 h-10 text-[#ACA5FF] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171725] mb-1">
                Tidak ada data pengiriman
              </p>
              <p className="text-xs text-[#77788A]">
                {selectedStatus
                  ? `Belum ada pengiriman dengan status ${selectedStatus}.`
                  : 'Belum ada pengiriman yang tercatat di sistem.'}
              </p>
            </div>
          )}

          {!isLoading && !isError && deliveries.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E8F0] text-[#77788A] uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-3 font-bold">Order</th>
                      <th className="py-3.5 px-3 font-bold">Alamat</th>
                      <th className="py-3.5 px-3 font-bold">Jarak</th>
                      <th className="py-3.5 px-3 font-bold">Pelaksana</th>
                      <th className="py-3.5 px-3 font-bold">Ongkir</th>
                      <th className="py-3.5 px-3 font-bold">Pengantar</th>
                      <th className="py-3.5 px-3 font-bold">Status</th>
                      <th className="py-3.5 px-3 font-bold">Estimasi Tiba</th>
                      <th className="py-3.5 px-3 font-bold text-right">
                        Aksi Status & Kurir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E8F0] align-top">
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
                          className="hover:bg-[#F8FAFF] transition-colors"
                        >
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <Link
                              href={`/orders/${d.idOrder}`}
                              className="inline-flex items-center gap-1 font-mono font-bold text-[#4737FF] hover:underline"
                              title={d.idOrder}
                            >
                              <span>#{d.idOrder.slice(0, 8)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                            <span className="block text-[10px] text-[#77788A] mt-0.5">
                              {d.metodeDeliv}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 max-w-[200px]">
                            <p className="text-[#171725] font-medium line-clamp-2">
                              {d.alamatTujuan}
                            </p>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-[#171725]">
                              {d.jarak} km
                            </span>
                            {d.sumberJarak && (
                              <span className="block text-[10px] text-[#77788A]">
                                {d.sumberJarak}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#E7EFFF] text-[#4737FF] font-bold text-[11px]">
                              {d.pelaksana}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {isWaitingConfirm &&
                            d.pelaksana === 'PIHAK_KETIGA' ? (
                              <span className="text-[#D97706] font-bold block">
                                Menunggu konfirmasi
                              </span>
                            ) : (
                              <span className="font-extrabold text-[#4737FF]">
                                {formatRupiah(d.ongkir)}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-medium text-[#171725] flex items-center gap-1">
                              <User className="w-3 h-3 text-[#77788A] shrink-0" />
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
                                className="text-[11px] font-bold text-[#4737FF] hover:underline mt-1 cursor-pointer"
                              >
                                Ubah pengantar
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(
                                d.statusDelivery
                              )}`}
                            >
                              {d.statusDelivery}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {d.estimasiTiba ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-[#171725] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#4737FF] shrink-0" />
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
                                  <span className="px-2 py-0.5 rounded-full bg-[#E5484D] text-white text-[10px] font-extrabold">
                                    Terlambat
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#77788A]">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            {isTerminal ? (
                              <span className="text-[11px] text-[#77788A] italic">
                                Status akhir
                              </span>
                            ) : (
                              <div className="inline-flex flex-wrap justify-end gap-1.5">
                                {isWaitingConfirm && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => openConfirmModal(d)}
                                    className="px-3 py-1.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] disabled:opacity-50 text-white text-[11px] font-bold transition-colors cursor-pointer"
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
                                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                                        isCancelOrFail
                                          ? 'bg-[#E5484D]/10 hover:bg-[#E5484D]/20 text-[#E5484D] border border-[#E5484D]/30'
                                          : 'bg-[#4737FF] hover:bg-[#3529BF] text-white'
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E6E8F0] text-xs">
                  <span className="text-[#77788A]">
                    Halaman <strong className="text-[#171725]">{page + 1}</strong>{' '}
                    dari <strong className="text-[#171725]">{totalPages}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6E8F0] hover:bg-[#F1F3F8] disabled:opacity-40 text-[#171725] font-semibold cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Sebelumnya</span>
                    </button>
                    <button
                      type="button"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6E8F0] hover:bg-[#F1F3F8] disabled:opacity-40 text-[#171725] font-semibold cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101018]/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E6E8F0] shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5484D]/10 text-[#E5484D] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-extrabold text-[#171725]">
                    Yakin membatalkan pengiriman ini? Tindakan ini tidak dapat
                    diurungkan.
                  </h3>
                  <p className="text-xs text-[#77788A] mt-1">
                    Order #{cancelTarget.idOrder.slice(0, 8)} •{' '}
                    {cancelTarget.alamatTujuan}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#D97706]/10 border border-[#D97706]/30 p-3 text-xs text-[#171725]">
                Stok dan status pesanan tidak otomatis dikembalikan.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={busyDeliveryId === cancelTarget.idDelivery}
                  onClick={() => setCancelTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E8F0] bg-white hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={busyDeliveryId === cancelTarget.idDelivery}
                  onClick={() => executeUpdateStatus(cancelTarget, 'DIBATALKAN')}
                  className="px-4 py-2.5 rounded-xl bg-[#E5484D] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
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