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
  BarChart3,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage } from '@/lib/utils';
import { ReportResponse, LaporanPenjualanResponse } from '@/types/api';
import AdminSidebar from '@/components/admin/admin-sidebar';
import ExpiryAlertPanel from '@/components/admin/expiry-alert-panel';
import AdminOrderAlert from '@/components/admin/admin-order-alert';

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

  const totalRevenue = omzetReport?.totalOmzet || 0;
  const b2cRevenue = omzetReport?.totalOmzetB2C || 0;
  const b2bRevenue = omzetReport?.totalOmzetB2B || 0;
  const b2cRevPct =
    totalRevenue > 0 ? Math.round((b2cRevenue / totalRevenue) * 100) : 0;
  const b2bRevPct =
    totalRevenue > 0 ? Math.round((b2bRevenue / totalRevenue) * 100) : 0;

  const maxProductSales =
    salesReport?.produkTerlaris && salesReport.produkTerlaris.length > 0
      ? Math.max(...salesReport.produkTerlaris.map((p) => p.totalPenjualan), 1)
      : 1;

  return (
    <div className="lezzat-shell">
      <AdminSidebar />

      <main className="lezzat-main">
        {/* Header Dashboard SaaS Froznfood 2.0 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
              FROZNFOOD 2.0 • REVENUE & ANALYTICS
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mt-1">
              Ringkasan Omzet & Penjualan
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4737FF]" />
            <span>Muat Ulang Data</span>
          </button>
        </div>

        {/* 1. Notifikasi Suara Pesanan Baru & Konfirmasi Ongkir Pihak Ketiga */}
        <AdminOrderAlert />

        {/* 2. Panel Peringatan Kedaluwarsa Batch FEFO (Hanya 1x, Tidak Duplikat) */}
        <div className="mb-6">
          <ExpiryAlertPanel />
        </div>

        {/* Catatan Sistem */}
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-[#E7EFFF] border border-[#D1CDFF] p-3.5 text-xs text-[#171725]">
          <Info className="w-4 h-4 text-[#4737FF] shrink-0 mt-0.5" />
          <span>
            <strong>Catatan Sistem:</strong> Laporan omzet dihitung dari
            transaksi berstatus <strong>LUNAS</strong> (
            <code className="font-mono text-[#4737FF]">/api/reports/omzet</code>
            ), sedangkan laporan penjualan mencakup pesanan yang tercatat pada
            periode terpilih (
            <code className="font-mono text-[#4737FF]">
              /api/reports/penjualan
            </code>
            ).
          </span>
        </div>

        {/* Form Filter Rentang Tanggal */}
        <section className="ff-card p-5 sm:p-6 bg-white mb-6">
          <form
            onSubmit={handleApplyFilter}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <div>
                <label
                  htmlFor="mulai"
                  className="block text-xs font-semibold text-[#171725] mb-1.5"
                >
                  Tanggal Mulai
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="mulai"
                    type="date"
                    value={mulaiInput}
                    onChange={(e) => setMulaiInput(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="akhir"
                  className="block text-xs font-semibold text-[#171725] mb-1.5"
                >
                  Tanggal Akhir
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="akhir"
                    type="date"
                    value={akhirInput}
                    onChange={(e) => setAkhirInput(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#171725] focus:border-[#4737FF] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-3.5 py-2.5 rounded-xl bg-[#F1F3F8] hover:bg-[#E6E8F0] text-[#171725] text-xs font-semibold transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className="px-3.5 py-2.5 rounded-xl bg-[#F1F3F8] hover:bg-[#E6E8F0] text-[#171725] text-xs font-semibold transition-colors cursor-pointer"
              >
                Bulan Berjalan
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold shadow-sm shadow-[#4737FF]/25 transition-all cursor-pointer"
              >
                Tampilkan Laporan
              </button>
            </div>
          </form>

          {dateError && (
            <p className="mt-3 text-xs text-[#E5484D] font-medium">
              {dateError}
            </p>
          )}
        </section>

        {/* 1. KONDISI LOADING */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="ff-card p-6 bg-white h-32" />
              ))}
            </div>
            <div className="ff-card p-6 bg-white h-64" />
          </div>
        )}

        {/* 2. KONDISI ERROR */}
        {!isLoading && isError && (
          <div className="ff-card p-8 bg-white border border-[#E5484D]/30 text-center max-w-lg mx-auto my-8">
            <AlertCircle className="w-10 h-10 text-[#E5484D] mx-auto mb-3" />
            <h2 className="font-heading text-base font-bold text-[#171725] mb-1">
              Gagal Memuat Laporan Admin
            </h2>
            <p className="text-xs text-[#77788A] mb-5">
              {getErrorMessage(
                errorOmzet || errorSales,
                'Pastikan server backend aktif dan Anda sudah masuk ke akun.'
              )}
            </p>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4737FF] text-white text-xs font-bold cursor-pointer"
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
              <div className="flex items-start gap-2.5 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/30 p-4 text-xs text-[#171725]">
                <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <span>
                  Belum ada pesanan atau transaksi lunas pada rentang tanggal{' '}
                  <strong>{omzetReport.periodeMulai}</strong> s/d{' '}
                  <strong>{omzetReport.periodeAkhir}</strong>. Seluruh metrik
                  ditampilkan sebagai Rp 0 / 0 unit.
                </span>
              </div>
            )}

            {/* Bagian A: Kartu KPI Ringkasan Omzet */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-extrabold tracking-[0.14em] text-[#77788A] uppercase">
                  1. LAPORAN OMZET KEUANGAN ({omzetReport.periodeMulai} s/d{' '}
                  {omzetReport.periodeAkhir})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Highlight Card: Total Omzet */}
                <div className="rounded-2xl ff-hero-gradient text-white p-6 shadow-md shadow-[#4737FF]/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white/85">
                      Total Omzet Bersih
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[#FFB36B]" />
                    </div>
                  </div>
                  <p className="font-heading text-2xl sm:text-3xl font-extrabold">
                    {formatRupiah(omzetReport.totalOmzet)}
                  </p>
                  <p className="text-[11px] text-white/80 mt-2">
                    Dari {omzetReport.jumlahTransaksiLunas} transaksi lunas
                  </p>
                </div>

                {/* Rata-rata Transaksi */}
                <div className="ff-card bg-white p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#77788A]">
                      Rata-Rata Transaksi
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-heading text-2xl font-extrabold text-[#171725]">
                    {formatRupiah(omzetReport.rataRataTransaksi)}
                  </p>
                  <p className="text-[11px] text-[#77788A] mt-2">
                    Transaksi Lunas:{' '}
                    <strong className="text-[#171725]">
                      {omzetReport.jumlahTransaksiLunas}
                    </strong>
                  </p>
                </div>

                {/* Omzet Eceran (B2C) */}
                <div className="ff-card bg-white p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#77788A]">
                      Total Omzet B2C (Eceran)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#E7EFFF] text-[#4737FF] text-[10px] font-extrabold">
                      B2C
                    </span>
                  </div>
                  <p className="font-heading text-2xl font-extrabold text-[#171725]">
                    {formatRupiah(omzetReport.totalOmzetB2C)}
                  </p>
                  <p className="text-[11px] text-[#77788A] mt-2">
                    Kontribusi pelanggan ritel ({b2cRevPct}%)
                  </p>
                </div>

                {/* Omzet Mitra (B2B) */}
                <div className="ff-card bg-white p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#77788A]">
                      Total Omzet B2B (Grosir)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F75C03]/15 text-[#F75C03] text-[10px] font-extrabold">
                      B2B
                    </span>
                  </div>
                  <p className="font-heading text-2xl font-extrabold text-[#171725]">
                    {formatRupiah(omzetReport.totalOmzetB2B)}
                  </p>
                  <p className="text-[11px] text-[#77788A] mt-2">
                    Kontribusi mitra usaha ({b2bRevPct}%)
                  </p>
                </div>
              </div>
            </section>

            {/* Bagian B: Statistik Pesanan & Visualisasi Komposisi Omzet */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <h2 className="text-xs font-extrabold tracking-[0.14em] text-[#77788A] uppercase">
                  2. STATISTIK PESANAN & UNIT ({salesReport.periodeMulai} s/d{' '}
                  {salesReport.periodeAkhir})
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="ff-card bg-white p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-[#77788A] block">
                        Total Pesanan Masuk
                      </span>
                      <span className="font-heading text-xl font-extrabold text-[#171725]">
                        {salesReport.jumlahPesanan} pesanan
                      </span>
                    </div>
                  </div>

                  <div className="ff-card bg-white p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#F75C03]/15 text-[#F75C03] flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-[#77788A] block">
                        Total Unit Terjual
                      </span>
                      <span className="font-heading text-xl font-extrabold text-[#171725]">
                        {salesReport.totalUnitTerjual} unit
                      </span>
                    </div>
                  </div>

                  <div className="ff-card bg-white p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#159A68]/15 text-[#159A68] flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-[#77788A] block">
                        Rincian Pesanan B2C / B2B
                      </span>
                      <span className="text-sm font-bold text-[#171725]">
                        B2C: {salesReport.jumlahPesananB2C} • B2B:{' '}
                        {salesReport.jumlahPesananB2B}
                      </span>
                    </div>
                  </div>

                  <div className="ff-card bg-white p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#D97706]/15 text-[#D97706] flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-[#77788A] block">
                        Rincian Unit B2C / B2B
                      </span>
                      <span className="text-sm font-bold text-[#171725]">
                        B2C: {salesReport.unitTerjualB2C} • B2B:{' '}
                        {salesReport.unitTerjualB2B}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Chart Proporsi B2C vs B2B */}
              <div className="lg:col-span-5 flex flex-col">
                <h2 className="text-xs font-extrabold tracking-[0.14em] text-[#77788A] uppercase mb-3">
                  KOMPOSISI OMZET B2C VS B2B
                </h2>
                <div className="ff-card bg-white p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#4737FF]" />
                      <span className="text-xs font-bold text-[#171725]">
                        Distribusi Pendapatan
                      </span>
                    </div>
                    <span className="text-[11px] text-[#77788A]">
                      Real-time Data
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[#171725]">
                          Retail (B2C)
                        </span>
                        <span className="font-bold text-[#4737FF]">
                          {formatRupiah(b2cRevenue)} ({b2cRevPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[#F1F3F8] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#4737FF] transition-all duration-300"
                          style={{ width: `${Math.min(100, b2cRevPct)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[#171725]">
                          Mitra Grosir (B2B)
                        </span>
                        <span className="font-bold text-[#F75C03]">
                          {formatRupiah(b2bRevenue)} ({b2bRevPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[#F1F3F8] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F75C03] transition-all duration-300"
                          style={{ width: `${Math.min(100, b2bRevPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-[#E6E8F0] text-[11px] text-[#77788A]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#4737FF]" />
                      <span>Primary Blue (B2C)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#F75C03]" />
                      <span>Vivid Orange (B2B)</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Bagian C: Tabel & Grafik Produk Terlaris */}
            <section className="ff-card bg-white p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E6E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-base font-extrabold text-[#171725]">
                      Daftar Produk Terlaris
                    </h2>
                    <p className="text-xs text-[#77788A]">
                      Diurutkan berdasarkan kontribusi penjualan pada periode{' '}
                      {salesReport.periodeMulai} s/d {salesReport.periodeAkhir}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#E7EFFF] text-[#4737FF] text-xs font-bold">
                  {salesReport.produkTerlaris?.length || 0} produk
                </span>
              </div>

              {!salesReport.produkTerlaris ||
              salesReport.produkTerlaris.length === 0 ? (
                <div className="rounded-2xl bg-[#F8FAFF] p-8 text-center">
                  <Package className="w-8 h-8 text-[#ACA5FF] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#171725] mb-0.5">
                    Belum ada produk terjual pada periode ini
                  </p>
                  <p className="text-[11px] text-[#77788A]">
                    Coba pilih rentang tanggal lain atau selesaikan transaksi
                    pesanan terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E6E8F0] text-[#77788A] uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-4 font-bold w-24">
                          Peringkat
                        </th>
                        <th className="py-3.5 px-4 font-bold">Nama Produk</th>
                        <th className="py-3.5 px-4 font-bold text-right">
                          Total Unit Terjual
                        </th>
                        <th className="py-3.5 px-4 font-bold text-right">
                          Total Nilai Penjualan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E8F0]">
                      {salesReport.produkTerlaris.map((item, idx) => {
                        const barWidth = Math.max(
                          6,
                          Math.round(
                            (item.totalPenjualan / maxProductSales) * 100
                          )
                        );
                        return (
                          <tr
                            key={item.idProduk}
                            className="hover:bg-[#F8FAFF] transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold ${
                                  idx === 0
                                    ? 'bg-[#4737FF] text-white'
                                    : idx === 1
                                      ? 'bg-[#F75C03] text-white'
                                      : idx === 2
                                        ? 'bg-[#E7EFFF] text-[#4737FF]'
                                        : 'bg-[#F1F3F8] text-[#5E5E6A]'
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-[#171725]">
                                {item.namaProduk}
                              </p>
                              <div className="w-full max-w-xs h-1.5 rounded-full bg-[#F1F3F8] mt-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    idx === 0 ? 'bg-[#4737FF]' : 'bg-[#F75C03]'
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#171725] text-right">
                              {item.totalUnitTerjual} unit
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-[#4737FF] text-right">
                              {formatRupiah(item.totalPenjualan)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-4 pt-3 border-t border-[#E6E8F0] text-[11px] text-[#77788A]">
                Nilai penjualan mencakup semua pesanan yang tercatat pada
                periode terpilih.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}