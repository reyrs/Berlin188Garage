import { create } from 'zustand';
import type { Order, DiagnosticFinding, ServiceItem, CashTransaction } from '@shared/types';
import { genId } from '@shared/id';
import { computeSlotBackfill } from '@shared/slotAllocation';
import {
  fetchOrders, createOrder, updateOrder, updateOrderJsonb, deleteOrder,
} from '@shared/db';
import { useFinanceStore } from './financeStore';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;

  setOrders: (orders: Order[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  addOrder: (order: Order) => Promise<Order | null>;
  deleteOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: Order['status'], description: string, actorName?: string) => void;
  addFinding: (orderId: string, finding: any) => void;
  returnFindingToGudang: (orderId: string, findingId: string, actorName?: string) => void;
  approveServiceItem: (orderId: string, itemId: string, actorName?: string) => void;
  rejectServiceItem: (orderId: string, itemId: string, actorName?: string) => void;
  updateServiceItems: (orderId: string, items: ServiceItem[]) => void;
  updateOrder: (orderId: string, fields: Partial<Order>) => void;
  sendSPK: (orderId: string, mechanicId: string | undefined, mechanicName: string) => void;
  issueInvoice: (orderId: string, actorName?: string) => void;
  confirmPayment: (orderId: string, method: Order['paymentMethod'], destination?: string, proofUrl?: string) => void;
  confirmDPPayment: (orderId: string, method: Order['paymentMethod'], dpAmount: number, destination?: string, proofUrl?: string) => void;
  loadOrders: () => Promise<void>;
}

