'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

function ShopSidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? user : null;

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
      href: '/orders',
      icon: ShoppingBag,
      active: pathname.startsWith('/orders') || pathname === '/checkout',
    },
    { label: 'Favorit', href: '/#populer', icon: Heart, active: false },
  ];

  return (
    <aside className="lezzat-sidebar">
      <div>
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

        {activeUser && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#174634] bg-[#f2efe9] hover:bg-slate-200/70 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Buka Panel Admin</span>
            </Link>
          </div>
        )}
      </div>

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

        {activeUser ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar akun ({activeUser.nama})</span>
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

export default function ShopSidebar() {
  return (
    <Suspense fallback={<aside className="lezzat-sidebar" />}>
      <ShopSidebarInner />
    </Suspense>
  );
}