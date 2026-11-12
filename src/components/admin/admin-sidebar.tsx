'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Snowflake,
  BarChart3,
  Truck,
  Package,
  Users,
  Store,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

function AdminSidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.push('/login');
  };

  const adminNavItems = [
    {
      href: '/admin/dashboard',
      label: 'Laporan & Omzet',
      icon: BarChart3,
      active: pathname.startsWith('/admin/dashboard'),
    },
    {
      href: '/admin/deliveries',
      label: 'Manajemen Pengiriman',
      icon: Truck,
      active: pathname.startsWith('/admin/deliveries'),
    },
    {
      href: '/admin/products',
      label: 'Produk & Batch FEFO',
      icon: Package,
      active: pathname.startsWith('/admin/products'),
    },
    {
      href: '/admin/customers',
      label: 'Data Pelanggan',
      icon: Users,
      active: pathname.startsWith('/admin/customers'),
    },
  ];

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-[#101018] text-white px-4 py-3.5 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#4737FF] flex items-center justify-center text-white">
            <Snowflake className="w-4 h-4" />
          </div>
          <div>
            <span className="font-heading text-sm font-extrabold tracking-tight block leading-none">
              Froznfood
            </span>
            <span className="text-[10px] text-[#ACA5FF] font-semibold uppercase tracking-widest block mt-0.5">
              SaaS Admin 2.0
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-xl bg-white/10 text-white cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-[#101018]/60 backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-[260px] shrink-0 bg-[#101018] text-white flex flex-col justify-between p-5 transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#4737FF] flex items-center justify-center text-white shadow-lg shadow-[#4737FF]/30">
                <Snowflake className="w-5 h-5" />
              </div>
              <div>
                <span className="font-heading text-lg font-extrabold text-white tracking-tight block leading-none">
                  Froznfood
                </span>
                <span className="text-[10px] font-bold tracking-[0.18em] text-[#ACA5FF] uppercase block mt-1">
                  ADMIN WORKSPACE
                </span>
              </div>
            </Link>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#4737FF] text-white font-bold text-xs flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.nama || 'Administrator'}
                </p>
                <p className="text-[11px] text-[#ACA5FF] truncate">
                  {user?.email || 'admin@froznfood.id'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#77788A] mb-2">
              MANAJEMEN OPERASIONAL
            </p>
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      item.active
                        ? 'bg-[#4737FF] text-white shadow-md shadow-[#4737FF]/30'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-white/10">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          >
            <Store className="w-4 h-4 text-[#ACA5FF]" />
            <span>Lihat Toko Pelanggan</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-500/30 hover:bg-red-500/15 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi Admin</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default function AdminSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="hidden lg:block w-[260px] shrink-0 bg-[#101018] h-screen" />
      }
    >
      <AdminSidebarInner />
    </Suspense>
  );
}