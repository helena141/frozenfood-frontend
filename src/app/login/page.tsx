'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Snowflake,
  ArrowRight,
  AlertCircle,
  Lock,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { AuthResponse } from '@/types/api';
import GoogleLoginButton from '@/components/auth/google-login-button';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  {
    label: 'Admin Gudang / Toko',
    email: 'admin@lezzat.id',
    password: 'password123',
  },
  {
    label: 'Pelanggan Retail (B2C)',
    email: 'budi@gmail.com',
    password: 'password123',
  },
  {
    label: 'Mitra Bisnis / Resto (B2B)',
    email: 'mitra@kuliner.id',
    password: 'password123',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', values);
      const authData = response.data;
      login(authData);

      if (authData.tipeAkun === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          'Gagal masuk. Periksa kembali email dan kata sandi Anda.'
        )
      );
    }
  };

  const handleFillDemo = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Panel Kiri: Branding Hijau Tua Lezzat Frozen Food */}
      <div className="hidden lg:flex flex-col justify-between bg-[#174634] text-white p-12 xl:p-16 relative overflow-hidden">
        {/* Logo Atas */}
        <Link href="/" className="inline-flex items-center gap-3 w-fit">
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
            <Snowflake className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <span className="font-serif-title text-xl font-bold tracking-tight block leading-none">
              Lezzat
            </span>
            <span className="text-[10px] tracking-[0.22em] uppercase text-emerald-200/80 font-semibold mt-1 block">
              FROZEN FOOD
            </span>
          </div>
        </Link>

        {/* Konten Tengah */}
        <div className="my-auto max-w-lg space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold tracking-wider uppercase text-emerald-100">
            <Snowflake className="w-3.5 h-3.5 text-emerald-300" />
            <span>SELALU SEGAR, SELALU LEZZAT</span>
          </div>

          <h1 className="font-serif-title text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight">
            Stok makanan enak, siap kapan saja.
          </h1>

          <p className="text-sm text-emerald-100/80 leading-relaxed max-w-md">
            Pilihan frozen food premium untuk momen makan yang lebih praktis
            bersama keluarga.
          </p>
        </div>

        {/* Statistik Bawah */}
        <div className="pt-8 border-t border-white/15 grid grid-cols-3 gap-6 max-w-md">
          <div>
            <p className="font-serif-title text-2xl font-bold text-white">86+</p>
            <p className="text-xs text-emerald-100/70 mt-0.5">Pilihan produk</p>
          </div>
          <div>
            <p className="font-serif-title text-2xl font-bold text-white">4.9</p>
            <p className="text-xs text-emerald-100/70 mt-0.5">Rating pelanggan</p>
          </div>
          <div>
            <p className="font-serif-title text-2xl font-bold text-white">24h</p>
            <p className="text-xs text-emerald-100/70 mt-0.5">Pengiriman cepat</p>
          </div>
        </div>
      </div>

      {/* Panel Kanan: Form Login + Tombol Google */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              SELAMAT DATANG
            </p>
            <h2 className="font-serif-title text-3xl font-bold text-slate-900 mt-1">
              Masuk ke akunmu
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Nikmati kemudahan belanja frozen food favoritmu.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  {...register('email')}
                  className="w-full rounded-xl border border-slate-200 bg-[#eef3fb]/60 focus:bg-white pl-10 pr-3.5 py-3 text-xs text-slate-900 focus:border-[#174634] focus:outline-none transition-colors"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Kata sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-xl border border-slate-200 bg-[#eef3fb]/60 focus:bg-white pl-10 pr-10 py-3 text-xs text-slate-900 focus:border-[#174634] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="remember"
                type="checkbox"
                defaultChecked
                className="w-3.5 h-3.5 rounded accent-[#174634]"
              />
              <label
                htmlFor="remember"
                className="text-xs text-slate-500 select-none cursor-pointer"
              >
                Ingat saya
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#174634] hover:bg-[#113527] disabled:opacity-60 text-white font-semibold py-3.5 px-5 text-xs transition-colors cursor-pointer shadow-xs"
            >
              <span>{isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Pembatas & Tombol Login Google */}
          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-slate-200" />
            <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              ATAU MASUK DENGAN GOOGLE
            </span>
            <div className="grow border-t border-slate-200" />
          </div>

          <GoogleLoginButton onErrorMessage={(msg) => setServerError(msg)} />

          {/* Mode Demo */}
          <div className="pt-1 space-y-3">
            <div className="relative flex items-center">
              <div className="grow border-t border-slate-100" />
              <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                MODE DEMO
              </span>
              <div className="grow border-t border-slate-100" />
            </div>

            <button
              type="button"
              onClick={() => setShowDemoAccounts((prev) => !prev)}
              className="w-full rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 px-4 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
            >
              {showDemoAccounts ? 'Sembunyikan akun demo' : 'Lihat akun demo'}
            </button>

            {showDemoAccounts && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleFillDemo(acc.email, acc.password)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-[#174634] text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{acc.label}</p>
                      <p className="text-[11px] text-slate-500">{acc.email}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#174634] bg-emerald-50 px-2 py-1 rounded-lg">
                      Isi Otomatis
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 pt-2">
            Belum punya akun?{' '}
            <Link
              href="/register"
              className="font-bold text-[#174634] hover:underline"
            >
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}