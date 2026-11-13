'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  CalendarClock,
  Package,
  ArrowRight,
  BellRing,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage } from '@/lib/utils';

export interface ExpiryAlertItem {
  idAlert: string;
  idProdBatch: string;
  idProduk: string;
  namaProduk: string;
  tanggalExp: string;
  stokOnline: number;
  hargaEceran: number;
  hargaOverride: number | null;
  diskon: number | null;
  pesan: string;
  isResolved: boolean;
  createdAt: string;
}

export default function ExpiryAlertPanel() {
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: alerts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ExpiryAlertItem[]>({
    queryKey: ['admin-expiry-alerts', showResolved],
    queryFn: async () => {
      const res = await api.get<ExpiryAlertItem[]>('/api/inventory/alerts', {
        params: { unresolvedOnly: !showResolved },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 30000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (idAlert: string) => {
      await api.patch(`/api/inventory/alerts/${idAlert}/resolve`);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-expiry-alerts'] });
    },
    onError: (err) => {
      setActionError(
        getErrorMessage(err, 'Gagal menandai peringatan sebagai selesai.')
      );
    },
  });

  const unresolvedCount = alerts.filter((a) => !a.isResolved).length;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              unresolvedCount > 0
                ? 'bg-[#F75C03]/15 text-[#F75C03]'
                : 'bg-emerald-50 text-[#159A68]'
            }`}
          >
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-extrabold text-slate-800">
                Peringatan Kedaluwarsa Batch FEFO
              </h2>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  unresolvedCount > 0
                    ? 'bg-[#F75C03] text-white'
                    : 'bg-emerald-50 text-[#159A68]'
                }`}
              >
                {unresolvedCount} Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Otomatis memindai batch H-30 (Diskon 20%) & H-7 (Clearance 50%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[#4737FF]"
            />
            <span>Tampilkan yang Selesai</span>
          </label>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#4737FF] ${
                isFetching ? 'animate-spin' : ''
              }`}
            />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600 font-medium">
          {actionError}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-16 rounded-xl bg-slate-100" />
          <div className="h-16 rounded-xl bg-slate-100" />
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 flex items-center justify-between">
          <span>
            {getErrorMessage(error, 'Gagal memuat daftar peringatan kedaluwarsa.')}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-white text-red-600 font-bold border border-red-200 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !isError && alerts.length === 0 && (
        <div className="rounded-xl bg-slate-50 p-6 text-center space-y-1">
          <CheckCircle2 className="w-7 h-7 text-[#159A68] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">
            Tidak Ada Peringatan Kedaluwarsa Aktif
          </p>
          <p className="text-[11px] text-slate-500">
            Seluruh batch gudang berada dalam masa simpan aman atau sudah ditangani.
          </p>
        </div>
      )}

      {!isLoading && !isError && alerts.length > 0 && (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const isClearance = (alert.pesan || '')
              .toUpperCase()
              .startsWith('CLEARANCE');

            const effectivePrice =
              alert.hargaOverride !== null && alert.hargaOverride > 0
                ? alert.hargaOverride
                : alert.diskon !== null && alert.diskon > 0
                  ? Math.round((alert.hargaEceran * (100 - alert.diskon)) / 100)
                  : alert.hargaEceran;

            return (
              <div
                key={alert.idAlert}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  alert.isResolved
                    ? 'bg-slate-50 border-slate-200 opacity-65'
                    : isClearance
                      ? 'bg-[#FFF7ED] border-[#FED7AA]'
                      : 'bg-amber-50/60 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      alert.isResolved
                        ? 'bg-slate-200 text-slate-600'
                        : isClearance
                          ? 'bg-[#F75C03] text-white'
                          : 'bg-amber-500 text-white'
                    }`}
                  >
                    {isClearance ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isClearance
                            ? 'bg-[#F75C03] text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isClearance ? 'CLEARANCE H-7' : 'FEFO DEAL H-30'}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-700">
                        {alert.idProdBatch}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <CalendarClock className="w-3 h-3 text-[#F75C03]" />
                        <span>Exp: {alert.tanggalExp}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <Package className="w-3 h-3 text-[#4737FF]" />
                        <span>Stok: {alert.stokOnline}</span>
                      </span>

                      {effectivePrice < alert.hargaEceran && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#159A68] text-[10px] font-extrabold">
                          Harga Promo: {formatRupiah(effectivePrice)} (Normal:{' '}
                          {formatRupiah(alert.hargaEceran)})
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      {alert.pesan}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    href="/admin/products"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    <span>Kelola Batch</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  {!alert.isResolved ? (
                    <button
                      type="button"
                      disabled={resolveMutation.isPending}
                      onClick={() => resolveMutation.mutate(alert.idAlert)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#159A68] hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tandai Selesai</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#159A68] text-[11px] font-bold">
                      Selesai
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}