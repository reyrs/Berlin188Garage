import { Order } from '../types';

// Kapan sebuah order mulai "ngantre nunggu bay" — dari jam SPK-nya
// dikirim, bukan jam mobil check-in. Mobil yang lama didiagnosis (SPK
// telat dikirim) nggak seharusnya nyerobot antrian slot dari mobil lain
// yang SPK-nya udah lebih dulu terkirim meski check-in belakangan.
export function spkSentAt(order: Order): number {
  const evt = order.timeline.find(t => t.title === 'SPK Dikirim ke Mekanik');
  return evt ? new Date(evt.timestamp).getTime() : new Date(order.createdAt).getTime();
}

export function findOldestWaitingForSlot(orders: Order[], excludeOrderId: string): Order | null {
  const waiting = orders
    .filter(o => o.id !== excludeOrderId && o.spkSent && o.status !== 'selesai' && !o.slotNumber)
    .sort((a, b) => spkSentAt(a) - spkSentAt(b));
  return waiting[0] || null;
}

// Dipanggil dari SETIAP titik yang bisa bikin order jadi 'selesai' —
// bukan cuma handleUpdateOrderStatus, karena di pemakaian nyata jalur
// yang beneran dipakai adalah handleConfirmPayment (pelunasan), bukan
// handleUpdateOrderStatus dengan status 'selesai' (nggak ada tombol UI
// yang manggil itu).
export function computeSlotBackfill(orders: Order[], finishingOrder: Order | undefined): { backfillOrderId: string; freedSlot: number } | null {
  if (!finishingOrder?.slotNumber) return null;
  const candidate = findOldestWaitingForSlot(orders, finishingOrder.id);
  if (!candidate) return null;
  return { backfillOrderId: candidate.id, freedSlot: finishingOrder.slotNumber };
}
