import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench, LogOut, Bell, ShieldAlert,
  LayoutDashboard, FilePlus, ClipboardList, Package, Monitor, BookOpen, FileBarChart
} from 'lucide-react';

// Components
import LandingPage from './components/LandingPage';
import TrackingPortal from './components/TrackingPortal';
import LoginModal from './components/LoginModal';
import AdvisorPanel from './components/AdvisorPanel';
import AdvisorDashboard from './components/AdvisorDashboard';
import AccountingPanel from './components/AccountingPanel';
import OwnerPanel from './components/OwnerPanel';
import WarehousePanel from './components/WarehousePanel';
import SlotBoard from './components/SlotBoard';
import TechnicianPanel from './components/TechnicianPanel';
import ManagerPanel from './components/ManagerPanel';
import FinanceReportPanel from './components/FinanceReportPanel';
import MarketingPanel from './components/MarketingPanel';
import ProductMarketplace from './components/ProductMarketplace';

// Types & Data
import { Order, User, CashTransaction, CashClosing, Expense, WarehouseStockItem } from './types';
import {
  INITIAL_ORDERS, INITIAL_TRANSACTIONS,
  INITIAL_CLOSINGS, INITIAL_EXPENSES, MOCK_WAREHOUSE_STOCK,
} from './data/mockData';

// Supabase
import {
  fetchOrders, createOrder, updateOrder, updateOrderJsonb,
  fetchTransactions, createTransaction,
  fetchExpenses, createExpense,
  fetchClosings, createClosing,
  fetchWarehouseStock, updateStockQuantity,
  fetchProfiles, seedWarehouseStock,
} from './lib/db';
import { getSession, onAuthStateChange, signOutStaff } from './lib/auth';

type ActiveTab = 'dashboard' | 'create_order' | 'track_dashboard' | 'accounting' | 'gudang' | 'monitor_service' | 'monitor_tunggu' | 'spk' | 'manager_dashboard' | 'marketing' | 'finance_report';

// Kapan sebuah order mulai "ngantre nunggu bay" — dari jam SPK-nya
// dikirim, bukan jam mobil check-in. Mobil yang lama didiagnosis (SPK
// telat dikirim) nggak seharusnya nyerobot antrian slot dari mobil lain
// yang SPK-nya udah lebih dulu terkirim meski check-in belakangan.
function spkSentAt(order: Order): number {
  const evt = order.timeline.find(t => t.title === 'SPK Dikirim ke Mekanik');
  return evt ? new Date(evt.timestamp).getTime() : new Date(order.createdAt).getTime();
}

