'use client';

import React, { useState, useMemo } from 'react';
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
  Layers,
  UserCheck,
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

  const stats = useMemo(() => {
    const total = customers.length;
    const b2c = customers.filter((c) => c.tipeAkun === 'B2C').length;
    const b2b = customers.filter((c) => c.tipeAkun === 'B2B').length;
    return { total, b2c, b2b };
  }, [customers]);

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
        {/* Header SaaS Froznfood 2.0 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
              FROZNFOOD 2.0 • CUSTOMER DIRECTORY
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mt-1">
              Manajemen Pelanggan
            </h1>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4737FF]" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {/* Kartu Ringkasan Pelanggan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="ff-card bg-white p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-[#77788A] block">
                Total Pelanggan Ditampilkan
              </span>
              <span className="font-heading text-xl font-extrabold text-[#171725]">
                {stats.total} akun
              </span>
            </div>
          </div>

          <div className="ff-card bg-white p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#159A68]/15 text-[#159A68] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-[#77788A] block">
                Pelanggan Retail (B2C)
              </span>
              <span className="font-heading text-xl font-extrabold text-[#171725]">
                {stats.b2c} akun
              </span>
            </div>
          </div>

          <div className="ff-card bg-white p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#F75C03]/15 text-[#F75C03] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-[#77788A] block">
                Mitra Bisnis / Grosir (B2B)
              </span>
              <span className="font-heading text-xl font-extrabold text-[#171725]">
                {stats.b2b} akun
              </span>
            </div>
          </div>
        </div>

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

        {/* Tabel Daftar Pelanggan */}
        <section className="ff-card bg-white p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#E6E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E7EFFF] text-[#4737FF] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-extrabold text-[#171725]">
                  Daftar Pelanggan Aktif
                </h2>
                <p className="text-xs text-[#77788A]">
                  Total {customers.length} pelanggan ditemukan (
                  <code>GET /api/customers</code>)
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Filter Tipe Akun */}
              <div className="inline-flex rounded-xl bg-[#F8FAFF] p-1 border border-[#E6E8F0]">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === tab.value
                        ? 'bg-[#4737FF] text-white shadow-xs'
                        : 'text-[#5E5E6A] hover:text-[#171725]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Cari nama atau email..."
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-3 animate-pulse py-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-14 rounded-2xl bg-[#F1F3F8]" />
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/30 p-8 text-center my-4">
              <AlertCircle className="w-8 h-8 text-[#E5484D] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171725] mb-1">
                Gagal Memuat Data Pelanggan
              </p>
              <p className="text-xs text-[#77788A] mb-4">
                {getErrorMessage(
                  error,
                  'Tidak dapat mengambil daftar pelanggan dari server.'
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

          {!isLoading && !isError && customers.length === 0 && (
            <div className="rounded-2xl bg-[#F8FAFF] p-10 text-center my-2">
              <Users className="w-10 h-10 text-[#ACA5FF] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171725] mb-1">
                Pelanggan Tidak Ditemukan
              </p>
              <p className="text-xs text-[#77788A]">
                Belum ada pelanggan yang terdaftar atau sesuai dengan filter
                pencarian.
              </p>
            </div>
          )}

          {!isLoading && !isError && customers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E6E8F0] text-[#77788A] uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 font-bold">Pelanggan</th>
                    <th className="py-3.5 px-4 font-bold">Tipe Akun</th>
                    <th className="py-3.5 px-4 font-bold">Kontak</th>
                    <th className="py-3.5 px-4 font-bold">Alamat</th>
                    <th className="py-3.5 px-4 font-bold">Terdaftar</th>
                    <th className="py-3.5 px-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E8F0]">
                  {customers.map((c) => (
                    <tr
                      key={c.idUser}
                      className="hover:bg-[#F8FAFF] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#E7EFFF] text-[#4737FF] font-bold text-xs flex items-center justify-center shrink-0">
                            {c.nama?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-[#171725]">{c.nama}</p>
                            <p className="text-[11px] text-[#77788A] font-mono">
                              ID: {c.idUser.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                            c.tipeAkun === 'B2B'
                              ? 'bg-[#F75C03]/15 text-[#F75C03]'
                              : 'bg-[#E7EFFF] text-[#4737FF]'
                          }`}
                        >
                          {c.tipeAkun}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-[#171725] font-medium">
                          <Mail className="w-3 h-3 text-[#77788A] shrink-0" />
                          <span>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#5E5E6A]">
                          <Phone className="w-3 h-3 text-[#77788A] shrink-0" />
                          <span>{c.noTelp || '-'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#5E5E6A] max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 text-[#77788A] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {c.alamat || '-'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#77788A]">
                        {c.createdAt ? formatDateTimeId(c.createdAt) : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E5484D]/30 bg-[#E5484D]/10 hover:bg-[#E5484D]/20 text-[#E5484D] text-[11px] font-bold cursor-pointer transition-colors"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101018]/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E6E8F0] shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5484D]/10 text-[#E5484D] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-extrabold text-[#171725]">
                    Nonaktifkan pelanggan &ldquo;{deleteTarget.nama}&rdquo;?
                  </h3>
                  <p className="text-xs text-[#77788A] mt-1">
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
                  className="px-4 py-2.5 rounded-xl border border-[#E6E8F0] bg-white hover:bg-[#F1F3F8] text-[#171725] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-[#E5484D] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
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