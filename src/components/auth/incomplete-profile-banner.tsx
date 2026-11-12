'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth-store';
import { CustomerResponse } from '@/types/api';

interface IncompleteProfileBannerProps {
  onStatusChange?: (
    isIncomplete: boolean,
    profile?: CustomerResponse | null
  ) => void;
}

export default function IncompleteProfileBanner({
  onStatusChange,
}: IncompleteProfileBannerProps) {
  const user = useAuthStore((state) => state.user);
  const token = user?.token || null;

  const { data: profile } = useQuery<CustomerResponse | null>({
    queryKey: ['customer-me-profile-check', token],
    queryFn: async () => {
      try {
        const res = await api.get<CustomerResponse>('/api/customers/me');
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(token) && user?.tipeAkun !== 'ADMIN',
    staleTime: 15 * 1000,
  });

  const alamat = (profile?.alamat || '').trim();
  const noTelp = (profile?.noTelp || '').trim();

  const isIncomplete =
    Boolean(profile) &&
    (alamat === '-' || alamat === '' || noTelp === '-' || noTelp === '');

  React.useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isIncomplete, profile);
    }
  }, [isIncomplete, profile, onStatusChange]);

  if (!isIncomplete) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D97706]/30 bg-[#D97706]/10 px-4 py-3.5 text-xs text-[#171725]"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#171725]">
            Profil Akun Google Anda Belum Lengkap
          </p>
          <p className="text-[11px] text-[#5E5E6A] mt-0.5">
            Alamat pengiriman dan nomor telepon Anda masih kosong (<code>-</code>).
            Silakan lengkapi profil sebelum melakukan checkout dan pengiriman.
          </p>
        </div>
      </div>

      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white font-bold px-3.5 py-2 text-xs transition-colors shrink-0"
      >
        <span>Lengkapi Profil</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}