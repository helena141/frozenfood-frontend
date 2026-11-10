'use client';

import React, { useState } from 'react';
import {
  QrCode,
  Sparkles,
  Copy,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah, getErrorMessage } from '@/lib/utils';

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
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(gatewayRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateCallbackLunas = async () => {
    setErrorMsg(null);
    setIsSimulating(true);
    try {
      await api.post('/api/payments/callback', {
        gatewayRef,
        status: 'LUNAS',
        jumlahDikonfirmasi: jumlah,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(
        getErrorMessage(err, 'Gagal mengirim simulasi callback pembayaran.')
      );
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-[#174634] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 block">
                SIMULASI PAYMENT GATEWAY
              </span>
              <h3 className="text-base font-bold leading-tight">
                {metodePay === 'TRANSFER'
                  ? 'Virtual Account Bank (Demo)'
                  : 'QRIS Standar Nasional (Demo)'}
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

        <div className="p-6 space-y-5 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f7f6f2] border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 block">
                Total Tagihan (Barang + Ongkir)
              </span>
              <span className="text-lg font-extrabold text-[#174634]">
                {formatRupiah(jumlah)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">
                Merchant
              </span>
              <span className="font-bold text-slate-800">
                LEZZAT FROZEN FOOD
              </span>
            </div>
          </div>

          {metodePay === 'TRANSFER' ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center space-y-2">
              <Building2 className="w-8 h-8 text-[#174634] mx-auto" />
              <p className="text-slate-500 text-[11px]">
                Nomor Virtual Account Pembayaran
              </p>
              <p className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                8801 0812 3456 7890
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                Otomatis terverifikasi melalui simulasi webhook di bawah
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-inner">
              <div className="flex items-center justify-between w-full mb-3 px-2">
                <span className="font-extrabold text-xs tracking-tight text-slate-900">
                  QRIS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                  GPN
                </span>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <svg
                  viewBox="0 0 120 120"
                  className="w-44 h-44 text-slate-900"
                  fill="currentColor"
                >
                  <path d="M10 10h30v30H10zM15 15v20h20V15z" />
                  <rect x="20" y="20" width="10" height="10" />
                  <path d="M80 10h30v30H80zM85 15v20h20V15z" />
                  <rect x="90" y="20" width="10" height="10" />
                  <path d="M10 80h30v30H10zM15 85v20h20V85z" />
                  <rect x="20" y="90" width="10" height="10" />
                  <rect x="45" y="10" width="5" height="10" />
                  <rect x="55" y="15" width="10" height="5" />
                  <rect x="70" y="10" width="5" height="15" />
                  <rect x="45" y="25" width="15" height="5" />
                  <rect x="65" y="30" width="10" height="10" />
                  <rect x="10" y="45" width="15" height="5" />
                  <rect x="30" y="45" width="10" height="10" />
                  <rect x="45" y="45" width="30" height="5" />
                  <rect x="85" y="45" width="10" height="10" />
                  <rect x="100" y="45" width="10" height="5" />
                  <rect x="15" y="55" width="10" height="15" />
                  <rect x="35" y="60" width="15" height="5" />
                  <rect x="55" y="55" width="10" height="10" />
                  <rect x="70" y="60" width="15" height="10" />
                  <rect x="95" y="55" width="15" height="15" />
                  <rect x="45" y="75" width="10" height="15" />
                  <rect x="60" y="80" width="15" height="5" />
                  <rect x="80" y="75" width="10" height="10" />
                  <rect x="45" y="95" width="20" height="15" />
                  <rect x="70" y="90" width="10" height="20" />
                  <rect x="85" y="95" width="25" height="15" />
                </svg>
              </div>

              <p className="text-[11px] text-slate-500 mt-3 text-center">
                NMID: ID1026000{idOrder.slice(0, 6).toUpperCase()}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5">
            <div>
              <span className="text-[10px] text-slate-400 block">
                Kode Referensi Gateway (gatewayRef)
              </span>
              <span className="font-mono font-bold text-slate-800">
                {gatewayRef}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyRef}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-1 space-y-2">
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulateCallbackLunas}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-3.5 px-5 text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSimulating
                  ? 'Memproses Callback Lunas ke Backend...'
                  : `Simulasikan Scan & Bayar Lunas (${formatRupiah(jumlah)})`}
              </span>
            </button>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Menembak <code>POST /api/payments/callback</code> (status: LUNAS)
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
