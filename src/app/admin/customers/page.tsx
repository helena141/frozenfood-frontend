'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  Building2,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { getErrorMessage } from '@/lib/utils';
import AdminSidebar from '@/components/admin/admin-sidebar';
import CustomerAvatar from '@/components/shop/customer-avatar';

interface CustomerItem {
  idUser?: string;
  idCustomer?: string;
  id?: string;
  nama: string;
  email: string;
  noHp?: string;
  noTelp?: string;
  alamat?: string;
  tipeAkun?: 'B2C' | 'B2B' | string;
  role?: string;
  namaPerusahaan?: string;
  fotoProfil?: string | null;
  createdAt?: string;
}

function getCustomerId(c: CustomerItem): string {
  return String(c.idUser || c.idCustomer || c.id || '');
}

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'B2C' | 'B2B'>(
    'ALL'
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: customers = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<CustomerItem[]>({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const res = await api.get('/api/customers');
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.content)) return raw.content;
      if (raw && Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      await api.delete(`/api/customers/${id}`);
    },
    onSuccess: () => {
      setActionError(null);
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (err) => {
      setDeletingId(null);
      setActionError(getErrorMessage(err, 'Gagal menghapus data pelanggan.'));
    },
  });

  const handleDeleteCustomer = (customer: CustomerItem) => {
    const id = getCustomerId(customer);
    if (!id) return;
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus pelanggan "${customer.nama}" (${customer.email})?`
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  // Filter & Pencarian Pelanggan
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return customers.filter((c) => {
      const tipe = (c.tipeAkun || 'B2C').toUpperCase();
      if (accountFilter !== 'ALL' && tipe !== accountFilter) {
        return false;
      }

      if (!q) return true;

      const id = getCustomerId(c).toLowerCase();
      const nama = (c.nama || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.noHp || c.noTelp || '').toLowerCase();
      const alamat = (c.alamat || '').toLowerCase();
      const company = (c.namaPerusahaan || '').toLowerCase();

      return (
        nama.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        alamat.includes(q) ||
        company.includes(q) ||
        id.includes(q)
      );
    });
  }, [customers, searchQuery, accountFilter]);

  const totalB2C = useMemo(
    () =>
      customers.filter((c) => (c.tipeAkun || 'B2C').toUpperCase() === 'B2C')
        .length,
    [customers]
  );
  const totalB2B = useMemo(
    () =>
      customers.filter((c) => (c.tipeAkun || '').toUpperCase() === 'B2B')
        .length,
    [customers]
  );

  return (
    <div className="lezzat-shell">
      <AdminSidebar />

      <main className="lezzat-main space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#4737FF] uppercase">
              FROZNFOOD 2.0 • CUSTOMER MANAGEMENT
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              Data Pelanggan B2C & Mitra B2B
            </h1>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#4737FF] ${
                isFetching ? 'animate-spin' : ''
              }`}
            />
            <span>Muat Ulang Data</span>
          </button>
        </div>

        {/* Kartu Ringkasan Pelanggan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#4737FF]/10 text-[#4737FF] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">
                Total Pelanggan Terdaftar
              </span>
              <span className="font-heading text-xl font-extrabold text-slate-800">
                {customers.length} akun
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#159A68] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">
                Pelanggan Retail (B2C)
              </span>
              <span className="font-heading text-xl font-extrabold text-slate-800">
                {totalB2C} akun
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#F75C03]/10 text-[#F75C03] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">
                Mitra Usaha / Grosir (B2B)
              </span>
              <span className="font-heading text-xl font-extrabold text-slate-800">
                {totalB2B} mitra
              </span>
            </div>
          </div>
        </div>

        {/* Bar Pencarian & Filter Tipe Akun */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Input Search Pelanggan */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pelanggan, email, no. HP, alamat, atau nama usaha..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white pl-10 pr-9 py-2.5 text-xs text-slate-800 focus:border-[#4737FF] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tipe Akun */}
            <div className="flex items-center gap-1.5">
              {(['ALL', 'B2C', 'B2B'] as const).map((tab) => {
                const isActive = accountFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAccountFilter(tab)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#4737FF] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'ALL'
                      ? `Semua (${customers.length})`
                      : tab === 'B2C'
                        ? `B2C Retail (${totalB2C})`
                        : `B2B Mitra (${totalB2B})`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Menampilkan{' '}
              <strong className="text-slate-800">
                {filteredCustomers.length}
              </strong>{' '}
              dari {customers.length} pelanggan
            </span>
            {(searchQuery || accountFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setAccountFilter('ALL');
                }}
                className="text-xs font-bold text-[#4737FF] hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {actionError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600 font-medium">
              {actionError}
            </div>
          )}

          {isLoading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-14 rounded-xl bg-slate-100" />
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center space-y-2">
              <AlertCircle className="w-7 h-7 text-red-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                Gagal Memuat Data Pelanggan
              </p>
              <p className="text-xs text-slate-500">
                {getErrorMessage(error, 'Pastikan Anda masuk sebagai Admin.')}
              </p>
            </div>
          )}

          {!isLoading && !isError && filteredCustomers.length === 0 && (
            <div className="rounded-xl bg-slate-50 p-8 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                Data Pelanggan Tidak Ditemukan
              </p>
              <p className="text-xs text-slate-500">
                Tidak ada pelanggan yang cocok dengan kata kunci &quot;
                {searchQuery}&quot;.
              </p>
            </div>
          )}

          {!isLoading && !isError && filteredCustomers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 font-bold">Nama Pelanggan</th>
                    <th className="py-3 px-3 font-bold">Tipe Akun</th>
                    <th className="py-3 px-3 font-bold">Kontak</th>
                    <th className="py-3 px-3 font-bold">Alamat</th>
                    <th className="py-3 px-3 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const id = getCustomerId(c);
                    const isB2B = (c.tipeAkun || '').toUpperCase() === 'B2B';
                    const phone = c.noHp || c.noTelp || '-';

                    return (
                      <tr
                        key={id || c.email}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-slate-800">{c.nama}</p>
                          {c.namaPerusahaan && (
                            <p className="text-[11px] text-[#4737FF] font-semibold">
                              {c.namaPerusahaan}
                            </p>
                          )}
                          {id && (
                            <p className="text-[10px] font-mono text-slate-400">
                              ID: {id}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              isB2B
                                ? 'bg-[#F75C03]/15 text-[#F75C03]'
                                : 'bg-[#4737FF]/10 text-[#4737FF]'
                            }`}
                          >
                            {isB2B ? 'B2B Mitra' : 'B2C Retail'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{c.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{phone}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 max-w-xs">
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {c.alamat || 'Belum dilengkapi'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            disabled={!id || deletingId === id}
                            onClick={() => handleDeleteCustomer(c)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {deletingId === id ? 'Menghapus...' : 'Hapus'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}