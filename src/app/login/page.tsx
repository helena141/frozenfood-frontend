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
  ShieldCheck,
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#F8FAFF]">
      {/* Panel Kiri: Froznfood 2.0 Signature Gradient Branding */}
      <div className="hidden lg:flex flex-col justify-between ff-hero-gradient text-white p-12 xl:p-16 relative overflow-hidden">
        <Link href="/" className="inline-flex items-center gap-3 w-fit">
          <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs">
            <Snowflake className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-heading text-xl font-extrabold tracking-tight block leading-none">
              Froznfood
            </span>
            <span className="text-[10px] tracking-[0.22em] uppercase text-[#ACA5FF] font-bold mt-1 block">
              FRESHNESS IN EVERY BITE
            </span>
          </div>
        </Link>

        <div className="my-auto max-w-lg space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFB36B]" />
            <span>MODERN PREMIUM FROZEN MARKETPLACE</span>
          </div>

          <h1 className="font-heading text-4xl xl:text-5xl font-extrabold leading-[1.12] tracking-tight">
            Lezzat Frozen Food.
          </h1>

          <p className="text-sm text-white/85 leading-relaxed max-w-md">
            Pilihan frozen food berkualitas tinggi untuk keluarga dan mitra
            kuliner dengan jaminan rantai dingin serta pengiriman cepat.
          </p>
        </div>

        <div className="pt-8 border-t border-white/15 grid grid-cols-3 gap-6 max-w-md">
          <div>
            <p className="font-heading text-2xl font-extrabold text-white">
              -18°C
            </p>
            <p className="text-xs text-white/75 mt-0.5">Cold Chain Terjaga</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-extrabold text-white">
              Ramah di kantong
            </p>
            <p className="text-xs text-white/75 mt-0.5">Selalu yang termurah</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-extrabold text-white">
              B2C & B2B
            </p>
            <p className="text-xs text-white/75 mt-0.5">Harga Ecer & Grosir</p>
          </div>
        </div>
      </div>

      {/* Panel Kanan: Form Login Froznfood 2.0 */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#4737FF]">
              SELAMAT DATANG DI LEZZAT FROZEN FOOD 
            </p>
            <h2 className="font-heading text-3xl font-extrabold text-[#171725] mt-1">
              Masuk ke akunmu
            </h2>
            <p className="text-xs text-[#77788A] mt-1.5">
              Nikmati kemudahan belanja frozen food favoritmu setiap hari.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-[#E5484D]/30 bg-[#E5484D]/10 p-3.5 text-xs text-[#E5484D] font-medium"
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
                className="block text-xs font-semibold text-[#171725] mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  {...register('email')}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-3 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none transition-colors"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-[#E5484D]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#171725] mb-1.5"
              >
                Kata sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-10 py-3 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#77788A] hover:text-[#171725] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#E5484D]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="remember"
                type="checkbox"
                defaultChecked
                className="w-3.5 h-3.5 rounded accent-[#4737FF]"
              />
              <label
                htmlFor="remember"
                className="text-xs text-[#77788A] select-none cursor-pointer"
              >
                Ingat sesi masuk saya
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] disabled:opacity-60 text-white font-bold py-3.5 px-5 text-xs transition-all cursor-pointer shadow-md shadow-[#4737FF]/20"
            >
              <span>{isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-[#E6E8F0]" />
            <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-[#77788A]">
              ATAU MASUK DENGAN GOOGLE
            </span>
            <div className="grow border-t border-[#E6E8F0]" />
          </div>

          <GoogleLoginButton onErrorMessage={(msg) => setServerError(msg)} />

          <div className="pt-1 space-y-3">
            <div className="relative flex items-center">
              <div className="grow border-t border-[#E6E8F0]" />
              <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-[#77788A]">
                MODE DEMO
              </span>
              <div className="grow border-t border-[#E6E8F0]" />
            </div>

            <button
              type="button"
              onClick={() => setShowDemoAccounts((prev) => !prev)}
              className="w-full rounded-xl border border-[#E6E8F0] hover:bg-[#F8FAFF] py-2.5 px-4 text-xs font-semibold text-[#171725] transition-colors cursor-pointer"
            >
              {showDemoAccounts ? 'Sembunyikan akun demo' : 'Lihat akun demo'}
            </button>

            {showDemoAccounts && (
              <div className="rounded-2xl border border-[#E6E8F0] bg-[#F8FAFF] p-3 space-y-2 text-xs">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleFillDemo(acc.email, acc.password)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E6E8F0] hover:border-[#4737FF] text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-[#171725]">{acc.label}</p>
                      <p className="text-[11px] text-[#77788A]">{acc.email}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#4737FF] bg-[#E7EFFF] px-2.5 py-1 rounded-lg">
                      Isi Otomatis
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[#77788A] pt-2">
            Belum punya akun?{' '}
            <Link
              href="/register"
              className="font-bold text-[#F75C03] hover:underline"
            >
              Daftar gratis sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}