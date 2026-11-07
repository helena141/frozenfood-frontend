'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Snowflake,
  Home,
  Search,
  ShoppingBag,
  Heart,
  Store,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function ShopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'Beranda', href: '/', icon: Home, active: pathname === '/' },
    {
      label: 'Jelajahi',
      href: '/#katalog',
      icon: Search,
      active: pathname.startsWith('/products'),
    },
    {
      label: 'Pesanan',
      href: '/checkout',
      icon: ShoppingBag,
      active: pathname.startsWith('/orders') || pathname === '/checkout',
    },
    { label: 'Favorit', href: '/#populer', icon: Heart, active: false },
  ];

  return (
    <aside className="lezzat-sidebar">
      <div>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-full bg-[#174634] flex items-center justify-center text-white shadow-sm">
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-serif-title text-2xl font-bold text-slate-900 leading-none">
              Lezzat
            </span>
            <span className="block text-[9px] font-semibold tracking-[0.22em] text-slate-400 uppercase mt-1">
              FROZEN FOOD
            </span>
          </div>
        </Link>

        {/* Menu Utama */}
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase px-3 mb-3">
          MENU UTAMA
        </p>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-[#174634] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bagian Bawah: Kartu Mitra B2B & Tombol Akun */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#f2efe9] p-4">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#174634] mb-3 shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-900 mb-1">
            Punya usaha kuliner?
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
            Dapatkan harga khusus mitra.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#174634] hover:underline"
          >
            <span>Pelajari</span>
            <span>→</span>
          </Link>
        </div>

        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar akun ({user.nama})</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#174634] hover:underline"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk ke akun</span>
          </Link>
        )}
      </div>
    </aside>
  );
}