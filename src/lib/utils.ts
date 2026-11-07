import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';
import { ProductCatalogResponse } from '@/types/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProductStock(product: ProductCatalogResponse): number {
  const rawStock = product.totalStokOnline;
  if (typeof rawStock === 'number' && !Number.isNaN(rawStock)) {
    return rawStock;
  }
  return 99;
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