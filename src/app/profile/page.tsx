'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Camera,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  LogIn,
  X,
  Mail,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth-store';
import { CustomerResponse, CustomerUpdateRequest } from '@/types/api';
import { getErrorMessage, formatDateTimeId } from '@/lib/utils';
import ShopSidebar from '@/components/shop/sidebar';
import CartPanel from '@/components/shop/cart-panel';

const profileSchema = z.object({
  nama: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  noTelp: z.string().min(8, 'Nomor telepon minimal 8 digit'),
  alamat: z.string().min(5, 'Alamat lengkap minimal 5 karakter'),
  passwordBaru: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: 'Password baru minimal 6 karakter',
    }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, login, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? user : null;

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CustomerResponse>({
    queryKey: ['customer-me', activeUser?.idUser],
    enabled: Boolean(activeUser),
    queryFn: async () => {
      const res = await api.get<CustomerResponse>('/api/customers/me');
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nama: '',
      email: '',
      noTelp: '',
      alamat: '',
      passwordBaru: '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        nama: profile.nama || '',
        email: profile.email || '',
        noTelp: profile.noTelp || '',
        alamat: profile.alamat || '',
        passwordBaru: '',
      });
    }
  }, [profile, reset]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    setActionError(null);
    setActionSuccess(null);

    const payload: CustomerUpdateRequest = {
      nama: values.nama.trim(),
      email: values.email.trim(),
      noTelp: values.noTelp.trim(),
      alamat: values.alamat.trim(),
      passwordBaru:
        values.passwordBaru && values.passwordBaru.trim() !== ''
          ? values.passwordBaru.trim()
          : undefined,
    };

    try {
      const res = await api.put<CustomerResponse>(
        '/api/customers/me',
        payload
      );
      if (activeUser) {
        login({
          ...activeUser,
          nama: res.data.nama,
          email: res.data.email,
        });
      }
      setActionSuccess('Profil akun Anda berhasil diperbarui.');
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal memperbarui data profil pelanggan.')
      );
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionError(null);
    setActionSuccess(null);
    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.put<CustomerResponse>('/api/customers/me/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setActionSuccess('Foto profil berhasil diperbarui.');
      await refetch();
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          'Gagal mengunggah foto profil. Pastikan file berupa gambar JPG/PNG/WEBP maksimal 2MB.'
        )
      );
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeactivateAccount = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsDeactivating(true);

    try {
      await api.delete('/api/customers/me');
      setShowDeactivateModal(false);
      logout();
      router.push('/login');
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Gagal menonaktifkan akun pelanggan.')
      );
      setShowDeactivateModal(false);
    } finally {
      setIsDeactivating(false);
    }
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const photoUrl =
    profile?.fotoProfil && profile.fotoProfil.startsWith('/')
      ? `${baseUrl}${profile.fotoProfil}`
      : profile?.fotoProfil || null;

  return (
    <div className="lezzat-shell">
      <ShopSidebar />

      <main className="lezzat-main">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
            PENGATURAN AKUN PELANGGAN
          </p>
          <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900">
            Profil Saya
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola informasi pribadi, alamat pengiriman, foto profil, dan
            keamanan akun Anda.
          </p>
        </div>

        {/* Belum Login */}
        {mounted && !activeUser && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Anda Belum Masuk ke Akun
            </h2>
            <p className="text-xs text-slate-500 mb-5 max-w-md mx-auto">
              Silakan masuk terlebih dahulu untuk melihat dan mengubah profil
              pelanggan Anda.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#174634] text-white text-xs font-semibold hover:bg-[#113527]"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk ke Akun</span>
            </Link>
          </div>
        )}

        {/* Sudah Login */}
        {activeUser && (
          <>
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

            {isLoading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-32 rounded-3xl bg-white border border-slate-100" />
                <div className="h-80 rounded-3xl bg-white border border-slate-100" />
              </div>
            )}

            {!isLoading && isError && (
              <div className="rounded-3xl bg-red-50 border border-red-200 p-6 text-center">
                <AlertCircle className="w-7 h-7 text-red-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900 mb-1">
                  Gagal Memuat Profil
                </p>
                <p className="text-xs text-slate-600 mb-4">
                  {getErrorMessage(error, 'Tidak dapat mengambil data profil.')}
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

            {!isLoading && !isError && profile && (
              <div className="space-y-6">
                {/* Kartu Foto Profil & Ringkasan Akun */}
                <section className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-full bg-[#f2efe9] border-2 border-[#174634]/20 overflow-hidden flex items-center justify-center text-[#174634] shrink-0">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrl}
                          alt={profile.nama}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 opacity-60" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {profile.nama}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f2efe9] text-[#174634] text-[10px] font-bold uppercase">
                          Akun {profile.tipeAkun}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {profile.email}
                      </p>
                      {profile.createdAt && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Bergabung sejak {formatDateTimeId(profile.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#174634]" />
                      <span>
                        {isUploadingPhoto
                          ? 'Mengunggah Foto...'
                          : 'Ganti Foto Profil'}
                      </span>
                    </button>
                  </div>
                </section>

                {/* Form Edit Profil */}
                <section className="bg-white rounded-3xl p-6 border border-slate-200">
                  <div className="pb-4 mb-5 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">
                      Informasi Pribadi & Alamat Pengiriman
                    </h2>
                    <p className="text-xs text-slate-500">
                      Perubahan akan langsung tersimpan ke database melalui{' '}
                      <code>PUT /api/customers/me</code>
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit(onSubmitProfile)}
                    noValidate
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Nama Lengkap / Nama Usaha *</span>
                        </label>
                        <input
                          type="text"
                          {...register('nama')}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                        />
                        {errors.nama && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.nama.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>Alamat Email *</span>
                        </label>
                        <input
                          type="email"
                          {...register('email')}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                        />
                        {errors.email && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>Nomor Telepon / WhatsApp *</span>
                        </label>
                        <input
                          type="tel"
                          {...register('noTelp')}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                        />
                        {errors.noTelp && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.noTelp.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Password Baru (Opsional)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Kosongkan jika tidak ingin ganti password"
                          {...register('passwordBaru')}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                        />
                        {errors.passwordBaru && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.passwordBaru.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Alamat Lengkap Pengiriman *</span>
                      </label>
                      <textarea
                        rows={3}
                        {...register('alamat')}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#174634] focus:outline-none"
                      />
                      {errors.alamat && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.alamat.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </span>
                      </button>
                    </div>
                  </form>
                </section>

                {/* Zona Berbahaya: Nonaktifkan Akun */}
                <section className="bg-red-50/60 rounded-3xl p-6 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Nonaktifkan Akun Pelanggan
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Menonaktifkan akun akan mengeluarkan Anda dari sesi saat
                        ini (<code>DELETE /api/customers/me</code>).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDeactivateModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Nonaktifkan Akun</span>
                  </button>
                </section>
              </div>
            )}
          </>
        )}

        {/* Modal Konfirmasi Nonaktifkan Akun */}
        {showDeactivateModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Nonaktifkan Akun Anda?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Akun Anda akan dinonaktifkan secara soft-delete dan Anda
                    tidak dapat masuk kembali menggunakan kredensial ini.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeactivating}
                  onClick={() => setShowDeactivateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeactivating}
                  onClick={handleDeactivateAccount}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {isDeactivating
                    ? 'Memproses...'
                    : 'Ya, Nonaktifkan Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <CartPanel />
    </div>
  );
}
