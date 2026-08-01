import type { Order } from '../types';

export const STATUS_CONFIG: Record<Order['status'], { label: string; bg: string; text: string; border: string }> = {
  antre:               { label: 'Antre',               bg: 'bg-gray-100',      text: 'text-gray-700',      border: 'border-gray-200' },
  dikerjakan:           { label: 'Dikerjakan',          bg: 'bg-info-50',       text: 'text-info-600',      border: 'border-info-100' },
  temuan_dilaporkan:    { label: 'Menunggu Konfirmasi', bg: 'bg-warning-50',    text: 'text-warning-700',   border: 'border-warning-100' },
  menunggu_pembayaran:  { label: 'Menunggu Pembayaran', bg: 'bg-berlin-gold/10', text: 'text-berlin-gold',  border: 'border-berlin-gold/30' },
  selesai:              { label: 'Selesai',             bg: 'bg-success-50',    text: 'text-success-700',   border: 'border-success-100' },
};

// Solid fill tier of the same tokens — for bar charts / dots where a light
// bg + dark text badge pairing doesn't apply.
export const STATUS_SOLID: Record<Order['status'], string> = {
  antre: 'bg-gray-400',
  dikerjakan: 'bg-info-500',
  temuan_dilaporkan: 'bg-warning-500',
  menunggu_pembayaran: 'bg-berlin-gold',
  selesai: 'bg-success-500',
};

// Same tier, as a border-color utility — for accent stripes/edges on dark cards.
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

// Shared tone tokens for KPI tiles / stat cards across staff panels — use
// instead of building Tailwind class names dynamically (which Tailwind can't
// statically detect and won't generate at build time).
export type KpiTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const KPI_TONE: Record<KpiTone, { bg: string; text: string; border: string }> = {
  success: { bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-100' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-100' },
  danger:  { bg: 'bg-danger-50',  text: 'text-danger-600',  border: 'border-danger-100' },
  info:    { bg: 'bg-info-50',    text: 'text-info-600',    border: 'border-info-100' },
  neutral: { bg: 'bg-gray-100',   text: 'text-gray-700',    border: 'border-gray-200' },
};
