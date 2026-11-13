import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';
import { ProductCatalogResponse } from '@/types/api';

const NAMA_BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hasExplicitStock(product: ProductCatalogResponse): boolean {
  return (
    (typeof product.totalStock === 'number' && !Number.isNaN(product.totalStock)) ||
    (typeof product.totalStokOnline === 'number' &&
      !Number.isNaN(product.totalStokOnline))
  );
}

export function getProductStock(product: ProductCatalogResponse): number {
  if (typeof product.totalStock === 'number' && !Number.isNaN(product.totalStock)) {
    return product.totalStock;
  }
  if (
    typeof product.totalStokOnline === 'number' &&
    !Number.isNaN(product.totalStokOnline)
  ) {
    return product.totalStokOnline;
  }
  return 0;
}

export interface CartItemPriceLine {
  batchId?: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  label: string;
  isDiscounted: boolean;
}

export interface CartItemPricingResult {
  originalUnitPrice: number;
  originalSubtotal: number;
  finalSubtotal: number;
  savedAmount: number;
  effectiveUnitPrice: number;
  hasDiscount: boolean;
  primaryPromoLabel: string | null;
  lines: CartItemPriceLine[];
}

/**
 * Menghitung rincian harga item keranjang/checkout langsung dari data harga
 * yang sudah dihitung oleh Backend (activeBatches, hargaClearance, tieringPrices),
 * sehingga harga di Keranjang & Nota Checkout 100% identik dengan tagihan POST /api/orders.
 */
export function evaluateCartItemPricing(
  product: ProductCatalogResponse,
  qty: number,
  tipeAkun?: string
): CartItemPricingResult {
  const safeQty = Number.isNaN(qty) || qty < 1 ? 1 : Math.floor(qty);
  const hargaAsli =
    typeof product.hargaEceran === 'number' && !Number.isNaN(product.hargaEceran)
      ? product.hargaEceran
      : 0;
  const originalSubtotal = hargaAsli * safeQty;

  // 1. Cek apakah kuantitas memenuhi aturan TieringPrice dari backend
  let tierUnitPrice: number | null = null;
  let tierLabel: string | null = null;

  if (Array.isArray(product.tieringPrices) && product.tieringPrices.length > 0) {
    const exactTier = product.tieringPrices.find(
      (t) => safeQty >= t.minQty && (t.maxQty == null || safeQty <= t.maxQty)
    );
    if (exactTier) {
      tierUnitPrice = exactTier.hargaPerUnit;
      tierLabel = `Harga Grosir Tier ${exactTier.minQty}${
        exactTier.maxQty ? `-${exactTier.maxQty}` : '+'
      } pcs`;
    } else {
      const eligibleTiers = product.tieringPrices
        .filter((t) => safeQty >= t.minQty)
        .sort((a, b) => b.minQty - a.minQty);
      if (eligibleTiers.length > 0) {
        const bestTier = eligibleTiers[0];
        tierUnitPrice = bestTier.hargaPerUnit;
        tierLabel = `Harga Grosir Tier ${bestTier.minQty}+ pcs`;
      }
    }
  } else if (tipeAkun === 'B2B' && hargaAsli > 0) {
    tierUnitPrice = Math.round(hargaAsli * 0.92);
    tierLabel = 'Diskon Mitra B2B (-8%)';
  }

  const lines: CartItemPriceLine[] = [];

  // 2. Simulasikan alokasi FEFO menggunakan activeBatches dari backend jika tersedia
  if (Array.isArray(product.activeBatches) && product.activeBatches.length > 0) {
    let remaining = safeQty;
    for (const batch of product.activeBatches) {
      if (remaining <= 0) break;
      const available =
        typeof batch.stokOnline === 'number' && batch.stokOnline > 0
          ? batch.stokOnline
          : 0;
      if (available <= 0) continue;

      const taken = Math.min(available, remaining);
      remaining -= taken;

      let chosenPrice =
        typeof batch.hargaEfektif === 'number' && batch.hargaEfektif > 0
          ? batch.hargaEfektif
          : hargaAsli;
      let chosenLabel =
        batch.labelDeal || (chosenPrice < hargaAsli ? 'Promo Batch FEFO' : 'Harga Normal');

      if (tierUnitPrice !== null && tierUnitPrice < chosenPrice) {
        chosenPrice = tierUnitPrice;
        chosenLabel = tierLabel || 'Harga Grosir';
      }

      lines.push({
        batchId: batch.idProdBatch,
        qty: taken,
        unitPrice: chosenPrice,
        subtotal: chosenPrice * taken,
        label: chosenLabel,
        isDiscounted: chosenPrice < hargaAsli,
      });
    }

    if (remaining > 0) {
      const fallbackPrice =
        tierUnitPrice !== null && tierUnitPrice < hargaAsli
          ? tierUnitPrice
          : hargaAsli;
      lines.push({
        qty: remaining,
        unitPrice: fallbackPrice,
        subtotal: fallbackPrice * remaining,
        label:
          fallbackPrice < hargaAsli ? tierLabel || 'Harga Grosir' : 'Harga Normal',
        isDiscounted: fallbackPrice < hargaAsli,
      });
    }
  } else {
    // Fallback jika activeBatches belum ada di cache lama: gunakan stokClearance & hargaClearance dari backend
    const stokDeal =
      product.isClearance &&
      typeof product.stokClearance === 'number' &&
      product.stokClearance > 0
        ? product.stokClearance
        : 0;
    const hargaDeal =
      typeof product.hargaClearance === 'number' && product.hargaClearance > 0
        ? product.hargaClearance
        : typeof product.hargaSetelahDiskon === 'number' &&
            product.hargaSetelahDiskon > 0
          ? product.hargaSetelahDiskon
          : hargaAsli;

    const dealQty = Math.min(safeQty, stokDeal);
    const regularQty = safeQty - dealQty;

    if (dealQty > 0) {
      const bestDealUnitPrice =
        tierUnitPrice !== null && tierUnitPrice < hargaDeal
          ? tierUnitPrice
          : hargaDeal;
      const bestDealLabel =
        tierUnitPrice !== null && tierUnitPrice < hargaDeal
          ? tierLabel || 'Harga Grosir'
          : product.labelDeal || 'Promo FEFO Deal';

      lines.push({
        qty: dealQty,
        unitPrice: bestDealUnitPrice,
        subtotal: bestDealUnitPrice * dealQty,
        label: bestDealLabel,
        isDiscounted: bestDealUnitPrice < hargaAsli,
      });
    }

    if (regularQty > 0) {
      const regUnitPrice =
        tierUnitPrice !== null && tierUnitPrice < hargaAsli
          ? tierUnitPrice
          : hargaAsli;
      lines.push({
        qty: regularQty,
        unitPrice: regUnitPrice,
        subtotal: regUnitPrice * regularQty,
        label:
          regUnitPrice < hargaAsli ? tierLabel || 'Harga Grosir' : 'Harga Normal',
        isDiscounted: regUnitPrice < hargaAsli,
      });
    }
  }

  const finalSubtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
  const savedAmount = Math.max(0, originalSubtotal - finalSubtotal);
  const effectiveUnitPrice = safeQty > 0 ? Math.round(finalSubtotal / safeQty) : hargaAsli;
  const discountedLine = lines.find((l) => l.isDiscounted);

  return {
    originalUnitPrice: hargaAsli,
    originalSubtotal,
    finalSubtotal,
    savedAmount,
    effectiveUnitPrice,
    hasDiscount: finalSubtotal < originalSubtotal,
    primaryPromoLabel: discountedLine ? discountedLine.label : null,
    lines,
  };
}

