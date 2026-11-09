'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Snowflake,
  BarChart3,
  Truck,
  Package,
  Store,
  LogOut,
  LogIn,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

function AdminSidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    {
      label: 'Laporan & Omzet',
      href: '/admin/dashboard',
      icon: BarChart3,
      active: pathname === '/admin/dashboard',
    },
    {
      label: 'Kelola Pengiriman',
      href: '/admin/deliveries',
      icon: Truck,
      active: pathname.startsWith('/admin/deliveries'),
    },
    {
      label: 'Kelola Produk',
      href: '/admin/products',
      icon: Package,
      active: pathname.startsWith('/admin/products'),
    },
  ];

  return (
    <aside className="lezzat-sidebar">
      <div>
        {/* Brand Logo Admin */}
        <Link href="/admin/dashboard" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-full bg-[#174634] flex items-center justify-center text-white shadow-sm">
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-serif-title text-2xl font-bold text-slate-900 leading-none">
              Lezzat
            </span>
            <span className="block text-[9px] font-semibold tracking-[0.22em] text-[#174634] uppercase mt-1">
              PANEL ADMIN
            </span>
          </div>
        </Link>

        {/* Menu Navigasi Admin */}
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase px-3 mb-3">
          MENU MANAJEMEN
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

        <div className="mt-6 pt-6 border-t border-slate-100">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#174634] bg-[#f2efe9] hover:bg-slate-200/70 transition-colors"
          >
            <Store className="w-4 h-4" />
            <span>Lihat Katalog Pelanggan</span>
          </Link>
        </div>
      </div>

      {/* Bagian Bawah: Catatan Batasan Peran & Akun */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-3.5 text-[11px] text-amber-900 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Info Akses Admin</span>
          </div>
          <p>
            Pembatasan peran menunggu backend. Saat ini setiap akun yang login
            dapat mengakses modul admin untuk keperluan pengujian.
          </p>
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

export default function AdminSidebar() {
  return (
    <Suspense fallback={<aside className="lezzat-sidebar" />}>
      <AdminSidebarInner />
    </Suspense>
  );
}