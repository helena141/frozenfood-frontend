'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Snowflake,
  Compass,
  ShoppingBag,
  ClipboardList,
  User,
  LogOut,
  LogIn,
  LayoutDashboard,
  Menu,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';

function ShopSidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const items = useCartStore((state) => state.items);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCartQty = mounted ? getTotalItems() : 0;
  const isLoggedIn = mounted && Boolean(user && user.token);
  const isAdmin = isLoggedIn && user?.tipeAkun === 'ADMIN';
  const isB2B = isLoggedIn && user?.tipeAkun === 'B2B';

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.push('/login');
  };

  const navItems = [
    {
      href: '/',
      label: 'Beranda & Katalog',
      icon: Compass,
      active: pathname === '/' || pathname.startsWith('/products'),
    },
    {
      href: '/checkout',
      label: 'Keranjang & Checkout',
      icon: ShoppingBag,
      badge: totalCartQty > 0 ? totalCartQty : undefined,
      active: pathname.startsWith('/checkout') || pathname.startsWith('/cart'),
    },
    {
      href: '/orders',
      label: 'Pesanan Saya',
      icon: ClipboardList,
      active: pathname.startsWith('/orders'),
    },
    {
      href: '/profile',
      label: 'Profil & Alamat',
      icon: User,
      active: pathname.startsWith('/profile'),
    },
  ];

  void items;

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E6E8F0] px-4 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl ff-hero-gradient flex items-center justify-center text-white shadow-sm">
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading text-base font-extrabold text-[#171725] tracking-tight block leading-none">
              Froznfood
            </span>
            <span className="text-[10px] font-semibold text-[#4737FF] tracking-wider uppercase block mt-0.5">
              Fresh Marketplace
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/checkout"
            className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F75C03] text-white text-xs font-bold shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{totalCartQty}</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Buka menu navigasi"
            className="p-2 rounded-xl border border-[#E6E8F0] bg-white text-[#171725] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-[#101018]/50 backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-[260px] shrink-0 bg-white border-r border-[#E6E8F0] flex flex-col justify-between p-5 transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-2xl ff-hero-gradient flex items-center justify-center text-white shadow-md shadow-[#4737FF]/20 group-hover:scale-105 transition-transform">
                <Snowflake className="w-5 h-5" />
              </div>
              <div>
                <span className="font-heading text-lg font-extrabold text-[#171725] tracking-tight block leading-none">
                  Froznfood
                </span>
                <span className="text-[10px] font-bold tracking-[0.16em] text-[#4737FF] uppercase block mt-1">
                  FRESH IN EVERY BITE
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#77788A] hover:text-[#171725]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoggedIn ? (
            <div className="rounded-2xl bg-[#F8FAFF] border border-[#E6E8F0] p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4737FF] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user?.nama?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#171725] truncate">
                    {user?.nama}
                  </p>
                  <p className="text-[11px] text-[#77788A] truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-[#E6E8F0] flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#77788A]">
                  Tipe Akun
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                    isB2B
                      ? 'bg-[#F75C03]/15 text-[#F75C03]'
                      : isAdmin
                        ? 'bg-[#4737FF]/15 text-[#4737FF]'
                        : 'bg-[#E7EFFF] text-[#2563EB]'
                  }`}
                >
                  {user?.tipeAkun || 'B2C'}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl ff-hero-gradient p-4 text-white shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ACA5FF] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Member Froznfood</span>
              </div>
              <p className="text-xs font-bold leading-snug mb-3">
                Masuk untuk menikmati kemudahan belanja & lacak pengiriman.
              </p>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-bold py-2 px-3 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk / Daftar</span>
              </Link>
            </div>
          )}

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#77788A] mb-2">
              MENU MARKETPLACE
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      item.active
                        ? 'bg-[#4737FF] text-white shadow-sm shadow-[#4737FF]/25'
                        : 'text-[#5E5E6A] hover:bg-[#F1F3F8] hover:text-[#171725]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F75C03] text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#101018] text-white text-xs font-semibold hover:bg-[#3529BF] transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-[#ACA5FF]" />
                    <span>Buka SaaS Admin</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#ACA5FF]" />
                </Link>
              )}
            </nav>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#E6E8F0]">
          <div className="rounded-2xl bg-[#E7EFFF]/70 border border-[#D1CDFF] p-3 text-[11px] text-[#171725]">
            <p className="font-bold text-[#4737FF] flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5" />
              <span>Jaminan Rantai Dingin -18°C</span>
            </p>
            <p className="text-[#5E5E6A] mt-0.5 leading-relaxed">
              Setiap pesanan dikemas dalam cooler box higienis berstandar FEFO.
            </p>
          </div>

          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E6E8F0] hover:border-[#E5484D]/40 hover:bg-[#E5484D]/5 text-[#E5484D] text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
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
        <aside className="hidden lg:block w-[260px] shrink-0 bg-white border-r border-[#E6E8F0] h-screen" />
      }
    >
      <ShopSidebarInner />
    </Suspense>
  );
}