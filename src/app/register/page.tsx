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
  User,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  ShoppingBag,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { AuthResponse } from '@/types/api';
import GoogleLoginButton from '@/components/auth/google-login-button';

const registerSchema = z.object({
  nama: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  noTelp: z.string().min(8, 'Nomor telepon minimal 8 digit'),
  alamat: z.string().min(5, 'Alamat lengkap minimal 5 karakter'),
  tipeAkun: z.enum(['B2C', 'B2B']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      const response = await api.post<AuthResponse>('/api/auth/register', {
        nama: values.nama.trim(),
        email: values.email.trim(),
        password: values.password,
        noTelp: values.noTelp.trim(),
        alamat: values.alamat.trim(),
        tipeAkun: values.tipeAkun,
      });

      const authData = response.data;
      if (authData && authData.token) {
        login(authData);
        router.push('/');
      } else {
        router.push('/login');
      }
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          'Gagal mendaftarkan akun. Pastikan email belum terdaftar.'
        )
      );
    }
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
            <span>GABUNG BERSAMA FROZNFOOD 2.0</span>
          </div>

          <h1 className="font-heading text-4xl xl:text-5xl font-extrabold leading-[1.12] tracking-tight">
            Belanja Ritel & Mitra Grosir Lebih Praktis.
          </h1>

          <p className="text-sm text-white/85 leading-relaxed max-w-md">
            Daftarkan akun keluarga (B2C) atau akun usaha kuliner (B2B) untuk
            menikmati stok segar berstandar rantai dingin -18°C setiap hari.
          </p>
        </div>

        <div className="pt-8 border-t border-white/15 grid grid-cols-3 gap-6 max-w-md">
          <div>
            <p className="font-heading text-2xl font-extrabold text-white">
              Gratis
            </p>
            <p className="text-xs text-white/75 mt-0.5">Ongkir ≤ 5 km</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-extrabold text-white">
              FEFO
            </p>
            <p className="text-xs text-white/75 mt-0.5">Jaminan Batch Segar</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-extrabold text-white">
              Nota PDF
            </p>
            <p className="text-xs text-white/75 mt-0.5">Invoice Otomatis</p>
          </div>
        </div>
      </div>

      {/* Panel Kanan: Form Registrasi Froznfood 2.0 */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#4737FF]">
              REGISTRASI PELANGGAN BARU
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#171725] mt-1">
              Buat Akun Froznfood
            </h2>
            <p className="text-xs text-[#77788A] mt-1">
              Lengkapi data di bawah untuk mulai memesan produk pilihan.
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
            className="space-y-3.5"
            noValidate
          >
            {/* Pilihan Tipe Akun B2C / B2B */}
            <div>
              <label className="block text-xs font-semibold text-[#171725] mb-1.5">
                Pilih Jenis Akun
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setValue('tipeAkun', 'B2C')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    selectedTipeAkun === 'B2C'
                      ? 'border-[#4737FF] bg-[#E7EFFF]/60'
                      : 'border-[#E6E8F0] bg-[#F8FAFF] hover:border-[#ACA5FF]'
                  }`}
                >
                  <ShoppingBag
                    className={`w-4 h-4 shrink-0 ${
                      selectedTipeAkun === 'B2C'
                        ? 'text-[#4737FF]'
                        : 'text-[#77788A]'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-extrabold text-[#171725]">
                      Retail (B2C)
                    </p>
                    <p className="text-[10px] text-[#77788A]">
                      Belanja rumah tangga
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('tipeAkun', 'B2B')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    selectedTipeAkun === 'B2B'
                      ? 'border-[#F75C03] bg-[#F75C03]/10'
                      : 'border-[#E6E8F0] bg-[#F8FAFF] hover:border-[#ACA5FF]'
                  }`}
                >
                  <Building2
                    className={`w-4 h-4 shrink-0 ${
                      selectedTipeAkun === 'B2B'
                        ? 'text-[#F75C03]'
                        : 'text-[#77788A]'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-extrabold text-[#171725]">
                      Mitra Usaha (B2B)
                    </p>
                    <p className="text-[10px] text-[#77788A]">
                      Resto, kafe & reseller
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="nama"
                className="block text-xs font-semibold text-[#171725] mb-1"
              >
                Nama Lengkap / Nama Usaha *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="nama"
                  type="text"
                  placeholder="Contoh: Budi Santoso / Warung Dimsum Berkah"
                  {...register('nama')}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2.5 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none"
                />
              </div>
              {errors.nama && (
                <p className="mt-1 text-xs text-[#E5484D]">
                  {errors.nama.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-[#171725] mb-1"
                >
                  Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    {...register('email')}
                    className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2.5 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none"
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
                  htmlFor="noTelp"
                  className="block text-xs font-semibold text-[#171725] mb-1"
                >
                  No. WhatsApp / Telepon *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="noTelp"
                    type="tel"
                    placeholder="081234567890"
                    {...register('noTelp')}
                    className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2.5 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none"
                  />
                </div>
                {errors.noTelp && (
                  <p className="mt-1 text-xs text-[#E5484D]">
                    {errors.noTelp.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#171725] mb-1"
              >
                Kata Sandi *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#77788A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  {...register('password')}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-10 py-2.5 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none"
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

            <div>
              <label
                htmlFor="alamat"
                className="block text-xs font-semibold text-[#171725] mb-1"
              >
                Alamat Lengkap Pengiriman *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#77788A] absolute left-3.5 top-3 pointer-events-none" />
                <textarea
                  id="alamat"
                  rows={2}
                  placeholder="Jl. Kaliurang Km 5, Sleman, Yogyakarta..."
                  {...register('alamat')}
                  className="w-full rounded-xl border border-[#E6E8F0] bg-[#F8FAFF] focus:bg-white pl-10 pr-3.5 py-2.5 text-xs text-[#171725] focus:border-[#4737FF] focus:outline-none"
                />
              </div>
              {errors.alamat && (
                <p className="mt-1 text-xs text-[#E5484D]">
                  {errors.alamat.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#F75C03] hover:bg-[#D94800] disabled:opacity-60 text-white font-extrabold py-3.5 px-5 text-xs transition-all cursor-pointer shadow-md shadow-[#F75C03]/25"
            >
              <span>
                {isSubmitting ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-[#E6E8F0]" />
            <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-[#77788A]">
              ATAU DAFTAR DENGAN GOOGLE
            </span>
            <div className="grow border-t border-[#E6E8F0]" />
          </div>

          <GoogleLoginButton onErrorMessage={(msg) => setServerError(msg)} />

          <p className="text-center text-xs text-[#77788A] pt-1">
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className="font-bold text-[#4737FF] hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}