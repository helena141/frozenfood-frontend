'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Snowflake,
  Home,
  ShoppingBag,
  Package,
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import CustomerAvatar from '@/components/shop/customer-avatar';

function ShopSidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const items = useCartStore((state) => state.items);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [mounted, setMounted] = useState(false);
  const [isDesktopHidden, setIsDesktopHidden] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ff-sidebar-hidden');
      if (saved === '1') setIsDesktopHidden(true);
    } catch {
      // Abaikan
    }
  }, []);

  const toggleDesktopSidebar = () => {
    setIsDesktopHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ff-sidebar-hidden', next ? '1' : '0');
      } catch {
        // Abaikan
      }
      return next;
    });
  };

  const activeUser = mounted ? user : null;
  const totalCartItems = mounted ? getTotalItems() : 0;
  void items;

  const handleLogout = () => {
    logout();
    setIsMobileOpen(false);
    router.push('/login');
  };

  const navItems = [
    {
      label: 'Beranda & Katalog',
      href: '/',
      icon: Home,
      active: pathname === '/' || pathname.startsWith('/products'),
    },
    {
      label: 'Keranjang & Checkout',
      href: '/checkout',
      icon: ShoppingBag,
      active: pathname.startsWith('/checkout'),
      badge: totalCartItems > 0 ? String(totalCartItems) : undefined,
    },
    {
      label: 'Pesanan Saya',
      href: '/orders',
      icon: Package,
      active: pathname.startsWith('/orders'),
    },
    {
      label: 'Profil Saya',
      href: '/profile',
      icon: User,
      active: pathname.startsWith('/profile'),
    },
  ];

  return (
    <>
      {/* Tombol Pembuka Mengambang saat Sidebar Disembunyikan (Desktop & Mobile) */}
      <button
        type="button"
        onClick={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsMobileOpen(true);
          } else {
            toggleDesktopSidebar();
          }
        }}
        title="Tampilkan Menu Navigasi"
        className={`fixed top-3.5 left-3.5 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#4737FF] hover:border-[#4737FF]/40 shadow-sm text-xs font-bold transition-all cursor-pointer ${
          isDesktopHidden ? 'lg:inline-flex' : 'lg:hidden'
        }`}
      >
        <Menu className="w-4 h-4 text-[#4737FF]" />
        <span className="hidden sm:inline">Menu</span>
      </button>

      {/* Backdrop Drawer Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Panel Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 shrink-0 ${
          isMobileOpen
            ? 'translate-x-0 w-60 p-4 shadow-lg'
            : '-translate-x-full lg:translate-x-0'
        } ${
          isDesktopHidden
            ? 'lg:w-0 lg:p-0 lg:border-r-0 lg:overflow-hidden'
            : 'lg:w-60 lg:p-4'
        }`}
      >
        <div className="space-y-5 min-w-[208px]">
          {/* Header Brand + Tombol Sembunyikan */}
          <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
            <Link
              href="/"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="w-9 h-9 rounded-xl bg-[#4737FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Snowflake className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="font-heading text-sm font-extrabold text-slate-800 block leading-none truncate">
                  Froznfood
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                  Lezzat 2.0
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setIsMobileOpen(false);
                } else {
                  toggleDesktopSidebar();
                }
              }}
              title="Sembunyikan Sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4 hidden lg:block" />
              <X className="w-4 h-4 lg:hidden" />
            </button>
          </div>

          {/* Menu Navigasi */}
          <nav className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Menu Pelanggan
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    item.active
                      ? 'bg-[#4737FF] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                        item.active
                          ? 'bg-white text-[#4737FF]'
                          : 'bg-[#F75C03] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {activeUser?.tipeAkun === 'ADMIN' && (
              <div className="pt-2 mt-2 border-t border-slate-100">
                <Link
                  href="/admin/dashboard"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#4737FF]/10 text-[#4737FF] hover:bg-[#4737FF] hover:text-white text-xs font-bold transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Buka SaaS Admin</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Info Ringkas Rantai Dingin */}
          <div className="rounded-xl bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">Suhu Gudang</span>
              <span className="font-extrabold text-[#159A68]">-18°C Fresh</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Gratis ongkir ≤ 5 km • Sameday order sebelum 15.00 WIB.
            </p>
          </div>
        </div>

        {/* Bagian Bawah: Status Akun + Foto Profil */}
        <div className="pt-3.5 border-t border-slate-100 min-w-[208px]">
          {activeUser ? (
            <div className="space-y-2.5">
              <div className="px-2.5 py-2 rounded-xl bg-slate-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CustomerAvatar
                    user={activeUser as unknown as Record<string, unknown>}
                    size="sm"
                    enablePreview
                  />
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileOpen(false)}
                    className="min-w-0 hover:text-[#4737FF] transition-colors"
                  >
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {activeUser.nama}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {activeUser.email}
                    </p>
                  </Link>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#4737FF]/10 text-[#4737FF] text-[10px] font-extrabold shrink-0">
                  {activeUser.tipeAkun}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <span>Daftar</span>
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default function ShopSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="hidden lg:block w-60 shrink-0 bg-white border-r border-slate-200 p-4 h-screen" />
      }
    >
      <ShopSidebarContent />
    </Suspense>
  );
}