const statusTitles: Record<Order['status'], string> = {
  antre: 'Masuk Antrian',
  dikerjakan: 'Mulai Dikerjakan',
  temuan_dilaporkan: 'Temuan Dilaporkan ke Customer',
  menunggu_pembayaran: 'Selesai — Menunggu Pembayaran',
  selesai: 'Kendaraan Diserahkan',
};

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  setOrders: (orders) => set({ orders }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const fromDB = await fetchOrders();
      const current = get().orders;
      const dbMap = new Map(fromDB.map((o) => [o.id, o]));
      const currentIds = new Set(current.map((o) => o.id));
      const dbIds = new Set(fromDB.map((o) => o.id));

      const merged: Order[] = [];

      for (const local of current) {
        const db = dbMap.get(local.id);
        if (!db) {
          // Order ada di local tapi belum di DB → likely baru dibuat via optimistic add, keep local
          merged.push(local);
        } else if ((local.timeline?.length ?? 0) > (db.timeline?.length ?? 0)) {
          // Local punya timeline lebih banyak → ada optimistic updates yang belum sync ke DB, keep local
          merged.push(local);
        } else {
          // DB version is authoritative
          merged.push(db);
        }
      }

      // Add DB orders that don't exist locally yet
      for (const db of fromDB) {
        if (!currentIds.has(db.id)) {
          merged.push(db);
        }
      }

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log(`[orderStore] loadOrders: local=${current.length} db=${fromDB.length} merged=${merged.length}`);
      set({ orders: merged, isLoading: false });
    } catch (err) {
      set({ error: 'Gagal memuat data WO dari database.', isLoading: false });
      console.error('Failed to fetch orders:', err);
    }
  },

  addOrder: async (order) => {
    set((state) => ({ orders: [order, ...state.orders] }));
    try {
      await createOrder(order);
      return order;
    } catch (err) {
      set((state) => ({ orders: state.orders.filter((o) => o.id !== order.id) }));
      console.error('Failed to save order:', err);
      return null;
    }
  },

  deleteOrder: (orderId) => {
    const { orders } = get();
    const removed = orders.find((o) => o.id === orderId);
    if (!removed) return;
    set((state) => ({ orders: state.orders.filter((o) => o.id !== orderId) }));
    deleteOrder(orderId).catch((err) => {
      console.error('Failed to delete order:', err);
      set((state) => ({ orders: [...state.orders, removed].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }));
    });
  },

  updateOrderStatus: (orderId, status, description, actorName = 'Sistem') => {
    const now = new Date().toISOString();
    const { orders } = get();
    const target = orders.find((o) => o.id === orderId);
    const previousStatus = target?.status;
    const backfill = status === 'selesai' ? computeSlotBackfill(orders, target) : null;

    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o, status,
            timeline: [...o.timeline, {
              id: genId('t'), status, timestamp: now,
              title: statusTitles[status], description, actor: actorName,
            }],
          };
        }
        if (backfill && o.id === backfill.backfillOrderId) {
          return { ...o, slotNumber: backfill.freedSlot };
        }
        return o;
      }),
    }));

    updateOrder(orderId, { status }).catch((err) => {
      console.error('Failed to update status:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, status: previousStatus ?? o.status } : o),
      }));
    });
    if (backfill) {
      updateOrder(backfill.backfillOrderId, { slotNumber: backfill.freedSlot }).catch((err) => {
        console.error('Failed to backfill slot:', err);
      });
    }
  },

  addFinding: (orderId, finding) => {
    const { orders } = get();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const updatedFindings = [...order.findings, finding];

    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          findings: updatedFindings,
          status: o.status === 'dikerjakan' ? 'temuan_dilaporkan' : o.status,
        };
      }),
    }));

    updateOrderJsonb(orderId, 'findings', updatedFindings).catch((err) => {
      console.error('Failed to add finding:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, findings: order.findings } : o),
      }));
    });
    if (order.status === 'dikerjakan') {
      updateOrder(orderId, { status: 'temuan_dilaporkan' }).catch((err) => {
        console.error('Failed to update status after finding:', err);
      });
    }
  },

  // Revisi alur manager 2026-08-13: bagian yang TIDAK disetujui pelanggan
  // nggak langsung dead-end 'rejected' — dikembalikan ke gudang buat
  // dibuatkan ulang jasa pengerjaan & sparepart (atau gudang yang akhirnya
  // memutuskan "tidak perlu dilanjutkan" lewat "Tidak Perlu Sparepart").
  // Ini strip semua serviceItems (part+jasa) punya temuan itu dan reset
  // status resolusinya, jadi balik muncul di WarehousePanel sebagai belum
  // di-estimasi. Nggak nge-restock warehouse_stock di sini (di luar akses
  // orderStore) — kalau part yang dibalikin sempat motong stok gudang,
  // gudang perlu cek manual pas bikin estimasi ulang.
  returnFindingToGudang: (orderId, findingId, actorName = 'Service Advisor') => {
    const { orders } = get();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const finding = order.findings.find((f) => f.id === findingId);
    if (!finding) return;
    const updatedItems = order.serviceItems.filter((i) => i.findingId !== findingId);
    const updatedFindings = order.findings.map((f) => f.id === findingId ? {
      ...f,
      status: 'pending' as const,
      approvedBy: undefined,
      offeredAt: undefined,
      warehouseResolved: false,
      resolvedPartName: undefined,
      resolvedPartSource: undefined,
      resolvedParts: [],
    } : f);
    const now = new Date().toISOString();
    const timelineEvent = {
      id: genId('t-return-gudang'), status: order.status,
      timestamp: now, title: 'Estimasi Dikembalikan ke Gudang',
      description: `${actorName} mengembalikan temuan "${finding.description}" ke gudang untuk dibuatkan ulang jasa pengerjaan & sparepart (estimasi sebelumnya tidak disetujui pelanggan).`,
      actor: actorName,
    };
    const updatedTimeline = [...order.timeline, timelineEvent];

    set((state) => ({
      orders: state.orders.map((o) => o.id === orderId
        ? { ...o, serviceItems: updatedItems, findings: updatedFindings, timeline: updatedTimeline }
        : o),
    }));

    updateOrder(orderId, { serviceItems: updatedItems, findings: updatedFindings, timeline: updatedTimeline }).catch((err) => {
      console.error('Failed to return finding to gudang:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, serviceItems: order.serviceItems, findings: order.findings, timeline: order.timeline } : o),
      }));
    });
  },

  approveServiceItem: (orderId, itemId, actorName = 'Service Advisor') => {
    const { orders } = get();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const item = order.serviceItems.find((i) => i.id === itemId);
    const updatedItems = order.serviceItems.map((i) =>
      i.id === itemId ? { ...i, status: 'approved' as const, approvedBy: 'advisor' as const } : i
    );

    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          serviceItems: updatedItems,
          timeline: [...o.timeline, {
            id: genId('t-approve-item'), status: o.status,
            timestamp: new Date().toISOString(),
            title: 'Estimasi Disetujui (dicatat SA)',
            description: `${actorName} mencatat persetujuan pelanggan atas ${item?.type === 'jasa' ? 'jasa' : 'sparepart'}: "${item?.name}".`,
            actor: actorName,
          }],
        };
      }),
    }));

    updateOrderJsonb(orderId, 'service_items', updatedItems).catch((err) => {
      console.error('Failed to approve service item:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, serviceItems: order.serviceItems } : o),
      }));
    });
  },

  rejectServiceItem: (orderId, itemId, actorName = 'Service Advisor') => {
    const { orders } = get();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const item = order.serviceItems.find((i) => i.id === itemId);
    const updatedItems = order.serviceItems.map((i) =>
      i.id === itemId ? { ...i, status: 'rejected' as const, approvedBy: 'advisor' as const } : i
    );

    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          serviceItems: updatedItems,
          timeline: [...o.timeline, {
            id: genId('t-reject-item'), status: o.status,
            timestamp: new Date().toISOString(),
            title: 'Estimasi Ditolak (dicatat SA)',
            description: `${actorName} mencatat penolakan pelanggan atas ${item?.type === 'jasa' ? 'jasa' : 'sparepart'}: "${item?.name}".`,
            actor: actorName,
          }],
        };
      }),
    }));

    updateOrderJsonb(orderId, 'service_items', updatedItems).catch((err) => {
      console.error('Failed to reject service item:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, serviceItems: order.serviceItems } : o),
      }));
    });
  },

  updateServiceItems: (orderId, items) => {
    const { orders } = get();
    const previous = orders.find((o) => o.id === orderId)?.serviceItems;
    set((state) => ({
      orders: state.orders.map((o) => o.id === orderId ? { ...o, serviceItems: items } : o),
    }));
    updateOrderJsonb(orderId, 'service_items', items).catch((err) => {
      console.error('Failed to update service items:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, serviceItems: previous ?? [] } : o),
      }));
    });
  },

  updateOrder: (orderId, fields) => {
    const { orders } = get();
    const previous = orders.find((o) => o.id === orderId);
    set((state) => ({
      orders: state.orders.map((o) => o.id === orderId ? { ...o, ...fields } : o),
    }));
    updateOrder(orderId, fields).catch((err) => {
      console.error('Failed to update order:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, ...previous } : o),
      }));
    });
  },

  sendSPK: (orderId, mechanicId, mechanicName) => {
    const now = new Date().toISOString();
    const { orders } = get();
    const existingOrder = orders.find((o) => o.id === orderId);
    // Revisi alur manager 2026-08-13: invoice (buat DP/pelunasan) diterbitkan
    // BARENG pas SPK dikirim, bukan nunggu pengerjaan kelar — jadi kasir bisa
    // langsung tagih DP begitu SPK jalan. invoicedAt cuma disetel kalau
    // belum ada (order lama yang udah pernah di-invoice manual nggak
    // ke-reset timestamp-nya).
    const invoicedAt = existingOrder?.invoicedAt ?? now;

    // Order ini mungkin udah punya bay (SPK terkirim sebelumnya, dipanggil
    // ulang) — kalau udah, jangan pindahin ke slot baru. Kalau belum, cari
    // nomor bay terkecil (1-10) yang lagi nggak dipakai order aktif manapun.
    let assignedSlot: number | undefined = existingOrder?.slotNumber;
    if (!assignedSlot) {
      const occupiedSlots = new Set(
        orders.filter((o) => o.status !== 'selesai' && o.slotNumber).map((o) => o.slotNumber)
      );
      for (let s = 1; s <= 10; s++) {
        if (!occupiedSlots.has(s)) { assignedSlot = s; break; }
      }
    }

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              assignedMechanicId: mechanicId,
              assignedMechanicName: mechanicName,
              spkSent: true,
              status: 'dikerjakan',
              slotNumber: assignedSlot,
              invoicedAt,
              timeline: [...o.timeline, {
                id: genId('t-spk'), status: 'dikerjakan' as const,
                timestamp: now, title: 'SPK Dikirim ke Mekanik',
                description: `SPK dikirim ke ${mechanicName}${assignedSlot ? ` — Bay ${assignedSlot}` : ' — semua slot penuh, nunggu bay kosong.'}`,
                actor: 'Service Advisor',
              }, ...(existingOrder?.invoicedAt ? [] : [{
                id: genId('t-invoice'), status: 'dikerjakan' as const,
                timestamp: now, title: 'Invoice Diterbitkan',
                description: 'Invoice diterbitkan bersamaan SPK — siap diproses DP atau pelunasan.',
                actor: 'Service Advisor',
              }]),],
            }
          : o
      ),
    }));

    updateOrder(orderId, {
      assignedMechanicId: mechanicId,
      assignedMechanicName: mechanicName,
      spkSent: true,
      status: 'dikerjakan',
      slotNumber: assignedSlot,
      invoicedAt,
    }).catch((err) => {
      console.error('Failed to send SPK:', err);
    });
  },

  // ACCOUNTING gate: invoice harus diterbitkan dulu sebelum pembayaran bisa
  // dicatat (revisi alur manager 2026-08-13). confirmPayment/confirmDPPayment
  // sendiri nggak nge-block di sisi store — gate-nya di UI (AccountingPanel
  // nyembunyiin tombol "Proses Bayar" sebelum invoicedAt ke-set).
  issueInvoice: (orderId, actorName = 'Kasir') => {
    const { orders } = get();
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.invoicedAt) return;
    const now = new Date().toISOString();

    set((state) => ({
      orders: state.orders.map((o) => o.id === orderId
        ? {
            ...o,
            invoicedAt: now,
            timeline: [...o.timeline, {
              id: genId('t-invoice'), status: o.status, timestamp: now,
              title: 'Invoice Diterbitkan',
              description: `${actorName} menerbitkan invoice — siap diproses pembayarannya.`,
              actor: actorName,
            }],
          }
        : o),
    }));

    updateOrder(orderId, { invoicedAt: now }).catch((err) => {
      console.error('Failed to issue invoice:', err);
      set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, invoicedAt: undefined } : o),
      }));
    });
  },

  confirmPayment: (orderId, method, destination, proofUrl) => {
    const now = new Date().toISOString();
    const { orders } = get();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const total = target.serviceItems
      .filter((i) => i.status !== 'rejected' && i.status !== 'pending')
      .reduce((s, i) => s + i.price * i.qty, 0);
    const dpAlreadyPaid = target.dpAmountPaid || 0;
    const remaining = total - dpAlreadyPaid;
    const backfill = computeSlotBackfill(orders, target);
    const txId = genId('TX');

    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'selesai' as const,
            paymentStatus: 'lunas' as const,
            paymentMethod: method,
            paymentDestination: destination,
            paidAt: now,
            timeline: [...o.timeline, {
              id: genId('t-pay'), status: 'selesai' as const,
              timestamp: now, title: 'Pembayaran Lunas',
              description: dpAlreadyPaid > 0
                ? `Pelunasan Rp ${remaining.toLocaleString('id-ID')} via ${method ? method.toUpperCase() : ''} (${destination || ''}) — dari total Rp ${total.toLocaleString('id-ID')}, DP sudah Rp ${dpAlreadyPaid.toLocaleString('id-ID')}.`
                : `Lunas Rp ${remaining.toLocaleString('id-ID')} via ${method ? method.toUpperCase() : ''} (${destination || ''}).`,
              actor: 'Kasir',
            }],
          };
        }
        if (backfill && o.id === backfill.backfillOrderId) {
          return { ...o, slotNumber: backfill.freedSlot };
        }
        return o;
      }),
    }));

    const tx: CashTransaction = {
      id: txId, orderId, customerName: target.customerName,
      amount: remaining, type: 'masuk', method: method || 'tunai',
      category: 'pendapatan_jasa',
      description: `Pembayaran ${orderId} — ${target.carBrand} ${target.carModel}`,
      timestamp: now,
      proofUrl,
    };
    useFinanceStore.getState().addTransaction(tx);

    updateOrder(orderId, { status: 'selesai', paymentStatus: 'lunas', paymentMethod: method, paymentDestination: destination, paidAt: now }).catch(console.error);
    if (backfill) {
      updateOrder(backfill.backfillOrderId, { slotNumber: backfill.freedSlot }).catch(console.error);
    }
  },

  confirmDPPayment: (orderId, method, dpAmount, destination, proofUrl) => {
    const now = new Date().toISOString();
    const { orders } = get();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const total = target.serviceItems
      .filter((i) => i.status !== 'rejected' && i.status !== 'pending')
      .reduce((s, i) => s + i.price * i.qty, 0);
    const remaining = total - dpAmount;
    const txId = genId('TX');

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              dpAmountPaid: dpAmount,
              paymentStatus: 'dp' as const,
              paymentMethod: method,
              paymentDestination: destination,
              timeline: [...o.timeline, {
                id: genId('t-dp'), status: o.status,
                timestamp: now, title: 'DP Dibayar',
                description: `DP Rp ${dpAmount.toLocaleString('id-ID')} via ${method ? method.toUpperCase() : ''} (${destination || ''}). Sisa Rp ${remaining.toLocaleString('id-ID')}.`,
                actor: 'Kasir',
              }],
            }
          : o
      ),
    }));

    const tx: CashTransaction = {
      id: txId, orderId, customerName: target.customerName,
      amount: dpAmount, type: 'masuk', method: method || 'tunai',
      category: 'pendapatan_jasa',
      description: `DP ${orderId} — Rp ${dpAmount.toLocaleString('id-ID')} (${target.carBrand} ${target.carModel})`,
      timestamp: now,
      proofUrl,
    };
    useFinanceStore.getState().addTransaction(tx);

    updateOrder(orderId, { dpAmountPaid: dpAmount, paymentStatus: 'dp', paymentMethod: method, paymentDestination: destination }).catch(console.error);
  },
}));
