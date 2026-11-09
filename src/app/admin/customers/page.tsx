'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Search,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { CustomerResponse } from '@/types/api';
import { getErrorMessage, formatDateTimeId } from '@/lib/utils';
import AdminSidebar from '@/components/admin/admin-sidebar';

type RoleFilter = '' | 'B2C' | 'B2B';

export default function AdminCustomersPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<CustomerResponse | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    data: customers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CustomerResponse[]>({
    queryKey: ['admin-customers', roleFilter, searchKeyword],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (roleFilter) params.role = roleFilter;
      if (searchKeyword.trim()) params.search = searchKeyword.trim();
      const res = await api.get<CustomerResponse[]>('/api/customers', {
        params,
      });
      return res.data;
    },
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    setActionSuccess(null);
    setIsDeleting(true);

    try {
      await api.delete(`/api/customers/${deleteTarget.idUser}`);
      setActionSuccess(
        `Akun pelanggan "${deleteTarget.nama}" berhasil dinonaktifkan.`
      );
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal menonaktifkan akun pelanggan.')
      );
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
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
              MANAJEMEN MITRA B2B & PELANGGAN B2C
            </p>
            <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
              Kelola Pelanggan
            </h1>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {/* Pesan Error / Sukses */}
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

        {/* Tabel Daftar Pelanggan */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#f2efe9] text-[#174634] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Pelanggan Aktif
                </h2>
                <p className="text-xs text-slate-500">
                  Total {customers.length} pelanggan ditemukan (
                  <code>GET /api/customers</code>)
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Filter Tipe Akun */}
              <div className="inline-flex rounded-xl bg-[#f7f6f2] p-1 border border-slate-200/80">
                {(
                  [
                    { label: 'Semua', value: '' },
                    { label: 'Retail B2C', value: 'B2C' },
                    { label: 'Mitra B2B', value: 'B2B' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setRoleFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      roleFilter === tab.value
                        ? 'bg-[#174634] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Cari nama atau email..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-xs text-slate-900 focus:border-[#174634] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-3 animate-pulse py-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-14 rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center my-4">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900 mb-1">
                Gagal Memuat Data Pelanggan
              </p>
              <p className="text-xs text-slate-600 mb-4">
                {getErrorMessage(
                  error,
                  'Tidak dapat mengambil daftar pelanggan dari server.'
                )}
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

          {!isLoading && !isError && customers.length === 0 && (
            <div className="rounded-2xl bg-[#f7f6f2] p-10 text-center my-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 mb-1">
                Pelanggan Tidak Ditemukan
              </p>
              <p className="text-xs text-slate-500">
                Belum ada pelanggan yang terdaftar atau sesuai dengan filter
                pencarian.
              </p>
            </div>
          )}

          {!isLoading && !isError && customers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="py-3 px-4 font-semibold">Pelanggan</th>
                    <th className="py-3 px-4 font-semibold">Tipe Akun</th>
                    <th className="py-3 px-4 font-semibold">Kontak</th>
                    <th className="py-3 px-4 font-semibold">Alamat</th>
                    <th className="py-3 px-4 font-semibold">Terdaftar</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr
                      key={c.idUser}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{c.nama}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ID: {c.idUser.slice(0, 8)}...
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            c.tipeAkun === 'B2B'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.tipeAkun}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.noTelp || '-'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {c.alamat || '-'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {c.createdAt ? formatDateTimeId(c.createdAt) : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Nonaktifkan</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal Konfirmasi Nonaktifkan Pelanggan */}
        {deleteTarget && (
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
                    Nonaktifkan pelanggan &ldquo;{deleteTarget.nama}&rdquo;?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tindakan ini akan memanggil{' '}
                    <code>DELETE /api/customers/&#123;id&#125;</code> (soft
                    delete).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {isDeleting ? 'Memproses...' : 'Ya, Nonaktifkan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