export function formatRupiah(nominal: number): string {
  const safeNominal =
    typeof nominal === 'number' && !Number.isNaN(nominal) ? nominal : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeNominal);
}

export function formatTanggalIndo(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Memformat estimasiTiba (contoh: "2026-11-08T11:35:00.351328")
 * menjadi "Hari ini, sebelum 11.35" dengan membuang detik & milidetik.
 */
export function formatEstimasiTiba(
  raw?: string | null,
  jadwalHariIni?: boolean,
  todayYmd?: string
): string {
  if (!raw) return 'Menunggu jadwal';
  const trimmed = raw.trim();

  // Menangkap format YYYY-MM-DDTHH:mm:ss atau dengan milidetik (.SSSSSS)
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
  );
  if (isoMatch) {
    const [, year, monthStr, dayStr, hour, minute] = isoMatch;
    const ymd = `${year}-${monthStr}-${dayStr}`;
    const jamMenit = `${hour}.${minute}`;

    if (jadwalHariIni === true || (todayYmd && ymd === todayYmd)) {
      return `Hari ini, sebelum ${jamMenit}`;
    }
    if (jadwalHariIni === false) {
      return `Besok, sebelum ${jamMenit}`;
    }

    const dayNum = parseInt(dayStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const monthName = NAMA_BULAN_PENDEK[monthIdx] || monthStr;
    return `${dayNum} ${monthName} ${year}, sebelum ${jamMenit}`;
  }

  // Jika formatnya hanya jam (HH:mm:ss)
  const timeOnlyMatch = trimmed.match(/^(\d{2}):(\d{2})/);
  if (timeOnlyMatch) {
    const [, hour, minute] = timeOnlyMatch;
    const prefix = jadwalHariIni === false ? 'Besok' : 'Hari ini';
    return `${prefix}, sebelum ${hour}.${minute}`;
  }

  return trimmed.replace(/:\d{2}(\.\d+)?$/, '');
}

/**
 * Memformat timestamp umum (paidAt / expiredAt) tanpa detik & milidetik
 * Contoh: "2026-11-08T11:35:00.351328" -> "8 Nov 2026, 11.35 WIB"
 */
export function formatWaktuSingkat(raw?: string | null): string {
  if (!raw) return '-';
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
  );
  if (isoMatch) {
    const [, year, monthStr, dayStr, hour, minute] = isoMatch;
    const dayNum = parseInt(dayStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const monthName = NAMA_BULAN_PENDEK[monthIdx] || monthStr;
    return `${dayNum} ${monthName} ${year}, ${hour}.${minute} WIB`;
  }
  return trimmed.replace(/:\d{2}(\.\d+)?$/, '');
}

export function formatDateTimeId(raw?: string | null): string {
  return formatWaktuSingkat(raw);
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan pada server.'
): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | {
          message?: string;
          detail?: string;
          error?: string;
          errors?: Record<string, string> | string[];
        }
      | string
      | undefined;

    if (typeof data === 'string' && data.trim().length > 0) {
      return data;
    }
    if (data && typeof data === 'object') {
      if (data.message) return data.message;
      if (data.detail) return data.detail;
      if (data.errors) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          return data.errors.join(', ');
        }
        const values = Object.values(data.errors);
        if (values.length > 0) return values.join(', ');
      }
      if (data.error) return data.error;
    }
    if (status === 403) {
      return 'Anda tidak memiliki akses untuk melakukan tindakan ini (403).';
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}