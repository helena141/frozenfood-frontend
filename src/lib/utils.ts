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