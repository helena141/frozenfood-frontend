'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { User, X, ZoomIn, ExternalLink, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/axios';
import { CustomerResponse } from '@/types/api';

export function resolveProfileImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const baseUrl = (
    api.defaults.baseURL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8080'
  ).replace(/\/+$/, '');
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export interface CustomerAvatarUser {
  idUser?: string;
  nama?: string;
  email?: string;
  tipeAkun?: string;
  fotoProfil?: string | null;
  [key: string]: unknown;
}

interface CustomerAvatarProps {
  user?: CustomerAvatarUser | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  enablePreview?: boolean;
  showProfileLinkInModal?: boolean;
  fetchSelfProfile?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export default function CustomerAvatar({
  user,
  size = 'sm',
  enablePreview = true,
  showProfileLinkInModal = true,
  fetchSelfProfile = true,
}: CustomerAvatarProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isCustomerAccount =
    Boolean(user?.idUser) &&
    user?.tipeAkun !== 'ADMIN' &&
    fetchSelfProfile;

  // Ambil data profil terbaru agar foto profil selalu muncul di Beranda & Sidebar
  const { data: meProfile } = useQuery<CustomerResponse>({
    queryKey: ['customer-me', user?.idUser],
    enabled: isCustomerAccount,
    staleTime: 60000,
    queryFn: async () => {
      const res = await api.get<CustomerResponse>('/api/customers/me');
      return res.data;
    },
  });

  if (!user) return null;

  const rawFoto =
    (user.fotoProfil as string | undefined) ||
    meProfile?.fotoProfil ||
    (user.foto as string | undefined) ||
    null;

  const photoUrl = !imgError ? resolveProfileImageUrl(rawFoto) : null;
  const displayName = meProfile?.nama || user.nama || 'Pelanggan';
  const displayEmail = meProfile?.email || user.email || '';

  const initials = (displayName || displayEmail || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (enablePreview) setIsPreviewOpen(true);
        }}
        title={
          enablePreview
            ? `Klik untuk melihat foto profil ${displayName}`
            : displayName
        }
        className={`group relative rounded-full overflow-hidden shrink-0 border-2 border-[#4737FF]/25 bg-[#E7EFFF] text-[#4737FF] font-heading font-extrabold flex items-center justify-center transition-all ${
          SIZE_CLASSES[size]
        } ${
          enablePreview
            ? 'cursor-pointer hover:border-[#4737FF] hover:shadow-sm'
            : 'cursor-default'
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={displayName}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className="w-4 h-4" />
        )}

        {enablePreview && (
          <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Modal Popup Lihat Foto Profil */}
      {isPreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsPreviewOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-extrabold text-slate-800">
                  Foto Profil Pelanggan
                </span>
                {user.tipeAkun && (
                  <span className="px-2 py-0.5 rounded-md bg-[#4737FF]/10 text-[#4737FF] text-[10px] font-extrabold uppercase">
                    {user.tipeAkun}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 flex flex-col items-center text-center">
              <div className="w-60 h-60 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-[#E7EFFF] flex items-center justify-center text-[#4737FF]">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <span className="font-heading text-5xl font-extrabold mb-2">
                      {initials || 'U'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Belum ada foto profil yang diunggah
                    </span>
                  </div>
                )}
              </div>

              <h3 className="font-heading text-base font-extrabold text-slate-800 mt-4">
                {displayName}
              </h3>
              {displayEmail && (
                <p className="text-xs text-slate-500 mt-0.5">{displayEmail}</p>
              )}

              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[#159A68] text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Akun Terverifikasi Froznfood 2.0</span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
              {showProfileLinkInModal && (
                <Link
                  href="/profile"
                  onClick={() => setIsPreviewOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-bold transition-colors"
                >
                  <span>Kelola / Ganti Foto</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}