function findOldestWaitingForSlot(orders: Order[], excludeOrderId: string): Order | null {
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
function computeSlotBackfill(orders: Order[], finishingOrder: Order | undefined): { backfillOrderId: string; freedSlot: number } | null {
  if (!finishingOrder?.slotNumber) return null;
  const candidate = findOldestWaitingForSlot(orders, finishingOrder.id);
  if (!candidate) return null;
  return { backfillOrderId: candidate.id, freedSlot: finishingOrder.slotNumber };
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [transactions, setTransactions] = useState<CashTransaction[]>(INITIAL_TRANSACTIONS);
  const [closings, setClosings] = useState<CashClosing[]>(INITIAL_CLOSINGS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>(MOCK_WAREHOUSE_STOCK);
  const [staffDirectory, setStaffDirectory] = useState<User[]>([]);
  const [activeStaffUser, setActiveStaffUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'tracking' | 'staff_portal' | 'monitor_service' | 'monitor_tunggu' | 'marketplace'>('landing');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [sandboxNotification, setSandboxNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSandboxNotification(msg);
    setTimeout(() => setSandboxNotification(null), 5000);
  };

  // ---- LOAD DATA FROM SUPABASE ----
  const loadData = useCallback(async () => {
    setIsLoading(true);

    await seedWarehouseStock(MOCK_WAREHOUSE_STOCK);

    const results = await Promise.allSettled([
      fetchOrders(),
      fetchTransactions(),
      fetchExpenses(),
      fetchClosings(),
      fetchWarehouseStock(),
      fetchProfiles(),
    ]);
    const [ordersResult, transactionsResult, expensesResult, closingsResult, stockResult, profilesResult] = results;

    if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value);
    if (transactionsResult.status === 'fulfilled') setTransactions(transactionsResult.value);
    if (expensesResult.status === 'fulfilled') setExpenses(expensesResult.value);
    if (closingsResult.status === 'fulfilled') setClosings(closingsResult.value);
    if (stockResult.status === 'fulfilled') {
      setWarehouseStock(stockResult.value.length > 0 ? stockResult.value : MOCK_WAREHOUSE_STOCK);
    }
    if (profilesResult.status === 'fulfilled') setStaffDirectory(profilesResult.value);

    const failedLabels: Record<number, string> = { 0: 'WO', 1: 'transaksi', 2: 'pengeluaran', 3: 'closing', 4: 'stok gudang', 5: 'direktori staf' };
    const failures = results
      .map((r, i) => (r.status === 'rejected' ? failedLabels[i] : null))
      .filter((label): label is string => label !== null);

    if (failures.length > 0) {
      console.error('Supabase load errors for:', failures, results);
      setDbError(`Gagal memuat data ${failures.join(', ')} dari database. Data yang berhasil dimuat tetap ditampilkan.`);
    } else {
      setDbError(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- RESTORE STAFF SESSION ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getSession();
        if (!session || cancelled) return;
        const profiles = await fetchProfiles();
        const profile = profiles.find((p) => p.id === session.user.id);
        if (profile && !cancelled) {
          setActiveStaffUser(profile);
          setCurrentView((v) => (v === 'landing' ? 'staff_portal' : v));
        }
      } catch (err) {
        console.error('Failed to restore staff session:', err);
      }
    })();

    const subscription = onAuthStateChange((session) => {
      if (!session) setActiveStaffUser(null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ---- ORDER HANDLERS ----
  const handleAddOrder = useCallback((newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    createOrder(newOrder)
      .then(() => {
        showNotification(`✅ WO baru ${newOrder.id} berhasil dibuat — SPK siap dicetak.`);
      })
      .catch(err => {
        console.error('Failed to save order:', err);
        setOrders(prev => prev.filter(o => o.id !== newOrder.id));
        showNotification(`❌ WO ${newOrder.id} gagal disimpan ke database. Coba buat ulang.`);
      });
  }, []);

  const handleUpdateOrderStatus = useCallback((orderId: string, status: Order['status'], description: string) => {
    const now = new Date().toISOString();
    const statusTitles: Record<Order['status'], string> = {
      antre: 'Masuk Antrian',
      dikerjakan: 'Mulai Dikerjakan',
      temuan_dilaporkan: 'Temuan Dilaporkan ke Customer',
      menunggu_pembayaran: 'Selesai — Menunggu Pembayaran',
      selesai: 'Kendaraan Diserahkan'
    };

    // Nggak ada tombol di UI manapun yang manggil fungsi ini dengan status
    // 'selesai' — jalur nyata order jadi selesai itu handleConfirmPayment.
    // Backfill di sini tetap dijaga buat jaga-jaga kalau suatu saat ada
    // jalur lain yang manggil dengan 'selesai', tapi jangan andelin ini
    // sebagai satu-satunya tempat backfill jalan (lihat handleConfirmPayment).
    const target = orders.find(o => o.id === orderId);
    const backfill = status === 'selesai' ? computeSlotBackfill(orders, target) : null;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          timeline: [...o.timeline, {
            id: `t-${Date.now()}`,
            status,
            timestamp: now,
            title: statusTitles[status],
            description,
            actor: activeStaffUser?.name || 'Sistem'
          }]
        };
      }
      if (backfill && o.id === backfill.backfillOrderId) {
        return { ...o, slotNumber: backfill.freedSlot };
      }
      return o;
    }));

    updateOrder(orderId, { status }).catch(err => {
      console.error('Failed to update status:', err);
    });
    if (backfill) {
      updateOrder(backfill.backfillOrderId, { slotNumber: backfill.freedSlot }).catch(err => {
        console.error('Failed to backfill slot:', err);
      });
    }
  }, [activeStaffUser, orders]);

  const handleAddFinding = useCallback((orderId: string, finding: any) => {
    let newStatus: Order['status'] | null = null;
    const order = orders.find(o => o.id === orderId);
    const updatedFindings = order ? [...order.findings, finding] : [finding];

    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      newStatus = o.status === 'dikerjakan' ? 'temuan_dilaporkan' : o.status;
      return {
        ...o,
        findings: updatedFindings,
        status: newStatus || o.status,
      };
    }));

    updateOrderJsonb(orderId, 'findings', updatedFindings).catch(err => {
      console.error('Failed to add finding:', err);
    });
    if (order?.status === 'dikerjakan') {
      updateOrder(orderId, { status: 'temuan_dilaporkan' }).catch(() => {});
    }

    showNotification(`📋 Temuan baru di ${orderId} — customer akan menerima notifikasi.`);
  }, [orders]);

  const handleApproveFinding = useCallback((orderId: string, findingId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const finding = o.findings.find(f => f.id === findingId);
      return {
        ...o,
        findings: o.findings.map(f => f.id === findingId ? { ...f, status: 'approved' as const } : f),
        timeline: [...o.timeline, {
          id: `t-approve-${Date.now()}`,
          status: o.status,
          timestamp: new Date().toISOString(),
          title: 'Temuan Disetujui Pemilik',
          description: `Pemilik menyetujui temuan: "${finding?.description}". Pengerjaan dilanjutkan.`,
          actor: 'Pemilik Kendaraan'
        }]
      };
    }));

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedFindings = order.findings.map(f =>
        f.id === findingId ? { ...f, status: 'approved' as const } : f
      );
      updateOrderJsonb(orderId, 'findings', updatedFindings).catch(err => {
        console.error('Failed to approve finding:', err);
      });
    }
  }, [orders]);

  const handleRejectFinding = useCallback((orderId: string, findingId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const finding = o.findings.find(f => f.id === findingId);
      return {
        ...o,
        findings: o.findings.map(f => f.id === findingId ? { ...f, status: 'rejected' as const } : f),
        timeline: [...o.timeline, {
          id: `t-reject-${Date.now()}`,
          status: o.status,
          timestamp: new Date().toISOString(),
          title: 'Temuan Ditolak Pemilik',
          description: `Pemilik menolak tindakan: "${finding?.description}". Pekerjaan dilewati.`,
          actor: 'Pemilik Kendaraan'
        }]
      };
    }));

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedFindings = order.findings.map(f =>
        f.id === findingId ? { ...f, status: 'rejected' as const } : f
      );
      updateOrderJsonb(orderId, 'findings', updatedFindings).catch(err => {
        console.error('Failed to reject finding:', err);
      });
    }
  }, [orders]);

  const handleApproveServiceItem = useCallback((orderId: string, itemId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const item = o.serviceItems.find(i => i.id === itemId);
      return {
        ...o,
        serviceItems: o.serviceItems.map(i => i.id === itemId ? { ...i, status: 'approved' as const } : i),
        timeline: [...o.timeline, {
          id: `t-approve-item-${Date.now()}`,
          status: o.status,
          timestamp: new Date().toISOString(),
          title: 'Estimasi Disetujui Pemilik',
          description: `Pemilik menyetujui ${item?.type === 'jasa' ? 'jasa' : 'sparepart'}: "${item?.name}".`,
          actor: 'Pemilik Kendaraan'
        }]
      };
    }));

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedItems = order.serviceItems.map(i =>
        i.id === itemId ? { ...i, status: 'approved' as const } : i
      );
      updateOrderJsonb(orderId, 'service_items', updatedItems).catch(err => {
        console.error('Failed to approve service item:', err);
      });
    }
  }, [orders]);

  const handleRejectServiceItem = useCallback((orderId: string, itemId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const item = o.serviceItems.find(i => i.id === itemId);
      return {
        ...o,
        serviceItems: o.serviceItems.map(i => i.id === itemId ? { ...i, status: 'rejected' as const } : i),
        timeline: [...o.timeline, {
          id: `t-reject-item-${Date.now()}`,
          status: o.status,
          timestamp: new Date().toISOString(),
          title: 'Estimasi Ditolak Pemilik',
          description: `Pemilik menolak ${item?.type === 'jasa' ? 'jasa' : 'sparepart'}: "${item?.name}".`,
          actor: 'Pemilik Kendaraan'
        }]
      };
    }));

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedItems = order.serviceItems.map(i =>
        i.id === itemId ? { ...i, status: 'rejected' as const } : i
      );
      updateOrderJsonb(orderId, 'service_items', updatedItems).catch(err => {
        console.error('Failed to reject service item:', err);
      });
    }
  }, [orders]);

  const handleUpdateServiceItems = useCallback((orderId: string, items: any[]) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, serviceItems: items } : o));
    updateOrderJsonb(orderId, 'service_items', items).catch(err => {
      console.error('Failed to update service items:', err);
    });
  }, []);

  const handleUpdateOrder = useCallback((orderId: string, fields: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fields } : o));
    updateOrder(orderId, fields).catch(err => {
      console.error('Failed to update order:', err);
    });
  }, []);

  const handleSendSPK = useCallback((orderId: string, mechanicId: string, mechanicName: string) => {
    const now = new Date().toISOString();
    const existingOrder = orders.find(o => o.id === orderId);

    // Kalau order ini udah punya bay (SPK kekirim sebelumnya, dipanggil
    // ulang entah dari mana), jangan pindahin ke slot baru — mobilnya
    // masih fisik di bay yang sama. UI-nya sendiri udah nyembunyiin tombol
    // ini setelah spkSent (AdvisorDashboard.tsx), ini lapisan jaga-jaga kedua.
    let assignedSlot: number | undefined = existingOrder?.slotNumber;
    if (!assignedSlot) {
      // Papan kerja cuma punya 10 bay fisik — pakai nomor terkecil yang lagi
      // nggak dipakai order aktif manapun. Kalau ke-10 slot penuh, SPK tetap
      // terkirim (nggak ngeblok kerjaan), cuma slotNumber dibiarkan kosong
      // dulu sampai ada slot yang kebebas (lihat handleConfirmPayment).
      const occupiedSlots = new Set(orders.filter(o => o.status !== 'selesai' && o.slotNumber).map(o => o.slotNumber));
      for (let s = 1; s <= 10; s++) {
        if (!occupiedSlots.has(s)) { assignedSlot = s; break; }
      }
    }

    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        status: 'dikerjakan' as const,
        spkSent: true,
        assignedMechanicId: mechanicId,
        assignedMechanicName: mechanicName,
        slotNumber: assignedSlot,
        timeline: [...o.timeline, {
          id: `t-spk-${Date.now()}`,
          status: 'dikerjakan' as const,
          timestamp: now,
          title: 'SPK Dikirim ke Mekanik',
          description: `SA ${activeStaffUser?.name || ''} mengirimkan SPK ke ${mechanicName}. Pengerjaan dimulai.`,
          actor: activeStaffUser?.name || 'SA'
        }]
      };
    }));

    updateOrder(orderId, {
      status: 'dikerjakan',
      spkSent: true,
      assignedMechanicId: mechanicId,
      assignedMechanicName: mechanicName,
      slotNumber: assignedSlot,
    }).catch(err => {
      console.error('Failed to send SPK:', err);
    });
    showNotification(
      assignedSlot
        ? `📋 SPK ${orderId} dikirim ke ${mechanicName} — Slot ${assignedSlot}.`
        : `📋 SPK ${orderId} dikirim ke ${mechanicName} — semua slot penuh, nunggu bay kosong.`
    );
  }, [activeStaffUser, orders]);

  const handleUpdateFindingCost = useCallback((orderId: string, findingId: string, cost: number) => {
    setOrders(prev => prev.map(o =>
      o.id !== orderId ? o : {
        ...o,
        findings: o.findings.map(f => f.id === findingId ? { ...f, estimatedCost: cost } : f)
      }
    ));

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedFindings = order.findings.map(f =>
        f.id === findingId ? { ...f, estimatedCost: cost } : f
      );
      updateOrderJsonb(orderId, 'findings', updatedFindings).catch(err => {
        console.error('Failed to update finding cost:', err);
      });
    }
  }, [orders]);

  // ---- PAYMENT / ACCOUNTING HANDLERS ----
  const PAYMENT_LABEL: Record<string, string> = {
    tunai: 'Tunai', transfer: 'Transfer Bank', qris: 'QRIS', edc: 'EDC Debit/Kredit'
  };

  const createTransactionRecord = useCallback(async (
    orderId: string, amount: number, method: 'tunai' | 'transfer' | 'qris' | 'edc',
    type: 'masuk' | 'keluar', category: CashTransaction['category'],
    description: string, customerName?: string
  ) => {
    const tx: CashTransaction = {
      id: `TX-${Date.now()}`,
      orderId,
      customerName,
      amount,
      type,
      method,
      category,
      description,
      timestamp: new Date().toISOString(),
      createdBy: activeStaffUser?.name
    };
    setTransactions(prev => [tx, ...prev]);
    await createTransaction(tx);
    return tx;
  }, [activeStaffUser]);

  const handleConfirmPayment = useCallback((orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dest: string) => {
    const order = orders.find(o => o.id === orderId);
    const total = order?.serviceItems
      .filter(i => i.status !== 'rejected' && i.status !== 'pending')
      .reduce((s, i) => s + i.price * i.qty, 0) || 0;
    const dpAlreadyPaid = order?.dpAmountPaid || 0;
    const remaining = total - dpAlreadyPaid;
    const now = new Date().toISOString();

    // Ini jalur NYATA order jadi 'selesai' di pemakaian sehari-hari (bukan
    // handleUpdateOrderStatus — nggak ada tombol yang manggil itu dengan
    // status 'selesai') — jadi backfill slot ke antrian berikutnya harus
    // dipicu dari sini.
    const backfill = computeSlotBackfill(orders, order);

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'selesai' as const,
          paymentStatus: 'lunas' as const,
          paymentMethod: method,
          paymentDestination: dest,
          paidAt: now,
          timeline: [...o.timeline, {
            id: `t-pay-${Date.now()}`,
            status: 'selesai' as const,
            timestamp: now,
            title: 'Pembayaran Lunas',
            description: dpAlreadyPaid > 0
              ? `Pelunasan Rp ${remaining.toLocaleString('id-ID')} via ${PAYMENT_LABEL[method] || method.toUpperCase()} (${dest}) — dari total Rp ${total.toLocaleString('id-ID')}, DP sudah Rp ${dpAlreadyPaid.toLocaleString('id-ID')}.`
              : `Lunas Rp ${remaining.toLocaleString('id-ID')} via ${PAYMENT_LABEL[method] || method.toUpperCase()} (${dest}).`,
            actor: activeStaffUser?.name || 'Kasir'
          }]
        };
      }
      if (backfill && o.id === backfill.backfillOrderId) {
        return { ...o, slotNumber: backfill.freedSlot };
      }
      return o;
    }));

    Promise.all([
      updateOrder(orderId, {
        status: 'selesai', paymentStatus: 'lunas',
        paymentMethod: method, paymentDestination: dest, paidAt: now,
      }),
      createTransactionRecord(orderId, remaining, method, 'masuk', 'pendapatan_jasa',
        `Pembayaran ${orderId} — ${order?.carBrand} ${order?.carModel}`, order?.customerName),
      ...(backfill ? [updateOrder(backfill.backfillOrderId, { slotNumber: backfill.freedSlot })] : []),
    ]).catch(err => {
      console.error('Failed to process payment:', err);
      showNotification('❌ Gagal memproses pembayaran');
    });

    showNotification(`💰 Pembayaran ${orderId} lunas — Rp ${remaining.toLocaleString('id-ID')}`);
  }, [orders, activeStaffUser, createTransactionRecord]);

  const handleConfirmDPPayment = useCallback((orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dpAmount: number, dest: string) => {
    const order = orders.find(o => o.id === orderId);
    const now = new Date().toISOString();
    const total = order?.serviceItems
      .filter(i => i.status !== 'rejected' && i.status !== 'pending')
      .reduce((s, i) => s + i.price * i.qty, 0) || 0;

    setOrders(prev => prev.map(o =>
      o.id !== orderId ? o : {
        ...o,
        paymentStatus: 'dp' as const,
        paymentMethod: method,
        paymentDestination: dest,
        dpAmountPaid: dpAmount,
        timeline: [...o.timeline, {
          id: `t-dp-${Date.now()}`,
          status: o.status,
          timestamp: now,
          title: 'DP Dibayar',
          description: `DP Rp ${dpAmount.toLocaleString('id-ID')} via ${PAYMENT_LABEL[method] || method.toUpperCase()} (${dest}). Sisa Rp ${(total - dpAmount).toLocaleString('id-ID')}.`,
          actor: activeStaffUser?.name || 'Kasir'
        }]
      }
    ));

    Promise.all([
      updateOrder(orderId, { paymentStatus: 'dp', paymentMethod: method, paymentDestination: dest, dpAmountPaid: dpAmount }),
      createTransactionRecord(orderId, dpAmount, method, 'masuk', 'pendapatan_jasa',
        `DP ${orderId} — Rp ${dpAmount.toLocaleString('id-ID')} (${order?.carBrand} ${order?.carModel})`, order?.customerName)
    ]).catch(err => {
      console.error('Failed to process DP payment:', err);
      showNotification('❌ Gagal memproses DP');
    });

    showNotification(`💳 DP Rp ${dpAmount.toLocaleString('id-ID')} diterima untuk ${orderId}`);
  }, [orders, activeStaffUser, createTransactionRecord]);

  const handleAddExpense = useCallback((exp: Omit<Expense, 'id'>) => {
    const newExp: Expense = { ...exp, id: `EXP-${Date.now()}` };
    setExpenses(prev => [newExp, ...prev]);

    const newTx: CashTransaction = {
      id: `TX-${Date.now()}`,
      amount: exp.amount,
      type: 'keluar',
      method: exp.method,
      category: exp.category as any,
      description: exp.description,
      timestamp: new Date(exp.date).toISOString(),
      createdBy: exp.createdBy
    };
    setTransactions(prev => [newTx, ...prev]);

    Promise.all([
      createExpense(newExp),
      createTransaction(newTx),
    ]).catch(err => {
      console.error('Failed to save expense:', err);
      showNotification('❌ Gagal menyimpan pengeluaran');
    });

    showNotification(`📝 Pengeluaran dicatat: ${exp.description}`);
  }, []);

  const handleCashClosing = useCallback((closing: Omit<CashClosing, 'id'>) => {
    const newClosing: CashClosing = { ...closing, id: `CLO-${Date.now()}` };
    setClosings(prev => [newClosing, ...prev]);
    createClosing(newClosing).catch(err => {
      console.error('Failed to save closing:', err);
      showNotification('❌ Gagal menyimpan tutup kas');
    });
    showNotification(`🔒 Kas hari ini ditutup oleh ${closing.closedBy}.`);
  }, []);

  // ---- STOCK ----
  const handleUpdateStock = useCallback((itemId: string, newStock: number) => {
    setWarehouseStock(prev => prev.map(item =>
      item.id === itemId ? { ...item, stock: newStock } : item
    ));
    updateStockQuantity(itemId, newStock).catch(err => {
      console.error('Failed to update stock:', err);
    });
  }, []);

  // ---- AUTH ----
  const handleLoginSuccess = (user: User) => {
    setActiveStaffUser(user);
    setIsLoginModalOpen(false);
    setCurrentView('staff_portal');
    if (user.role === 'owner') setActiveTab('dashboard');
    else if (user.role === 'advisor') setActiveTab('track_dashboard');
    else if (user.role === 'kasir') setActiveTab('accounting');
    else if (user.role === 'gudang') setActiveTab('gudang');
    else if (user.role === 'mekanik') setActiveTab('spk');
    else if (user.role === 'manager') setActiveTab('manager_dashboard');
    else if (user.role === 'marketing') setActiveTab('marketing');
    else if (user.role === 'accounting') setActiveTab('finance_report');
    showNotification(`👋 Selamat bekerja, ${user.name}!`);
  };

  const handleLogout = async () => {
    try {
      await signOutStaff();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
    setActiveStaffUser(null);
    setCurrentView('landing');
  };

  const getStatusTitle = (status: Order['status']) => {
    const map: Record<Order['status'], string> = {
      antre: 'Masuk Antrian',
      dikerjakan: 'Mulai Dikerjakan',
      temuan_dilaporkan: 'Temuan Dilaporkan ke Customer',
      menunggu_pembayaran: 'Selesai — Menunggu Pembayaran',
      selesai: 'Kendaraan Diserahkan'
    };
    return map[status];
  };

  const getTabsForRole = (role: string) => {
    const all: { id: ActiveTab; label: string; icon: any; roles: string[] }[] = [
      { id: 'dashboard', label: 'Laporan', icon: LayoutDashboard, roles: ['owner'] },
      { id: 'create_order', label: 'Buat WO', icon: FilePlus, roles: ['advisor', 'owner'] },
      { id: 'track_dashboard', label: 'Kelola WO', icon: ClipboardList, roles: ['advisor', 'owner'] },
      { id: 'accounting', label: 'Akunting', icon: BookOpen, roles: ['kasir', 'owner'] },
      { id: 'gudang', label: 'Gudang', icon: Package, roles: ['gudang', 'owner'] },
      { id: 'spk', label: 'Kerja Saya', icon: Wrench, roles: ['mekanik'] },
      { id: 'manager_dashboard', label: 'Pantauan', icon: LayoutDashboard, roles: ['manager'] },
      { id: 'marketing', label: 'Konten & Portofolio', icon: Monitor, roles: ['marketing'] },
      { id: 'monitor_service', label: 'Monitor Service', icon: Monitor, roles: ['advisor', 'kasir', 'gudang', 'owner', 'manager', 'mekanik'] },
      { id: 'monitor_tunggu', label: 'Monitor Tunggu', icon: Monitor, roles: ['advisor', 'kasir', 'gudang', 'owner', 'manager'] },
      { id: 'finance_report', label: 'Laporan Keuangan', icon: FileBarChart, roles: ['accounting', 'owner'] },
    ];
    return all.filter(t => t.roles.includes(role));
  };

  // Papan slot standalone (dark screen untuk TV bengkel) — Ruang Service
  // interaktif (klik slot buka SPK), Ruang Tunggu pasif (papan status doang,
  // supaya customer nggak bisa buka data pribadi customer lain).
  if (currentView === 'monitor_service' || currentView === 'monitor_tunggu') {
    return (
      <div>
        <button
          onClick={() => setCurrentView('staff_portal')}
          className="print:hidden fixed top-4 left-4 z-50 bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700"
        >
          ← Kembali
        </button>
        <SlotBoard orders={orders} interactive={currentView === 'monitor_service'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">

      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gray-900 text-white text-[10px] font-bold text-center py-0.5 tracking-wider">
          memuat data...
        </div>
      )}

      {dbError && !isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-berlin-red text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
          <span>⚠️ {dbError}</span>
          <button
            onClick={() => loadData()}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Notification toast */}
      {sandboxNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 p-4 rounded-xl shadow-lg max-w-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Bell className="w-5 h-5 text-black shrink-0 mt-0.5" />
          <p className="text-gray-800 text-sm leading-snug">{sandboxNotification}</p>
        </div>
      )}

      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onCheckOrder={() => setCurrentView('tracking')}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSelectSampleOrder={() => { setTrackingQuery('085156010707'); setCurrentView('tracking'); }}
            onOpenMarketplace={() => setCurrentView('marketplace')}
            orders={orders}
          />
        )}

        {currentView === 'marketplace' && (
          <ProductMarketplace />
        )}

        {currentView === 'tracking' && (
          <TrackingPortal
            orders={orders}
            onBack={() => setCurrentView('landing')}
            onApproveFinding={handleApproveFinding}
            onRejectFinding={handleRejectFinding}
            onApproveServiceItem={handleApproveServiceItem}
            onRejectServiceItem={handleRejectServiceItem}
            onUpdateFindingCost={handleUpdateFindingCost}
            onUpdateOrder={handleUpdateOrder}
            initialSearchQuery={trackingQuery}
          />
        )}

        {currentView === 'staff_portal' && activeStaffUser && (
          <div className="min-h-screen bg-gray-50">
            <div className="border-b border-gray-200 bg-white py-3 px-6 shadow-sm sticky top-0 z-40">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-on-white.png"
                    alt="Berlin 188 Garage"
                    className="h-8 object-contain rounded-lg"
                  />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">Berlin188 Garage</p>
                    <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5">
                      {activeStaffUser.name} <span className="text-gray-400 font-normal">· {activeStaffUser.role}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {getTabsForRole(activeStaffUser.role).map(tab => (
                    <button key={tab.id}
                      onClick={() => (tab.id === 'monitor_service' || tab.id === 'monitor_tunggu') ? setCurrentView(tab.id) : setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-berlin-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                  <button onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all">
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">

              {activeTab === 'dashboard' && (
                <OwnerPanel
                  orders={orders}
                  transactions={transactions}
                  closings={closings}
                  staffUsers={staffDirectory}
                />
              )}

              {activeTab === 'create_order' && (
                <AdvisorPanel
                  onAddOrder={handleAddOrder}
                  activeUser={activeStaffUser}
                  staffUsers={staffDirectory}
                />
              )}

              {activeTab === 'track_dashboard' && (
                <AdvisorDashboard
                  orders={orders}
                  activeUser={activeStaffUser}
                  users={staffDirectory}
                  onApproveFinding={handleApproveFinding}
                  onRejectFinding={handleRejectFinding}
                  onApproveServiceItem={handleApproveServiceItem}
                  onRejectServiceItem={handleRejectServiceItem}
                  onConfirmPayment={handleConfirmPayment}
                  onConfirmDPPayment={handleConfirmDPPayment}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateFindingCost={handleUpdateFindingCost}
                  onUpdateOrder={handleUpdateOrder}
                  onAddFinding={handleAddFinding}
                  onUpdateServiceItems={handleUpdateServiceItems}
                  onSendSPK={handleSendSPK}
                />
              )}

              {activeTab === 'accounting' && (
                <AccountingPanel
                  orders={orders}
                  transactions={transactions}
                  closings={closings}
                  expenses={expenses}
                  staffUser={activeStaffUser}
                  onAddTransaction={() => {}}
                  onAddExpense={handleAddExpense}
                  onCashClosing={handleCashClosing}
                  onProcessPayment={handleConfirmPayment}
                  onConfirmDPPayment={handleConfirmDPPayment}
                />
              )}

              {activeTab === 'manager_dashboard' && (
                <ManagerPanel
                  orders={orders}
                  transactions={transactions}
                />
              )}

              {activeTab === 'marketing' && (
                <MarketingPanel orders={orders} />
              )}

              {activeTab === 'finance_report' && (
                <FinanceReportPanel transactions={transactions} expenses={expenses} />
              )}

              {activeTab === 'spk' && (
                <TechnicianPanel
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onAddFinding={handleAddFinding}
                  onUpdateServiceItems={handleUpdateServiceItems}
                  onUpdateOrder={handleUpdateOrder}
                  activeUser={activeStaffUser}
                />
              )}

              {activeTab === 'gudang' && (
                <WarehousePanel
                  orders={orders}
                  warehouseStock={warehouseStock}
                  onUpdateServiceItems={handleUpdateServiceItems}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateOrder={handleUpdateOrder}
                  onUpdateStock={handleUpdateStock}
                  activeUser={activeStaffUser}
                />
              )}

              {!getTabsForRole(activeStaffUser.role).find(t => t.id === activeTab) && (
                <div className="bg-white border border-gray-200 p-10 rounded-2xl text-center">
                  <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Pilih menu di atas untuk memulai.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
