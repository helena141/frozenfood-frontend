'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BellRing,
  Volume2,
  VolumeX,
  Truck,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { formatRupiah } from '@/lib/utils';
import { DeliveryListResponse, DeliveryResponse } from '@/types/api';

interface AdminOrderAlertProps {
  /**
   * Jika diberikan (misalnya di halaman /admin/deliveries),
   * tombol "Isi Ongkir Sekarang" akan langsung membuka form konfirmasi ongkir.
   */
  onQuickConfirm?: (delivery: DeliveryResponse) => void;
}

export default function AdminOrderAlert({
  onQuickConfirm,
}: AdminOrderAlertProps) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [newOrderToast, setNewOrderToast] = useState<DeliveryResponse | null>(
    null
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const knownDeliveryIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Inisialisasi & buka kunci AudioContext saat Admin pertama kali klik di halaman
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setAudioUnlocked(true);
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFirstInteraction = () => {
      initAudioContext();
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {
          // Abaikan jika ditolak
        });
      }
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [initAudioContext]);

  /**
   * Nada 1: Alarm Prioritas Konfirmasi Ongkir Pihak Ketiga (3 Nada Cepat: C6 - E6 - G6)
   */
  const playUrgentConfirmSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = initAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98, 1318.5, 1567.98]; // C6, E6, G6, E6, G6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0.001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.16);
      });
    } catch {
      // Abaikan jika browser belum mengizinkan audio
    }
  }, [soundEnabled, initAudioContext]);

  /**
   * Nada 2: Lonceng Pesanan Baru Masuk (2 Nada Halus: E5 -> B5)
   */
  const playNewOrderSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = initAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 987.77]; // E5 -> B5 (Ding-Dong)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.22);

        gain.gain.setValueAtTime(0.001, now + idx * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.22 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.22);
        osc.stop(now + idx * 0.22 + 0.36);
      });
    } catch {
      // Abaikan jika browser belum mengizinkan audio
    }
  }, [soundEnabled, initAudioContext]);

  // Polling daftar pengiriman setiap 10 detik untuk mendeteksi pesanan baru secara real-time
  const { data: deliveries = [] } = useQuery<DeliveryResponse[]>({
    queryKey: ['admin-live-delivery-alerts'],
    queryFn: async () => {
      const res = await api.get<DeliveryListResponse | DeliveryResponse[]>(
        '/api/deliveries',
        {
          params: { page: 0, size: 50 },
        }
      );
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.content)) return raw.content;
      return [];
    },
    refetchInterval: 10000,
  });

  // Pisahkan pengiriman yang butuh konfirmasi ongkir Admin vs menunggu pickup
  const waitingConfirmList = deliveries.filter(
    (d) => d.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN'
  );
  const waitingPickupList = deliveries.filter(
    (d) => d.statusDelivery === 'MENUNGGU_PICKUP'
  );

  // Deteksi setiap kali ada ID pengiriman baru yang masuk
  useEffect(() => {
    if (!deliveries || deliveries.length === 0) return;

    if (isInitialLoadRef.current) {
      deliveries.forEach((d) => knownDeliveryIdsRef.current.add(d.idDelivery));
      isInitialLoadRef.current = false;

      // Jika saat pertama buka halaman sudah ada yang menunggu konfirmasi ongkir, bunyikan sekali
      if (
        deliveries.some((d) => d.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN')
      ) {
        playUrgentConfirmSound();
      }
      return;
    }

    const newlyArrived: DeliveryResponse[] = [];
    deliveries.forEach((d) => {
      if (!knownDeliveryIdsRef.current.has(d.idDelivery)) {
        knownDeliveryIdsRef.current.add(d.idDelivery);
        newlyArrived.push(d);
      }
    });

    if (newlyArrived.length > 0) {
      const latest = newlyArrived[0];
      setNewOrderToast(latest);

      const hasUrgentConfirm = newlyArrived.some(
        (d) => d.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN'
      );

      if (hasUrgentConfirm) {
        playUrgentConfirmSound();
      } else {
        playNewOrderSound();
      }

      // Tampilkan Desktop Notification jika diizinkan browser
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(
          hasUrgentConfirm
            ? '⚠️ Pesanan Baru Butuh Konfirmasi Ongkir!'
            : '📦 Pesanan Baru Masuk — Lezzat Frozen Food',
          {
            body: `Order #${latest.idOrder.slice(0, 8)} • ${latest.pelaksana} (${latest.jarak} km) ke ${latest.alamatTujuan}`,
          }
        );
      }
    }
  }, [deliveries, playUrgentConfirmSound, playNewOrderSound]);

  // Pengingat suara berulang setiap 25 detik selama masih ada pengiriman MENUNGGU_KONFIRMASI_ADMIN
  useEffect(() => {
    if (!soundEnabled || waitingConfirmList.length === 0) return;

    const reminderTimer = setInterval(() => {
      playUrgentConfirmSound();
    }, 25000);

    return () => clearInterval(reminderTimer);
  }, [soundEnabled, waitingConfirmList.length, playUrgentConfirmSound]);

  return (
    <div className="space-y-3 mb-6">
      {/* Pop-up Toast Pesanan Baru Masuk */}
      {newOrderToast && (
        <div className="rounded-2xl bg-[#171725] text-white p-4 shadow-lg border border-[#4737FF] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F75C03] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#F75C03] text-[10px] font-extrabold uppercase">
                  PESANAN BARU MASUK!
                </span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  Order #{newOrderToast.idOrder.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                Tujuan: <strong>{newOrderToast.alamatTujuan}</strong> (
                {newOrderToast.jarak} km • {newOrderToast.pelaksana})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {newOrderToast.statusDelivery === 'MENUNGGU_KONFIRMASI_ADMIN' &&
            onQuickConfirm ? (
              <button
                type="button"
                onClick={() => {
                  onQuickConfirm(newOrderToast);
                  setNewOrderToast(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-extrabold cursor-pointer"
              >
                Isi Ongkir Sekarang
              </button>
            ) : (
              <Link
                href="/admin/deliveries"
                onClick={() => setNewOrderToast(null)}
                className="px-3.5 py-2 rounded-xl bg-[#4737FF] hover:bg-[#3529BF] text-white text-xs font-extrabold"
              >
                Buka Pengiriman
              </Link>
            )}
            <button
              type="button"
              onClick={() => setNewOrderToast(null)}
              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Panel Utama Notifikasi Pesanan & Konfirmasi Ongkir Pihak Ketiga */}
      <section
        className={`rounded-2xl border p-4 sm:p-5 transition-all ${
          waitingConfirmList.length > 0
            ? 'bg-[#FFF7ED] border-2 border-[#F75C03] shadow-md'
            : waitingPickupList.length > 0
              ? 'bg-[#E7EFFF] border border-[#4737FF]/40'
              : 'bg-white border border-[#E6E8F0]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                waitingConfirmList.length > 0
                  ? 'bg-[#F75C03] text-white animate-bounce'
                  : waitingPickupList.length > 0
                    ? 'bg-[#4737FF] text-white'
                    : 'bg-emerald-50 text-[#159A68]'
              }`}
            >
              {waitingConfirmList.length > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : waitingPickupList.length > 0 ? (
                <BellRing className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-sm sm:text-base font-extrabold text-[#171725]">
                  {waitingConfirmList.length > 0
                    ? `⚠️ ${waitingConfirmList.length} Pesanan Pihak Ketiga Menunggu Konfirmasi Ongkir Admin!`
                    : waitingPickupList.length > 0
                      ? `${waitingPickupList.length} Pesanan Siap Pickup Kurir`
                      : 'Pantauan Pesanan Masuk Real-Time (Aktif)'}
                </h2>

                {waitingConfirmList.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F75C03] text-white text-[10px] font-extrabold uppercase">
                    Wajib Isi Ongkir
                  </span>
                )}

                {waitingPickupList.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#4737FF] text-white text-[10px] font-extrabold uppercase">
                    {waitingPickupList.length} Menunggu Pickup
                  </span>
                )}
              </div>

              <p className="text-xs text-[#5E5E6A] mt-0.5">
                {waitingConfirmList.length > 0
                  ? 'Pelanggan tidak dapat melanjutkan pembayaran Midtrans sebelum Admin menetapkan biaya ongkir & nama ekspedisi.'
                  : 'Sistem memantau pesanan baru otomatis setiap 10 detik lengkap dengan notifikasi suara.'}
              </p>
            </div>
          </div>

          {/* Kontrol Suara Alarm & Tes Bunyi */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                initAudioContext();
                playUrgentConfirmSound();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6E8F0] hover:border-[#4737FF] text-[#171725] text-xs font-bold transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-[#F75C03]" />
              <span>Tes Suara Alarm</span>
            </button>

            <button
              type="button"
              onClick={() => {
                initAudioContext();
                setSoundEnabled((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-[#159A68] text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>
                    Suara Aktif {!audioUnlocked ? '(Klik untuk Buka)' : ''}
                  </span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Suara Dibisukan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Daftar Pesanan yang Membutuhkan Konfirmasi Ongkir Segera */}
        {waitingConfirmList.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[#FED7AA] space-y-2">
            {waitingConfirmList.map((item) => (
              <div
                key={item.idDelivery}
                className="p-3 rounded-xl bg-white border border-[#F75C03]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-extrabold text-[#4737FF]">
                      Order #{item.idOrder.slice(0, 8)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F75C03]/15 text-[#D93800] text-[10px] font-extrabold">
                      {item.pelaksana} • {item.metodeDeliv}
                    </span>
                    <span className="font-bold text-[#171725]">
                      Jarak: {item.jarak} km
                    </span>
                  </div>
                  <p className="text-xs text-[#5E5E6A] line-clamp-1">
                    Alamat Tujuan:{' '}
                    <strong className="text-[#171725]">
                      {item.alamatTujuan}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onQuickConfirm ? (
                    <button
                      type="button"
                      onClick={() => onQuickConfirm(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-extrabold shadow-xs cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Isi Ongkir & Konfirmasi</span>
                    </button>
                  ) : (
                    <Link
                      href="/admin/deliveries"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F75C03] hover:bg-[#D94800] text-white text-xs font-extrabold shadow-xs"
                    >
                      <span>Konfirmasi di Menu Pengiriman</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ringkasan Pesanan Baru Lainnya (Menunggu Pickup) */}
        {waitingPickupList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#D1CDFF] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#171725]">
              <Clock className="w-4 h-4 text-[#4737FF] shrink-0" />
              <span>
                Terdapat <strong>{waitingPickupList.length} pesanan</strong>{' '}
                berstatus <code className="font-mono">MENUNGGU_PICKUP</code>{' '}
                (Terbaru: <strong>#{waitingPickupList[0].idOrder.slice(0, 8)}</strong>{' '}
                • Ongkir {formatRupiah(waitingPickupList[0].ongkir)})
              </span>
            </div>

            {!onQuickConfirm && (
              <Link
                href="/admin/deliveries"
                className="font-extrabold text-[#4737FF] hover:underline inline-flex items-center gap-1"
              >
                <span>Lihat Semua Pengiriman</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}