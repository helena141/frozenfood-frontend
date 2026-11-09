'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Snowflake,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { AuthResponse } from '@/types/api';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email tidak boleh kosong')
    .email('Format email tidak valid'),
  password: z.string().min(1, 'Password tidak boleh kosong'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setLogin = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDemoInfo, setShowDemoInfo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', values);
      const userData = response.data;
      setLogin(userData);

      if (userData.tipeAkun === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    } catch (error) {
      setServerError(getErrorMessage(error, 'Email atau kata sandi salah.'));
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Panel Kiri: Branding & Visual Hijau Tua */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-[#174634] text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1200&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#174634]/95 via-[#174634]/85 to-[#0f2e22]/90 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Snowflake className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="block font-serif-title text-2xl font-bold leading-none tracking-tight">
              Lezzat
            </span>
            <span className="block text-[10px] tracking-[0.22em] text-emerald-100/80 uppercase mt-1">
              FROZEN FOOD
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-medium tracking-wider uppercase mb-6">
            <Snowflake className="w-3.5 h-3.5 text-emerald-300" />
            <span>SELALU SEGAR, SELALU LEZZAT</span>
          </div>

          <h1 className="font-serif-title text-5xl xl:text-6xl font-bold leading-[1.12] tracking-tight mb-6">
            Stok makanan enak, siap kapan saja.
          </h1>

          <p className="text-emerald-50/85 text-base xl:text-lg leading-relaxed max-w-md">
            Pilihan frozen food premium untuk momen makan yang lebih praktis
            bersama keluarga.
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

      {/* Panel Kanan: Form Login */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-full bg-[#174634] flex items-center justify-center text-white">
              <Snowflake className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif-title text-xl font-bold text-[#174634] block leading-none">
                Lezzat
              </span>
              <span className="text-[9px] tracking-[0.2em] text-slate-500 uppercase">
                FROZEN FOOD
              </span>
            </div>
          </div>

          <p className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase mb-2">
            SELAMAT DATANG
          </p>
          <h2 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Masuk ke akunmu
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Nikmati kemudahan belanja frozen food favoritmu.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="halo@lezzat.id"
                  {...register('email')}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#174634] focus:outline-none focus:ring-2 focus:ring-[#174634]/15"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-700 mb-2"
              >
                Kata sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#174634] focus:outline-none focus:ring-2 focus:ring-[#174634]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan kata sandi'
                      : 'Tampilkan kata sandi'
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-[#174634] focus:ring-[#174634]"
                />
                <span>Ingat saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-60 text-white font-medium py-3.5 px-5 text-sm transition-colors cursor-pointer"
            >
              <span>{isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Hanya tampil bila NEXT_PUBLIC_DEMO_MODE === 'true' */}
          {isDemoMode && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-white px-3 text-slate-400">
                    MODE DEMO
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDemoInfo((prev) => !prev)}
                className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 text-sm transition-colors cursor-pointer"
              >
                Lihat akun demo
              </button>

              {showDemoInfo && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-2">
                  <p className="font-medium text-slate-800">
                    Isi cepat email akun demo (Mode Demo Aktif):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('email', 'halo@lezzat.id');
                        setValue('password', 'password123');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#174634] text-slate-700 cursor-pointer"
                    >
                      Isi halo@lezzat.id
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            Belum punya akun?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#174634] hover:underline"
            >
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}