'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  ExternalLink,
  X,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

declare global {
  interface Window {
    snap?: {
      pay: (
        snapToken: string,
        callbacks: {
          onSuccess?: (result: Record<string, unknown>) => void;
          onPending?: (result: Record<string, unknown>) => void;
          onError?: (result: Record<string, unknown>) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface QrisDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayRef: string;
  jumlah: number;
  metodePay: string;
  idOrder: string;
  onSuccess: () => void;
}

export default function QrisDemoModal({
  isOpen,
  onClose,
  gatewayRef,
  jumlah,
  metodePay,
  idOrder,
  onSuccess,
}: QrisDemoModalProps) {
  const user = useAuthStore((state) => state.user);
  const [isSnapReady, setIsSnapReady] = useState(false);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<string | null>(null);

  // Muat script resmi Midtrans Sandbox snap.js
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const clientKey =
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';

    if (window.snap) {
      setIsSnapReady(true);
      return;
    }

    const existingScript = document.getElementById('midtrans-snap-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsSnapReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'midtrans-snap-script';
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    script.onload = () => setIsSnapReady(true);
    script.onerror = () =>
      setErrorMsg('Gagal memuat script snap.js dari Midtrans Sandbox.');
    document.body.appendChild(script);
  }, []);

  if (!isOpen) return null;

  // Sinkronkan status LUNAS ke backend Spring Boot ketika pembayaran Midtrans berhasil
  const syncPaymentSuccessToBackend = async () => {
    setIsSyncingBackend(true);
    setErrorMsg(null);
    try {
      await api.post('/api/payments/callback', {
        gatewayRef,
        status: 'LUNAS',
        jumlahDikonfirmasi: jumlah,
      });
      setStatusInfo(
        'Pembayaran Midtrans berhasil! Status pesanan di backend telah diperbarui menjadi LUNAS.'
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(
        getErrorMessage(
          err,
          'Pembayaran di Midtrans berhasil, namun gagal mengirim callback ke backend.'
        )
      );
    } finally {
      setIsSyncingBackend(false);
    }
  };

  // Minta snapToken dari API Route lalu buka popup window.snap.pay()
  const handleLaunchMidtransSnap = async () => {
    setErrorMsg(null);
    setStatusInfo(null);
    setIsRequestingToken(true);

    try {
      const res = await fetch('/api/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayRef,
          jumlah,
          metodePay,
          customerName: user?.nama || 'Pelanggan Lezzat',
          customerEmail: user?.email || 'customer@lezzat.id',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(
          data.message || 'Gagal mendapatkan Snap Token dari Midtrans Sandbox.'
        );
      }

      if (!window.snap) {
        throw new Error(
          'Script Midtrans Snap belum siap. Pastikan koneksi internet aktif dan Client Key valid.'
        );
      }

      // Buka Popup Resmi Midtrans Snap
      window.snap.pay(data.token, {
        onSuccess: async () => {
          await syncPaymentSuccessToBackend();
        },
        onPending: () => {
          setStatusInfo(
            'Menunggu pembayaran di Simulator Midtrans. Salin Nomor VA / URL QRIS dari popup Snap ke Simulator Midtrans.'
          );
        },
        onError: () => {
          setErrorMsg('Transaksi ditolak atau gagal di Midtrans Sandbox.');
        },
        onClose: () => {
          // Ditutup oleh pengguna
        },
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal membuka popup Midtrans Snap.'
      );
    } finally {
      setIsRequestingToken(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-[#002855] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-200 block">
                MIDTRANS SNAP SANDBOX ASLI
              </span>
              <h3 className="text-base font-bold leading-tight">
                Pembayaran QRIS & Virtual Account
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f7f6f2] border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 block">
                Nominal Tagihan ({metodePay})
              </span>
              <span className="text-lg font-extrabold text-[#174634]">
                {formatRupiah(jumlah)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">
                Gateway Ref Backend
              </span>
              <span className="font-mono font-bold text-slate-800">
                {gatewayRef}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 space-y-2 text-slate-700 leading-relaxed">
            <p className="font-bold text-slate-900">
              Cara Uji Pembayaran di Midtrans Sandbox:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>
                Klik tombol <strong>Buka Popup Midtrans Snap</strong> di bawah.
              </li>
              <li>
                Pilih <strong>QRIS (GoPay/ShopeePay)</strong> atau{' '}
                <strong>Bank Transfer (BCA/BNI/BRI/Mandiri VA)</strong>, lalu
                salin Nomor VA atau kode QR-nya.
              </li>
              <li>
                Buka{' '}
                <a
                  href="https://simulator.sandbox.midtrans.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-700 underline inline-flex items-center gap-0.5"
                >
                  Simulator Midtrans Sandbox
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                untuk menyelesaikan pembayaran.
              </li>
            </ol>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusInfo && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-[#174634] font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusInfo}</span>
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={isRequestingToken || isSyncingBackend || !isSnapReady}
              onClick={handleLaunchMidtransSnap}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#002855] hover:bg-[#001d3d] disabled:opacity-60 text-white font-bold py-3.5 px-5 text-xs shadow-sm transition-colors cursor-pointer"
            >
              {isRequestingToken ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Meminta Snap Token ke Midtrans...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Buka Popup Midtrans Snap (QRIS & Transfer VA)</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <a
                href="https://simulator.sandbox.midtrans.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
              >
                <span>Buka Web Simulator Midtrans</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                disabled={isSyncingBackend}
                onClick={syncPaymentSuccessToBackend}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#174634] hover:underline cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {isSyncingBackend
                    ? 'Menyinkronkan...'
                    : 'Sudah Bayar di Simulator? Konfirmasi Lunas'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
