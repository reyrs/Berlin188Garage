import type { Order } from './types';

export const STATUS_CONFIG: Record<Order['status'], { label: string; bg: string; text: string; border: string }> = {
  antre:               { label: 'Antre',               bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-700 dark:text-gray-300',      border: 'border-gray-200 dark:border-gray-700' },
  dikerjakan:           { label: 'Dikerjakan',          bg: 'bg-info-50 dark:bg-info-500/10',     text: 'text-info-600 dark:text-info-500',      border: 'border-info-100 dark:border-info-500/20' },
  temuan_dilaporkan:    { label: 'Menunggu Konfirmasi', bg: 'bg-warning-50 dark:bg-warning-500/10', text: 'text-warning-700 dark:text-warning-500', border: 'border-warning-100 dark:border-warning-500/20' },
  menunggu_pembayaran:  { label: 'Menunggu Pembayaran', bg: 'bg-berlin-gold/10',                  text: 'text-berlin-gold',                       border: 'border-berlin-gold/30' },
  selesai:              { label: 'Selesai',             bg: 'bg-success-50 dark:bg-success-500/10', text: 'text-success-700 dark:text-success-500', border: 'border-success-100 dark:border-success-500/20' },
};

export const STATUS_SOLID: Record<Order['status'], string> = {
  antre: 'bg-gray-400',
  dikerjakan: 'bg-info-500',
  temuan_dilaporkan: 'bg-warning-500',
  menunggu_pembayaran: 'bg-berlin-gold',
  selesai: 'bg-success-500',
};

export const STATUS_BORDER: Record<Order['status'], string> = {
  antre: 'border-gray-400',
  dikerjakan: 'border-info-500',
  temuan_dilaporkan: 'border-warning-500',
  menunggu_pembayaran: 'border-berlin-gold',
  selesai: 'border-success-500',
};

export const BADGE_CLASS = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border';

export const PAYMENT_LABEL: Record<string, string> = {
  tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', edc: 'EDC'
};

export const CAR_BRANDS = ['Mercedes-Benz', 'BMW', 'Audi', 'VW', 'MINI', 'Land Rover'] as const;

export function formatRupiah(num: number): string {
  return 'Rp ' + num.toLocaleString('id-ID');
}

export type KpiTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const KPI_TONE: Record<KpiTone, { bg: string; text: string; border: string }> = {
  success: { bg: 'bg-success-50 dark:bg-success-500/10', text: 'text-success-700 dark:text-success-500', border: 'border-success-100 dark:border-success-500/20' },
  warning: { bg: 'bg-warning-50 dark:bg-warning-500/10', text: 'text-warning-700 dark:text-warning-500', border: 'border-warning-100 dark:border-warning-500/20' },
  danger:  { bg: 'bg-danger-50 dark:bg-danger-500/10',   text: 'text-danger-600 dark:text-danger-500',   border: 'border-danger-100 dark:border-danger-500/20' },
  info:    { bg: 'bg-info-50 dark:bg-info-500/10',       text: 'text-info-600 dark:text-info-500',       border: 'border-info-100 dark:border-info-500/20' },
  neutral: { bg: 'bg-gray-100 dark:bg-gray-800',         text: 'text-gray-700 dark:text-gray-300',       border: 'border-gray-200 dark:border-gray-700' },
};
