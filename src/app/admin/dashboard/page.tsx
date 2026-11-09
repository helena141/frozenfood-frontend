'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  TrendingUp,
  ShoppingBag,
  Package,
  Award,
  RefreshCw,
  AlertCircle,
  Info,
  CreditCard,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage } from '@/lib/utils';
import { ReportResponse, LaporanPenjualanResponse } from '@/types/api';
import AdminSidebar from '@/components/admin/admin-sidebar';

function toYmdLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentMonthRange(): { mulai: string; akhir: string } {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    mulai: toYmdLocal(firstDayOfMonth),
    akhir: toYmdLocal(now),
  };
}

export default function AdminDashboardPage() {
  const [mulaiInput, setMulaiInput] = useState<string>('');
  const [akhirInput, setAkhirInput] = useState<string>('');
  const [appliedRange, setAppliedRange] = useState<{
    mulai: string;
    akhir: string;
  } | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Rentang bawaan saat halaman dibuka = tanggal 1 bulan berjalan s/d hari ini
  useEffect(() => {
    const range = getCurrentMonthRange();
    setMulaiInput(range.mulai);
    setAkhirInput(range.akhir);
    setAppliedRange(range);
  }, []);

  // 1. Query Laporan Omzet (GET /api/reports/omzet)
  const {
    data: omzetReport,
    isLoading: isLoadingOmzet,
    isError: isErrorOmzet,
    error: errorOmzet,
    refetch: refetchOmzet,
  } = useQuery<ReportResponse>({
    queryKey: ['report-omzet', appliedRange?.mulai, appliedRange?.akhir],
    queryFn: async () => {
      const res = await api.get<ReportResponse>('/api/reports/omzet', {
        params: {
          mulai: appliedRange?.mulai,
          akhir: appliedRange?.akhir,
        },
      });
      return res.data;
    },
    enabled: Boolean(appliedRange?.mulai && appliedRange?.akhir),
  });

  // 2. Query Laporan Penjualan & Produk Terlaris (GET /api/reports/penjualan)
  const {
    data: salesReport,
    isLoading: isLoadingSales,
    isError: isErrorSales,
    error: errorSales,
    refetch: refetchSales,
  } = useQuery<LaporanPenjualanResponse>({
    queryKey: ['report-penjualan', appliedRange?.mulai, appliedRange?.akhir],
    queryFn: async () => {
      const res = await api.get<LaporanPenjualanResponse>(
        '/api/reports/penjualan',
        {
          params: {
            mulai: appliedRange?.mulai,
            akhir: appliedRange?.akhir,
          },
        }
      );
      return res.data;
    },
    enabled: Boolean(appliedRange?.mulai && appliedRange?.akhir),
  });

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setDateError(null);

    if (!mulaiInput || !akhirInput) {
      setDateError('Tanggal mulai dan tanggal akhir wajib diisi.');
      return;
    }
    if (mulaiInput > akhirInput) {
      setDateError(
        'Tanggal mulai tidak boleh lebih baru daripada tanggal akhir.'
      );
      return;
    }

    setAppliedRange({ mulai: mulaiInput, akhir: akhirInput });
  };

  // Menghasilkan rentang yang sama persis dengan rentang bawaan saat halaman dibuka
  const handleSelectCurrentMonth = () => {
    setDateError(null);
    const range = getCurrentMonthRange();
    setMulaiInput(range.mulai);
    setAkhirInput(range.akhir);
    setAppliedRange(range);
  };

  const handleSelectToday = () => {
    setDateError(null);
    const todayStr = toYmdLocal(new Date());
    setMulaiInput(todayStr);
    setAkhirInput(todayStr);
    setAppliedRange({ mulai: todayStr, akhir: todayStr });
  };

  const handleRefreshAll = () => {
    refetchOmzet();
    refetchSales();
  };

  const isLoading = !appliedRange || isLoadingOmzet || isLoadingSales;
  const isError = isErrorOmzet || isErrorSales;

  const isPeriodEmpty =
    !isLoading &&
    !isError &&
    (omzetReport?.totalOmzet ?? 0) === 0 &&
    (omzetReport?.jumlahTransaksiLunas ?? 0) === 0 &&
    (salesReport?.jumlahPesanan ?? 0) === 0;

  return (
    <div className="lezzat-shell">
      <AdminSidebar />

      <main className="lezzat-main">
        {/* Header Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              MODUL LAPORAN & ANALITIK ADMIN
            </p>
            <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
              Ringkasan Omzet & Penjualan
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Data</span>
          </button>
        </div>

        {/* Catatan Batasan Backend Sesuai Bagian B */}
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-[#f2efe9] border border-slate-200/80 p-3.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-[#174634] shrink-0 mt-0.5" />
          <span>
            <strong>Catatan Sistem:</strong> Pembatasan peran admin menunggu
            implementasi dari backend. Laporan omzet dihitung dari transaksi
            berstatus <strong>LUNAS</strong>, sedangkan laporan penjualan
            mencakup pesanan yang tercatat pada periode terpilih.
          </span>
        </div>

        {/* Form Filter Rentang Tanggal */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 mb-6">
          <form
            onSubmit={handleApplyFilter}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <div>
                <label
                  htmlFor="mulai"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Tanggal Mulai
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="mulai"
                    type="date"
                    value={mulaiInput}
                    onChange={(e) => setMulaiInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="akhir"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Tanggal Akhir
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="akhir"
                    type="date"
                    value={akhirInput}
                    onChange={(e) => setAkhirInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-3.5 py-2.5 rounded-xl bg-[#f7f6f2] hover:bg-slate-200/70 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className="px-3.5 py-2.5 rounded-xl bg-[#f7f6f2] hover:bg-slate-200/70 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Bulan Berjalan
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#174634] hover:bg-[#113527] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Tampilkan Laporan
              </button>
            </div>
          </form>

          {dateError && (
            <p className="mt-3 text-xs text-red-600 font-medium">{dateError}</p>
          )}
        </section>

        {/* 1. KONDISI LOADING */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-3xl p-6 border border-slate-200 h-32"
                />
              ))}
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200 h-64" />
          </div>
        )}

        {/* 2. KONDISI ERROR */}
        {!isLoading && isError && (
          <div className="bg-white rounded-3xl p-8 border border-red-200 text-center max-w-lg mx-auto my-8">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Gagal Memuat Laporan Admin
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              {getErrorMessage(
                errorOmzet || errorSales,
                'Pastikan server backend aktif dan Anda sudah masuk ke akun.'
              )}
            </p>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174634] text-white text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* 3. KONDISI DATA TERSEDIA */}
        {!isLoading && !isError && omzetReport && salesReport && (
          <div className="space-y-6">
            {isPeriodEmpty && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 text-xs text-[#174634]">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Belum ada pesanan atau transaksi lunas pada rentang tanggal{' '}
                  <strong>{omzetReport.periodeMulai}</strong> s/d{' '}
                  <strong>{omzetReport.periodeAkhir}</strong>. Seluruh metrik
                  ditampilkan sebagai Rp 0 / 0 unit.
                </span>
              </div>
            )}

            {/* Bagian A: Kartu Ringkasan Omzet (ReportResponse) */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">
                  1. LAPORAN OMZET KEUANGAN ({omzetReport.periodeMulai} s/d{' '}
                  {omzetReport.periodeAkhir})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Total Omzet */}
                <div className="rounded-3xl bg-[#174634] text-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-emerald-100/80">
                      Total Omzet
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-200" />
                    </div>
                  </div>
                  <p className="font-serif-title text-2xl sm:text-3xl font-bold">
                    {formatRupiah(omzetReport.totalOmzet)}
                  </p>
                  <p className="text-[11px] text-emerald-100/75 mt-2">
                    Dari {omzetReport.jumlahTransaksiLunas} transaksi lunas
                  </p>
                </div>

                {/* Jumlah Transaksi Lunas & Rata-rata */}
                <div className="rounded-3xl bg-white p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">
                      Rata-Rata Transaksi
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif-title text-2xl font-bold text-slate-900">
                    {formatRupiah(omzetReport.rataRataTransaksi)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Transaksi Lunas:{' '}
                    <strong className="text-slate-800">
                      {omzetReport.jumlahTransaksiLunas}
                    </strong>
                  </p>
                </div>

                {/* Omzet Eceran (B2C) */}
                <div className="rounded-3xl bg-white p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">
                      Total Omzet B2C (Eceran)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#174634] text-[10px] font-bold">
                      B2C
                    </span>
                  </div>
                  <p className="font-serif-title text-2xl font-bold text-slate-900">
                    {formatRupiah(omzetReport.totalOmzetB2C)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Kontribusi pelanggan ritel rumah tangga
                  </p>
                </div>

                {/* Omzet Mitra (B2B) */}
                <div className="rounded-3xl bg-white p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">
                      Total Omzet B2B (Grosir)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                      B2B
                    </span>
                  </div>
                  <p className="font-serif-title text-2xl font-bold text-slate-900">
                    {formatRupiah(omzetReport.totalOmzetB2B)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Kontribusi mitra usaha kuliner
                  </p>
                </div>
              </div>
            </section>

            {/* Bagian B: Ringkasan Volume Penjualan (LaporanPenjualanResponse) */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">
                  2. STATISTIK PESANAN & UNIT TERJUAL (
                  {salesReport.periodeMulai} s/d {salesReport.periodeAkhir})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-3xl bg-white p-5 border border-slate-200 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#f2efe9] text-[#174634] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">
                      Total Pesanan Masuk
                    </span>
                    <span className="text-xl font-bold text-slate-900">
                      {salesReport.jumlahPesanan} pesanan
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 border border-slate-200 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#f2efe9] text-[#174634] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">
                      Total Unit Terjual
                    </span>
                    <span className="text-xl font-bold text-slate-900">
                      {salesReport.totalUnitTerjual} unit
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 border border-slate-200 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#174634] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">
                      Rincian Pesanan B2C / B2B
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      B2C: {salesReport.jumlahPesananB2C} • B2B:{' '}
                      {salesReport.jumlahPesananB2B}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 border border-slate-200 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">
                      Rincian Unit B2C / B2B
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      B2C: {salesReport.unitTerjualB2C} • B2B:{' '}
                      {salesReport.unitTerjualB2B}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Bagian C: Tabel Produk Terlaris */}
            <section className="bg-white rounded-3xl p-6 border border-slate-200">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Daftar Produk Terlaris
                    </h2>
                    <p className="text-xs text-slate-500">
                      Diurutkan berdasarkan kontribusi penjualan pada periode{' '}
                      {salesReport.periodeMulai} s/d {salesReport.periodeAkhir}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#f2efe9] text-slate-700 text-xs font-semibold">
                  {salesReport.produkTerlaris?.length || 0} produk
                </span>
              </div>

              {!salesReport.produkTerlaris ||
              salesReport.produkTerlaris.length === 0 ? (
                <div className="rounded-2xl bg-[#f7f6f2] p-8 text-center">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 mb-0.5">
                    Belum ada produk terjual pada periode ini
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Coba pilih rentang tanggal lain atau selesaikan transaksi
                    pesanan terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="py-3 px-4 font-semibold w-24">
                          Peringkat
                        </th>
                        <th className="py-3 px-4 font-semibold">Nama Produk</th>
                        <th className="py-3 px-4 font-semibold text-right">
                          Total Unit Terjual
                        </th>
                        <th className="py-3 px-4 font-semibold text-right">
                          Total Nilai Penjualan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesReport.produkTerlaris.map((item, idx) => (
                        <tr
                          key={item.idProduk}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                                idx === 0
                                  ? 'bg-[#174634] text-white'
                                  : idx === 1
                                    ? 'bg-emerald-100 text-[#174634]'
                                    : idx === 2
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {item.namaProduk}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 text-right">
                            {item.totalUnitTerjual} unit
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#174634] text-right">
                            {formatRupiah(item.totalPenjualan)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                Nilai penjualan mencakup semua pesanan, termasuk yang belum
                dibayar.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}