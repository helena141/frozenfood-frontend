'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Snowflake, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '@/lib/axios';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { AuthResponse } from '@/types/api';

const registerSchema = z.object({
  nama: z.string().min(1, 'Nama tidak boleh kosong'),
  email: z
    .string()
    .min(1, 'Email tidak boleh kosong')
    .email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  noTelp: z.string().min(1, 'Nomor telepon tidak boleh kosong'),
  alamat: z.string().min(1, 'Alamat tidak boleh kosong'),
  tipeAkun: z.enum(['B2C', 'B2B'], {
    required_error: 'Tipe akun wajib diisi (B2C atau B2B)',
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setLogin = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nama: '',
      email: '',
      password: '',
      noTelp: '',
      alamat: '',
      tipeAkun: 'B2C',
    },
  });

  const selectedTipeAkun = watch('tipeAkun');

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', values);
      const userData = response.data;
      if (userData?.token) {
        setLogin(userData);
        router.push('/');
      } else {
        router.push('/login');
      }
    } catch (error) {
      setServerError(getErrorMessage(error, 'Gagal mendaftarkan akun.'));
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Panel Kiri: Konsisten dengan Login Figma */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-[#174634] text-white overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Snowflake className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="block font-serif-title text-2xl font-bold leading-none">
              Lezzat
            </span>
            <span className="block text-[10px] tracking-[0.22em] text-emerald-100/80 uppercase mt-1">
              FROZEN FOOD
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium tracking-wider uppercase mb-6">
            <Snowflake className="w-3.5 h-3.5 text-emerald-300" />
            <span>GABUNG BERSAMA LEZZAT</span>
          </div>
          <h1 className="font-serif-title text-5xl font-bold leading-[1.12] tracking-tight mb-6">
            Belanja eceran maupun grosir lebih praktis.
          </h1>
          <p className="text-emerald-50/85 text-base leading-relaxed max-w-md">
            Daftar sebagai pelanggan rumah tangga (B2C) atau mitra usaha kuliner (B2B) untuk menikmati pengiriman rantai dingin yang terjaga.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-8 pt-6 border-t border-white/15 max-w-md">
          <div>
            <p className="font-serif-title text-2xl font-bold">86+</p>
            <p className="text-xs text-emerald-100/75 mt-1">Pilihan produk</p>
          </div>
          <div>
            <p className="font-serif-title text-2xl font-bold">4.9</p>
            <p className="text-xs text-emerald-100/75 mt-1">Rating pelanggan</p>
          </div>
          <div>
            <p className="font-serif-title text-2xl font-bold">24h</p>
            <p className="text-xs text-emerald-100/75 mt-1">Pengiriman cepat</p>
          </div>
        </div>
      </div>

      {/* Panel Kanan: Form Registrasi */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-20 bg-white">
        <div className="w-full max-w-md mx-auto">
          <p className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase mb-2">
            BUAT AKUN BARU
          </p>
          <h2 className="font-serif-title text-3xl font-bold text-slate-900 mb-2">
            Daftar akun Lezzat
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Lengkapi data di bawah ini untuk mulai memesan.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Pilihan Tipe Akun (B2C / B2B) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Tipe Akun
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('tipeAkun', 'B2C')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    selectedTipeAkun === 'B2C'
                      ? 'border-[#174634] bg-[#174634]/10 text-[#174634]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Pelanggan Ritel (B2C)
                </button>
                <button
                  type="button"
                  onClick={() => setValue('tipeAkun', 'B2B')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    selectedTipeAkun === 'B2B'
                      ? 'border-[#174634] bg-[#174634]/10 text-[#174634]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Mitra Usaha (B2B)
                </button>
              </div>
              {errors.tipeAkun && (
                <p className="mt-1 text-xs text-red-600">{errors.tipeAkun.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="nama" className="block text-xs font-medium text-slate-700 mb-1.5">
                Nama Lengkap
              </label>
              <input
                id="nama"
                type="text"
                placeholder="Nadia Rahma"
                {...register('nama')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none"
              />
              {errors.nama && (
                <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="halo@lezzat.id"
                  {...register('email')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="noTelp" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nomor Telepon
                </label>
                <input
                  id="noTelp"
                  type="tel"
                  placeholder="081234567890"
                  {...register('noTelp')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none"
                />
                {errors.noTelp && (
                  <p className="mt-1 text-xs text-red-600">{errors.noTelp.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1.5">
                Kata Sandi (Min. 6 karakter)
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="alamat" className="block text-xs font-medium text-slate-700 mb-1.5">
                Alamat Lengkap
              </label>
              <textarea
                id="alamat"
                rows={2}
                placeholder="Jl. Merdeka No. 10, Kecamatan..."
                {...register('alamat')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#174634] focus:outline-none"
              />
              {errors.alamat && (
                <p className="mt-1 text-xs text-red-600">{errors.alamat.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-60 text-white font-medium py-3.5 px-5 text-sm transition-colors cursor-pointer"
            >
              <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftar Sekarang'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold text-[#174634] hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}