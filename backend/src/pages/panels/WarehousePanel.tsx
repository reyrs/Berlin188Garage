import React, { useState, useMemo } from 'react';
import {
  Package, MagnifyingGlass, Plus, MapPin, Trash, ClipboardText, WarningCircle, CheckCircle, Compass, Check, X, ArrowCounterClockwise, LinkSimple
} from '@phosphor-icons/react';
import { Order, ServiceItem, User as StaffUser, WarehouseStockItem } from '@shared/types';
import { STATUS_CONFIG } from '@shared/design';
import { genId } from '@shared/id';
import { PRODUCTS } from '@shared/products';
import ImageLightbox from '@shared/components/ImageLightbox';
import RupiahInput from '@shared/components/RupiahInput';

interface StockItemCardProps {
  stockItem: WarehouseStockItem;
  onAdd: (stockItem: WarehouseStockItem, qty: number) => void;
  onUpdateMarketplaceLink?: (itemId: string, marketplaceProductId: string | null) => void;
  formatRupiah: (num: number) => string;
}

// Picker manual (bukan auto-match) buat nghubungin satu item gudang ke satu
// listing marketplace publik — kode gudang (SP-XX-NN) dan id produk hasil
// scrape Shopee sama sekali nggak nyambung secara penamaan, jadi matching
// otomatis berisiko salah pasang stok di halaman customer.
function MarketplaceLinkPicker({ stockItem, onUpdateMarketplaceLink, formatRupiah }: {
  stockItem: WarehouseStockItem;
  onUpdateMarketplaceLink?: (itemId: string, marketplaceProductId: string | null) => void;
  formatRupiah: (num: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const linkedProduct = stockItem.marketplaceProductId
    ? PRODUCTS.find(p => p.id === stockItem.marketplaceProductId)
    : undefined;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    return PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)).slice(0, 50);
  }, [query]);

  if (!onUpdateMarketplaceLink) return null;

  if (linkedProduct) {
    return (
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-[#2a2d35] pt-2.5 text-[10px]">
        <div className="flex items-center gap-1.5 min-w-0 text-emerald-700 dark:text-emerald-400">
          <LinkSimple className="w-3 h-3 shrink-0" weight="duotone" />
          <span className="truncate">Terhubung: {linkedProduct.name}</span>
        </div>
        <button
          type="button"
          onClick={() => onUpdateMarketplaceLink(stockItem.id, null)}
          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          title="Putuskan link"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 dark:border-[#2a2d35] pt-2.5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-berlin-navy dark:hover:text-berlin-gold transition-colors cursor-pointer"
        >
          <LinkSimple className="w-3 h-3" weight="duotone" /> Link ke Marketplace
        </button>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk marketplace (min. 3 huruf)..."
              className="flex-1 min-w-0 bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg px-2.5 py-1.5 text-[10px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500"
            />
            <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-150 dark:border-[#2a2d35] rounded-lg p-1.5 bg-white dark:bg-[#1a1d23]">
              {results.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onUpdateMarketplaceLink(stockItem.id, p.id); setOpen(false); setQuery(''); }}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-[#22252c] text-[10px] text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-gray-400 font-sans">{formatRupiah(p.price)}</span>
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 3 && results.length === 0 && (
            <p className="text-[10px] text-gray-400 italic">Tidak ada produk marketplace yang cocok.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StockItemCard({ stockItem, onAdd, onUpdateMarketplaceLink, formatRupiah }: StockItemCardProps) {
  const [qtyToAssign, setQtyToAssign] = useState<number>(1);
  const isOutOfStock = stockItem.stock <= 0;

  return (
    <div 
      className={`border p-3.5 rounded-xl flex flex-col justify-between gap-3.5 transition-all ${
        isOutOfStock 
          ? 'bg-gray-50 dark:bg-[#22252c] border-gray-150 dark:border-[#2a2d35] opacity-60' 
          : 'bg-white dark:bg-[#1a1d23] border-gray-200 dark:border-[#2a2d35] hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xs'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex justify-between items-start gap-1">
          <span className="font-sans text-[9px] font-bold text-gray-400 dark:text-gray-500 tracking-wider">
            {stockItem.code}
          </span>
          
          {/* Map Locator / Rack Location Badge - HIGH VISIBILITY */}
          <div className="bg-berlin-navy text-white text-[9px] px-2 py-0.5 rounded font-bold flex items-center gap-1.5 shadow-sm border border-berlin-gold/25">
            <MapPin className="w-3 h-3 text-[#E6C687] shrink-0" weight="duotone" />
            <span>{stockItem.rackLocation}</span>
          </div>
        </div>

        <div className="font-bold text-xs text-gray-800 dark:text-gray-100 leading-tight">
          {stockItem.name}
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs font-extrabold text-berlin-navy font-sans">
            {formatRupiah(stockItem.price)}
          </span>
          <span className={`text-[10px] font-bold ${
            stockItem.stock <= 2 ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-500 dark:text-gray-400'
          }`}>
            Stok: {stockItem.stock} unit
          </span>
        </div>
      </div>

      {/* Assignment controls */}
      <div className="border-t border-gray-100 dark:border-[#2a2d35] pt-3 flex items-center gap-2">
        <div className="flex items-center border border-gray-200 dark:border-[#2a2d35] rounded-lg bg-gray-50 dark:bg-[#22252c] overflow-hidden h-8">
          <button
            type="button"
            disabled={qtyToAssign <= 1 || isOutOfStock}
            onClick={() => setQtyToAssign(q => Math.max(1, q - 1))}
            className="px-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-40 cursor-pointer h-full"
          >
            -
          </button>
          <span className="px-2.5 text-xs font-sans font-bold text-gray-800 dark:text-gray-100 select-none">
            {qtyToAssign}
          </span>
          <button
            type="button"
            disabled={qtyToAssign >= stockItem.stock || isOutOfStock}
            onClick={() => setQtyToAssign(q => Math.min(stockItem.stock, q + 1))}
            className="px-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-40 cursor-pointer h-full"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={() => {
            onAdd(stockItem, qtyToAssign);
            setQtyToAssign(1);
          }}
          className={`flex-1 h-8 text-[11px] font-black tracking-wider uppercase rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isOutOfStock 
              ? 'bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-[#2a2d35] text-gray-400 dark:text-gray-500 cursor-not-allowed' 
              : 'bg-berlin-navy text-white hover:bg-berlin-navy-dark'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-white shrink-0" weight="duotone" />
          Pasang
        </button>
      </div>

      <MarketplaceLinkPicker stockItem={stockItem} onUpdateMarketplaceLink={onUpdateMarketplaceLink} formatRupiah={formatRupiah} />
    </div>
  );
}

interface WarehousePanelProps {
  orders: Order[];
  warehouseStock: WarehouseStockItem[];
  onUpdateServiceItems: (orderId: string, items: ServiceItem[]) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status'], timelineDescription: string) => void;
  onUpdateOrder: (orderId: string, updatedFields: Partial<Order>) => void;
  onUpdateStock?: (itemId: string, newStock: number) => void;
  onUpdateMarketplaceLink?: (itemId: string, marketplaceProductId: string | null) => void;
  onCreateStockItem?: (item: Omit<WarehouseStockItem, 'id'>) => Promise<WarehouseStockItem>;
  onNotify?: (message: string) => void;
  activeUser: StaffUser;
}

export default function WarehousePanel({
  orders,
  warehouseStock,
  onUpdateServiceItems,
  onUpdateOrderStatus,
  onUpdateOrder,
  onUpdateStock,
  onUpdateMarketplaceLink,
  onCreateStockItem,
  onNotify,
  activeUser
}: WarehousePanelProps) {
  const notify = onNotify || alert;
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [searchStockQuery, setSearchStockQuery] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom Item Form State
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customQty, setCustomQty] = useState<number>(1);
  const [customCode, setCustomCode] = useState('');

  // Selected stock item map for resolving findings
  const [selectedFindingStockMap, setSelectedFindingStockMap] = useState<Record<string, string>>({});

  // Jasa pasang (labor) cost gudang estimates per finding — required
  // alongside sparepart before a finding can be considered "estimated" and
  // offered to the customer (revisi alur manager 2026-08-13: estimasi
  // gudang = sparepart + jasa pasang, dua komponen terpisah).
  const [jasaPasangMap, setJasaPasangMap] = useState<Record<string, string>>({});

  // Active orders that warehouse needs to support (excluding completed ones)
  // 'menunggu_pembayaran' dikeluarin juga (bukan cuma 'selesai') — mobil di
  // status itu udah kelar dikerjakan, tinggal nunggu bayar. Kalau masih bisa
  // dipasangin part / "Kirim Pengajuan ke SA" dari sini, itu bisa
  // ngebalikin status order ke 'temuan_dilaporkan' padahal harusnya udah
  // ditutup buat pengerjaan baru. Batas yang sama dipakai TrackingPortal.tsx
  // buat nentuin order "masih aktif buat diutak-atik" atau nggak.
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'selesai' && o.status !== 'menunggu_pembayaran');
  }, [orders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Filtered stock opname search
  const filteredStock = useMemo(() => {
    const query = searchStockQuery.trim().toLowerCase();
    if (!query) return warehouseStock;
    return warehouseStock.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.code.toLowerCase().includes(query) ||
      item.rackLocation.toLowerCase().includes(query)
    );
  }, [warehouseStock, searchStockQuery]);

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // warehouse_stock RLS cuma izinin write dari owner/gudang (lihat
  // supabase-schema.sql) — advisor juga bisa buka tab ini (buat pasang part
  // ke WO, yang nulis ke orders bukan warehouse_stock), tapi kalau tombol
  // link marketplace tetap kelihatan buat advisor, update-nya bakal silent
  // no-op (matched 0 baris, RLS nggak nge-throw error) dan UI kelihatan
  // "berhasil" padahal DB nggak berubah. Jadi affordance-nya disembunyikan
  // total, bukan cuma di-disable, buat role yang emang gak bisa nulis.
  const canManageMarketplaceLink = activeUser.role === 'owner' || activeUser.role === 'gudang';

  // Add stock item to order
  const handleAddStockToOrder = (stockItem: WarehouseStockItem, qtyToAdd: number) => {
    if (!selectedOrder) return;
    if (qtyToAdd <= 0) return;

    if (stockItem.stock < qtyToAdd) {
      notify(`❌ Stok tidak mencukupi! Tersedia: ${stockItem.stock}`);
      return;
    }

    // Sync deduction straight to the parent (source of truth) — this panel no
    // longer keeps its own copy of stock, so nothing here can go stale.
    const newStock = stockItem.stock - qtyToAdd;
    onUpdateStock?.(stockItem.id, newStock);

    // Create ServiceItem
    const newItem: ServiceItem = {
      id: genId('part'),
      name: `${stockItem.name} (${stockItem.code})`,
      type: 'part',
      price: stockItem.price,
      qty: qtyToAdd,
      status: 'pending' // Needs approval (ACC) by Service Advisor
    };

    const updatedItems = [...selectedOrder.serviceItems, newItem];
    onUpdateServiceItems(selectedOrder.id, updatedItems);
  };

  // Add custom non-stock item — masuk warehouse_stock DOANG (jadi inventaris
  // beneran, langsung nongol di dropdown "Metode A: Alokasikan Stok"),
  // TIDAK langsung dialokasikan ke WO manapun. Alokasi ke WO tetap lewat
  // jalur normal (Metode A) — dua langkah terpisah, bukan sekali klik
  // (revisi manager 2026-08-13, "Gudang #2", dikoreksi lagi 2026-08-14:
  // awalnya kedua langkah ini digabung jadi satu, gudang mau dipisah).
  const handleAddCustomPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || customPrice <= 0 || customQty <= 0 || !onCreateStockItem) return;

    const codeStr = customCode.trim() || `SP-NEW-${Date.now().toString().slice(-6)}`;

    try {
      await onCreateStockItem({
        name: customName,
        code: codeStr,
        price: customPrice,
        stock: customQty,
        rackLocation: 'Belum Ditempatkan',
      });
      notify(`✅ ${customName} ditambahkan ke stok gudang. Alokasikan ke WO lewat "Metode A: Alokasikan Stok".`);
    } catch (err) {
      console.error('Failed to create warehouse stock item:', err);
      notify('❌ Gagal menambahkan barang baru ke stok gudang. Coba lagi.');
      return;
    }

    // Reset Form
    setCustomName('');
    setCustomPrice(0);
    setCustomQty(1);
    setCustomCode('');
    setShowCustomForm(false);
  };

  // Remove sparepart
  const handleRemovePart = (itemId: string, itemCodeAndName: string, qty: number) => {
    if (!selectedOrder) return;

    const updatedItems = selectedOrder.serviceItems.filter(item => item.id !== itemId);

    // Part yang di-resolve lewat temuan (handleResolveWithStock) juga
    // ke-mirror ke finding.resolvedParts — kalau dihapus dari sini (daftar
    // utama) tanpa nyentuh itu juga, resolvedParts nyisain entri hantu yang
    // nunjuk ke serviceItem yang udah nggak ada. handleRemovePartFromFinding
    // di bawah udah bener nangani dua-duanya sekaligus; disamain di sini.
    const hasResolvedPartRef = selectedOrder.findings.some(f => (f.resolvedParts || []).some(p => p.id === itemId));
    if (hasResolvedPartRef) {
      const updatedFindings = selectedOrder.findings.map(f => (
        (f.resolvedParts || []).some(p => p.id === itemId)
          ? { ...f, resolvedParts: (f.resolvedParts || []).filter(p => p.id !== itemId) }
          : f
      ));
      onUpdateOrder(selectedOrder.id, { serviceItems: updatedItems, findings: updatedFindings });
    } else {
      onUpdateServiceItems(selectedOrder.id, updatedItems);
    }

    // Try to restock if it was from warehouse stock
    const codeMatch = itemCodeAndName.match(/\((SP-[\w-]+)\)/);
    if (codeMatch) {
      const code = codeMatch[1];
      const restocked = warehouseStock.find(item => item.code === code);
      if (restocked) onUpdateStock?.(restocked.id, restocked.stock + qty);
    }
  };

  // Estimasi gudang harus mencakup jasa pasang, bukan cuma sparepart — ini
  // dicek sekali di titik "finalisasi" tiap metode resolusi (bawa sendiri /
  // tanpa sparepart / kunci sourcing stok), bukan di setiap klik "Tambah
  // dari Stok" (yang bisa dipanggil berkali-kali sebelum dikunci).
  const getJasaPasangValue = (findingId: string): number | null => {
    const raw = jasaPasangMap[findingId];
    if (raw === undefined || raw.trim() === '') {
      notify('❌ Isi dulu estimasi Jasa Pasang untuk temuan ini (boleh isi 0 kalau memang tidak ada biaya jasa).');
      return null;
    }
    const num = Number(raw);
    if (Number.isNaN(num) || num < 0) {
      notify('❌ Jasa Pasang harus berupa angka 0 atau lebih.');
      return null;
    }
    return num;
  };

  const buildJasaItem = (findingId: string, findingDescription: string, jasaCost: number): ServiceItem => ({
    id: genId('jasa'),
    name: `Jasa Pasang: ${findingDescription.split(',')[0]}`,
    type: 'jasa',
    price: jasaCost,
    qty: 1,
    status: 'pending', // Estimasi gudang — nunggu ditawarkan & di-ACC pelanggan
    findingId,
  });

  // Resolve finding using stock
  const handleResolveWithStock = (findingId: string, findingDescription: string) => {
    if (!selectedOrder) return;
    const stockItemId = selectedFindingStockMap[findingId];
    if (!stockItemId) {
      notify("❌ Harap pilih sparepart dari stock opname terlebih dahulu!");
      return;
    }

    const stockItem = warehouseStock.find(item => item.id === stockItemId);
    if (!stockItem) return;

    if (stockItem.stock <= 0) {
      notify("❌ Stok barang ini habis di gudang!");
      return;
    }

    // Deduct stock — sync straight to the parent (source of truth)
    const newStockAmt = stockItem.stock - 1;
    onUpdateStock?.(stockItem.id, newStockAmt);

    const itemId = genId('part');
    // Create ServiceItem
    const newItem: ServiceItem = {
      id: itemId,
      name: `${stockItem.name} (${stockItem.code})`,
      type: 'part',
      price: stockItem.price,
      qty: 1,
      status: 'pending',
      partSource: 'gudang_stock'
    };

    const updatedItems = [...selectedOrder.serviceItems, newItem];

    // Update finding's resolvedParts
    const updatedFindings = selectedOrder.findings.map(f => {
      if (f.id === findingId) {
        const currentParts = f.resolvedParts || [];
        return {
          ...f,
          resolvedParts: [...currentParts, {
            id: itemId,
            name: `${stockItem.name} (${stockItem.code})`,
            price: stockItem.price,
            qty: 1,
            source: 'gudang_stock' as const
          }]
        };
      }
      return f;
    });

    // Create timeline event
    const newTimelineEvent = {
      id: genId('t-wh-add'),
      status: selectedOrder.status,
      timestamp: new Date().toISOString(),
      title: 'Barang Gudang Dialokasikan',
      description: `Unit Gudang mengalokasikan sparepart "${stockItem.name}" (Lokasi: Rak ${stockItem.rackLocation}) untuk temuan "${findingDescription}".`,
      actor: `Gudang (${activeUser.name})`
    };

    onUpdateOrder(selectedOrder.id, {
      serviceItems: updatedItems,
      findings: updatedFindings,
      timeline: [...selectedOrder.timeline, newTimelineEvent]
    });

    // Reset map entry
    setSelectedFindingStockMap(prev => {
      const copy = { ...prev };
      delete copy[findingId];
      return copy;
    });

    notify(`✅ Berhasil menambahkan ${stockItem.name} ke daftar temuan.`);
  };

  // Resolve finding using customer-brought sparepart
  const handleResolveWithBawaSendiri = (findingId: string, findingDescription: string) => {
    if (!selectedOrder) return;

    const itemId = genId('part-bawa-sendiri');
    // Create free ServiceItem (Bawa Sendiri). Like the stock path, this only
    // adds to resolvedParts — jasa pasang is estimated once at "Simpan &
    // Kunci Sourcing" (handleLockResolution), not per-add, since either path
    // can add more than one part before locking.
    const newItem: ServiceItem = {
      id: itemId,
      name: `[Bawa Sendiri] Part untuk: ${findingDescription.split(',')[0]}`,
      type: 'part',
      price: 0,
      qty: 1,
      status: 'approved', // Auto-approved since price is 0 and customer brought it
      partSource: 'bawa_sendiri'
    };

    const updatedItems = [...selectedOrder.serviceItems, newItem];

    // Update finding's resolvedParts
    const updatedFindings = selectedOrder.findings.map(f => {
      if (f.id === findingId) {
        const currentParts = f.resolvedParts || [];
        return {
          ...f,
          resolvedParts: [...currentParts, {
            id: itemId,
            name: `Sparepart Bawa Sendiri`,
            price: 0,
            qty: 1,
            source: 'bawa_sendiri' as const
          }]
        };
      }
      return f;
    });

    // Create timeline event
    const newTimelineEvent = {
      id: genId('t-wh-add-self'),
      status: selectedOrder.status,
      timestamp: new Date().toISOString(),
      title: 'Sparepart Bawa Sendiri Ditambahkan',
      description: `Unit Gudang mencatat tambahan sparepart bawa sendiri untuk temuan "${findingDescription}". Biaya pengadaan diatur Rp 0.`,
      actor: `Gudang (${activeUser.name})`
    };

    onUpdateOrder(selectedOrder.id, {
      serviceItems: updatedItems,
      findings: updatedFindings,
      timeline: [...selectedOrder.timeline, newTimelineEvent]
    });

    notify("✅ Berhasil menambahkan sparepart bawa sendiri!");
  };

  // Resolve finding as "No Sparepart Needed"
  const handleNoPartNeeded = (findingId: string, findingDescription: string) => {
    if (!selectedOrder) return;
    const jasaCost = getJasaPasangValue(findingId);
    if (jasaCost === null) return;

    const jasaItem = buildJasaItem(findingId, findingDescription, jasaCost);

    const updatedFindings = selectedOrder.findings.map(f => {
      if (f.id === findingId) {
        return {
          ...f,
          warehouseResolved: true,
          resolvedPartName: 'Tidak Perlu Sparepart',
          resolvedPartSource: 'none' as const,
          resolvedParts: []
        };
      }
      return f;
    });

    const newTimelineEvent = {
      id: genId('t-wh-none'),
      status: selectedOrder.status,
      timestamp: new Date().toISOString(),
      title: 'Temuan Tanpa Sparepart',
      description: `Unit Gudang menandai temuan "${findingDescription}" tidak memerlukan penggantian sparepart. Estimasi jasa pasang: Rp ${jasaCost.toLocaleString('id-ID')}.`,
      actor: `Gudang (${activeUser.name})`
    };

    onUpdateOrder(selectedOrder.id, {
      serviceItems: [...selectedOrder.serviceItems, jasaItem],
      findings: updatedFindings,
      timeline: [...selectedOrder.timeline, newTimelineEvent]
    });

    setJasaPasangMap(prev => {
      const copy = { ...prev };
      delete copy[findingId];
      return copy;
    });

    notify("✅ Temuan berhasil ditandai tidak memerlukan sparepart. Estimasi jasa pasang tercatat.");
  };

  // Lock resolution for multiple parts
  const handleLockResolution = (findingId: string, findingDescription: string) => {
    if (!selectedOrder) return;
    const finding = selectedOrder.findings.find(f => f.id === findingId);
    if (!finding) return;

    const parts = finding.resolvedParts || [];
    if (parts.length === 0) {
      notify("❌ Harap tambahkan minimal 1 sparepart terlebih dahulu atau pilih 'Tidak Perlu Sparepart'!");
      return;
    }
    const jasaCost = getJasaPasangValue(findingId);
    if (jasaCost === null) return;
    const jasaItem = buildJasaItem(findingId, findingDescription, jasaCost);

    const summaryName = parts.map(p => p.name).join(', ');
    const primarySource = parts.some(p => p.source === 'gudang_stock') ? 'gudang_stock' : 'bawa_sendiri';

    const updatedFindings = selectedOrder.findings.map(f => {
      if (f.id === findingId) {
        return {
          ...f,
          warehouseResolved: true,
          resolvedPartName: summaryName,
          resolvedPartSource: primarySource as 'gudang_stock' | 'bawa_sendiri'
        };
      }
      return f;
    });

    const newTimelineEvent = {
      id: genId('t-wh-lock'),
      status: selectedOrder.status,
      timestamp: new Date().toISOString(),
      title: 'Sourcing Sparepart Selesai',
      description: `Unit Gudang menyelesaikan & mengunci pencarian sparepart untuk temuan "${findingDescription}". Total: ${parts.length} sparepart dialokasikan (${summaryName}). Estimasi jasa pasang: Rp ${jasaCost.toLocaleString('id-ID')}.`,
      actor: `Gudang (${activeUser.name})`
    };

    setJasaPasangMap(prev => {
      const copy = { ...prev };
      delete copy[findingId];
      return copy;
    });

    onUpdateOrder(selectedOrder.id, {
      serviceItems: [...selectedOrder.serviceItems, jasaItem],
      findings: updatedFindings,
      timeline: [...selectedOrder.timeline, newTimelineEvent]
    });

    notify("✅ Penyelesaian pencarian sparepart berhasil disimpan & dikunci!");
  };

  // Remove a single part from a finding before locking
  const handleRemovePartFromFinding = (findingId: string, itemId: string, itemName: string, source: string) => {
    if (!selectedOrder) return;

    // Filter out from serviceItems
    const updatedItems = selectedOrder.serviceItems.filter(item => item.id !== itemId);

    // Update finding's resolvedParts
    const updatedFindings = selectedOrder.findings.map(f => {
      if (f.id === findingId) {
        const currentParts = f.resolvedParts || [];
        return {
          ...f,
          resolvedParts: currentParts.filter(p => p.id !== itemId)
        };
      }
      return f;
    });

    // Restock if it was from warehouse stock
    if (source === 'gudang_stock') {
      const codeMatch = itemName.match(/\((SP-[\w-]+)\)/);
      const code = codeMatch ? codeMatch[1] : null;
      const restocked = warehouseStock.find(item => code ? item.code === code : item.name === itemName);
      if (restocked) onUpdateStock?.(restocked.id, restocked.stock + 1);
    }

    onUpdateOrder(selectedOrder.id, {
      serviceItems: updatedItems,
      findings: updatedFindings
    });

    notify(`🗑️ Berhasil menghapus ${itemName} dari temuan ini.`);
  };

  // Reset resolution completely
  const handleResetResolution = (findingId: string, findingDescription: string) => {
    if (!selectedOrder) return;
    const finding = selectedOrder.findings.find(f => f.id === findingId);
    if (!finding) return;

    const parts = finding.resolvedParts || [];
    const partIdsToRemove = parts.map(p => p.id);

    // Filter out those items from serviceItems — also drop the jasa pasang
    // estimate for this finding (added at lock/no-part time) so gudang can
    // re-estimate cleanly on redo, not leave a stale approved/pending jasa
    // line pointing at a resolution that no longer exists.
    const updatedItems = selectedOrder.serviceItems.filter(item =>
      !partIdsToRemove.includes(item.id) && !(item.type === 'jasa' && item.findingId === findingId)
    );

    // Restock any parts that were from warehouse stock. Accumulate per item
    // first — if the same stock item appears twice in one finding, reading
    // the (unchanging) warehouseStock prop separately for each would let the
    // second call clobber the first instead of adding up.
    const restockDeltas = new Map<string, number>();
    parts.forEach(p => {
      if (p.source !== 'gudang_stock') return;
      const codeMatch = p.name.match(/\((SP-[\w-]+)\)/);
      const code = codeMatch ? codeMatch[1] : null;
      const item = warehouseStock.find(i => (code && i.code === code) || i.name === p.name);
      if (item) restockDeltas.set(item.id, (restockDeltas.get(item.id) || 0) + p.qty);
    });
    restockDeltas.forEach((qty, itemId) => {
      const item = warehouseStock.find(i => i.id === itemId);
      if (item) onUpdateStock?.(itemId, item.stock + qty);
    });

    // Update finding
    const updatedFindings = selectedOrder.findings.map(f => {
      if (f.id === findingId) {
        return {
          ...f,
          warehouseResolved: false,
          resolvedPartName: undefined,
          resolvedPartSource: undefined,
          resolvedParts: []
        };
      }
      return f;
    });

    const newTimelineEvent = {
      id: genId('t-wh-reset'),
      status: selectedOrder.status,
      timestamp: new Date().toISOString(),
      title: 'Reset Sourcing Temuan',
      description: `Unit Gudang membatalkan & me-reset alokasi sparepart untuk temuan "${findingDescription}".`,
      actor: `Gudang (${activeUser.name})`
    };

    onUpdateOrder(selectedOrder.id, {
      serviceItems: updatedItems,
      findings: updatedFindings,
      timeline: [...selectedOrder.timeline, newTimelineEvent]
    });

    notify("🔄 Pencarian sparepart berhasil di-reset untuk temuan ini.");
  };

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">

      {/* Left Side: Active Orders List */}
      <div className="md:col-span-4 card-padded space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-[#2a2d35]">
          <ClipboardText className="w-5 h-5 text-black dark:text-white" weight="duotone" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Order Antrean Sparepart</h3>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Gudang: {activeUser.name}</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {activeOrders.map((o) => {
            const partCount = o.serviceItems.filter(item => item.type === 'part').length;
            const isCurrent = o.id === selectedOrderId;

            return (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer block relative overflow-hidden ${
                  isCurrent 
                    ? 'bg-berlin-navy text-white border-berlin-navy shadow-md scale-[1.01]' 
                    : 'bg-gray-50/50 dark:bg-[#22252c] hover:bg-gray-50 dark:hover:bg-[#22252c] border-gray-150 dark:border-[#2a2d35] text-gray-800 dark:text-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`font-sans text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCurrent ? 'bg-zinc-800 text-zinc-100' : 'bg-gray-100 dark:bg-[#22252c] text-gray-700 dark:text-gray-300'
                    }`}>
                      {o.id}
                    </span>
                    <span className={`text-[10px] ml-2 font-semibold ${isCurrent ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                      {o.plateNumber}
                    </span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold tracking-wide uppercase ${STATUS_CONFIG[o.status].bg} ${STATUS_CONFIG[o.status].text}`}>
                    {STATUS_CONFIG[o.status].label}
                  </span>
                </div>

                <div className="mt-2.5">
                  <p className="text-xs font-black truncate">{o.carBrand} {o.carModel}</p>
                  <p className={`text-[11px] truncate mt-0.5 ${isCurrent ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                    Cust: {o.customerName}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-200/20 dark:border-[#2a2d35] flex justify-between items-center text-[10px]">
                  <span className={isCurrent ? 'text-zinc-400' : 'text-gray-400 dark:text-gray-500'}>
                    Sparepart terpasang:
                  </span>
                  <span className={`font-bold ${isCurrent ? 'text-berlin-gold' : 'text-berlin-navy'}`}>
                    {partCount} Item
                  </span>
                </div>
              </button>
            );
          })}

          {activeOrders.length === 0 && (
            <div className="text-center p-8 text-gray-400 dark:text-gray-500 space-y-2">
              <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" weight="duotone" />
              <p className="text-xs font-semibold">Tidak ada antrean kendaraan aktif.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Selected Order details & Spareparts lookup */}
      <div className="md:col-span-8 space-y-5">
        {selectedOrder ? (
          <div className="space-y-5">
            
            {/* Header: Vehicle & Client details */}
            <div className="card-padded space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 dark:border-[#2a2d35] pb-3">
                <div>
                  <span className="text-[10px] bg-berlin-navy text-white px-2 py-0.5 rounded font-sans font-bold">{selectedOrder.id}</span>
                  <h3 className="text-base font-black text-berlin-navy mt-1.5">{selectedOrder.carBrand} {selectedOrder.carModel}</h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-sans mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                    <span>Plat: <strong className="text-gray-700 dark:text-gray-300 uppercase">{selectedOrder.plateNumber}</strong></span>
                    {selectedOrder.carType && <span>Tipe: <strong className="text-gray-700 dark:text-gray-300">{selectedOrder.carType}</strong></span>}
                    {selectedOrder.carYear && <span>Tahun: <strong className="text-gray-700 dark:text-gray-300">{selectedOrder.carYear}</strong></span>}
                    {selectedOrder.carEngineCode && <span>Engine: <strong className="text-gray-700 dark:text-gray-300 uppercase">{selectedOrder.carEngineCode}</strong></span>}
                    {selectedOrder.carVin && <span>VIN: <strong className="text-gray-700 dark:text-gray-300 uppercase">{selectedOrder.carVin}</strong></span>}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-sans mt-0.5">Keluhan: {selectedOrder.complaints.map(c => `"${c}"`).join(', ')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider block">Pelanggan</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100 block">{selectedOrder.customerName}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-sans">{selectedOrder.customerPhone}</span>
                  <div className="mt-2">
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider block">Estimasi Total (ACC)</span>
                    <span className="text-sm font-black text-berlin-red dark:text-red-400 font-sans tabular-nums">
                      {formatRupiah(selectedOrder.serviceItems.filter(i => i.status !== 'pending' && i.status !== 'rejected').reduce((sum, i) => sum + i.price * i.qty, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current parts list on this order */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 dark:text-gray-500 block">
                  Daftar Sparepart Terpasang & Estimasi Saat Ini:
                </span>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.serviceItems.filter(item => item.type === 'part').map((item) => (
                    <div key={item.id} className="bg-amber-50/40 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 p-3 rounded-xl flex items-center justify-between text-xs hover:border-amber-200 dark:hover:border-amber-500/30 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <Package className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" weight="duotone" />
                        <div>
                          <div className="font-bold text-gray-800 dark:text-gray-100">{item.name}</div>
                          <div className="text-[9px] text-amber-800 dark:text-amber-400 font-bold tracking-wide uppercase mt-0.5 flex items-center gap-1.5">
                            <span>Estimasi: {formatRupiah(item.price)} x {item.qty}</span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                              item.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400' :
                              item.status === 'rejected' ? 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400' :
                              'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400'
                            }`}>
                              {item.status === 'approved' ? 'ACC Disetujui' : 
                               item.status === 'rejected' ? 'Ditolak' : 'Menunggu ACC SA'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-sans text-gray-800 dark:text-gray-100 font-bold tabular-nums">{formatRupiah(item.price * item.qty)}</div>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(item.id, item.name, item.qty)}
                          className="p-1 rounded bg-white dark:bg-[#1a1d23] hover:bg-red-50 text-gray-400 dark:text-gray-500 hover:text-red-600 border border-gray-200 dark:border-[#2a2d35] hover:border-red-200 transition-all cursor-pointer"
                          title="Hapus Part"
                        >
                          <Trash className="w-3.5 h-3.5" weight="duotone" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {selectedOrder.serviceItems.filter(item => item.type === 'part').length === 0 && (
                    <div className="text-center py-4 bg-gray-50 dark:bg-[#22252c] border border-dashed border-gray-200 dark:border-[#2a2d35] rounded-xl">
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">Belum ada sparepart yang dicatatkan pada Work Order ini.</p>
                    </div>
                  )}

                  {selectedOrder.serviceItems.filter(item => item.type === 'part' && item.status === 'pending').length > 0 && (
                    <div className="pt-3.5 border-t border-gray-100 dark:border-[#2a2d35] flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateOrderStatus(
                            selectedOrder.id,
                            'temuan_dilaporkan',
                            `Unit Gudang (${activeUser.name}) mengajukan persetujuan pengiriman barang/sparepart baru ke Service Advisor untuk disetujui (ACC).`
                          );
                          notify("✅ Pengajuan sparepart berhasil dikirim ke Service Advisor!");
                        }}
                        className="bg-berlin-navy hover:bg-berlin-navy-dark text-white text-[11px] font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 text-berlin-gold" weight="duotone" />
                        Kirim Pengajuan Barang ke Service Advisor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DIAGNOSIS TEMUAN MEKANIK & TINDAKAN GUDANG */}
            <div className="card-padded space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-150 dark:border-[#2a2d35] pb-3">
                <span className="text-gray-600 dark:text-gray-400 font-bold text-xs uppercase tracking-wider bg-gray-100 dark:bg-[#22252c] px-2.5 py-0.5 rounded">Resolusi Temuan</span>
                <h4 className="text-xs sm:text-sm font-bold text-berlin-navy">Penyelesaian Temuan Kerusakan Mekanik</h4>
              </div>

              <div className="bg-berlin-navy/5 p-3 rounded-xl border border-berlin-navy/10 text-[11px] text-berlin-navy leading-relaxed">
                <span className="font-bold">Panduan:</span> Untuk setiap temuan kerusakan yang dilaporkan mekanik di bawah ini, unit gudang wajib mengalokasikan part dari <strong>Stok Gudang</strong> (mengajukan harga ke SA) ATAU mencatatkan sebagai sparepart <strong>Bawa Sendiri oleh Pelanggan</strong> (diatur Rp 0, otomatis disetujui).
              </div>

              <div className="space-y-3">
                {selectedOrder.findings.map((finding) => {
                  const resolved = finding.warehouseResolved || finding.resolvedPartName;
                  return (
                    <div key={finding.id} className="bg-gray-50 dark:bg-[#22252c] border border-gray-150 dark:border-[#2a2d35] p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 font-sans">
                        <span>TEMUAN MEKANIK</span>
                        <span>{new Date(finding.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="text-xs font-bold text-gray-800 dark:text-gray-100 italic">
                        "{finding.description}"
                      </div>

                      {finding.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setZoomedImage(finding.imageUrl!)}
                          className="block rounded-lg overflow-hidden border border-gray-200 dark:border-[#2a2d35] max-h-32 bg-gray-100 dark:bg-[#22252c] max-w-xs cursor-zoom-in hover:opacity-90 transition-opacity"
                        >
                          <img src={finding.imageUrl} alt="Bukti Kerusakan" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      )}

                      {resolved ? (
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-150 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-400">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-500 block">Sourcing Selesai:</span>
                            <span className="font-bold text-sm">{finding.resolvedPartName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                              finding.resolvedPartSource === 'gudang_stock' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20' :
                              finding.resolvedPartSource === 'bawa_sendiri' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20' :
                              'bg-gray-150 dark:bg-[#22252c] text-gray-700 dark:text-gray-300 border border-gray-250 dark:border-gray-600'
                            }`}>
                              {finding.resolvedPartSource === 'gudang_stock' ? 'Stok Gudang' :
                               finding.resolvedPartSource === 'bawa_sendiri' ? 'Bawa Sendiri' : 'Tanpa Sparepart'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetResolution(finding.id, finding.description)}
                              className="p-1.5 rounded-lg bg-white dark:bg-[#1a1d23] hover:bg-red-50 text-gray-500 dark:text-gray-400 hover:text-red-600 border border-gray-200 dark:border-[#2a2d35] hover:border-red-200 cursor-pointer transition-all flex items-center gap-1 text-[10px] font-bold shadow-xs"
                              title="Reset / Ubah Sourcing"
                            >
                              <ArrowCounterClockwise className="w-3.5 h-3.5" weight="duotone" />
                              <span>Reset</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-gray-200/50 dark:border-[#2a2d35] space-y-3">
                          {/* List of currently allocated parts for this finding */}
                          {finding.resolvedParts && finding.resolvedParts.length > 0 && (
                            <div className="bg-white dark:bg-[#1a1d23] p-3 rounded-xl border border-gray-250/80 dark:border-gray-600 space-y-2">
                              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">
                                Sparepart Terpilih Untuk Temuan Ini:
                              </span>
                              <div className="space-y-1.5">
                                {finding.resolvedParts.map((part) => (
                                  <div key={part.id} className="flex justify-between items-center text-xs bg-gray-50/70 dark:bg-[#22252c] p-2.5 rounded-lg border border-gray-150 dark:border-[#2a2d35]">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${part.source === 'gudang_stock' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                      <span className="font-bold text-gray-800 dark:text-gray-100">{part.name}</span>
                                      <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        ({part.source === 'gudang_stock' ? 'Gudang' : 'Bawa Sendiri'})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-sans text-gray-800 dark:text-gray-100 font-bold">
                                        {part.price > 0 ? formatRupiah(part.price) : 'Rp 0'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePartFromFinding(finding.id, part.id, part.name, part.source)}
                                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer"
                                        title="Hapus dari temuan"
                                      >
                                        <X className="w-3.5 h-3.5" weight="duotone" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-blue-50/60 dark:bg-blue-500/10 border border-blue-150 dark:border-blue-500/20 p-3 rounded-xl space-y-1.5">
                            <label className="text-[9px] font-bold text-blue-700 dark:text-blue-400 block uppercase tracking-wider">
                              Estimasi Jasa Pasang (Rp) — wajib diisi sebelum kunci/tandai selesai
                            </label>
                            <RupiahInput
                              value={jasaPasangMap[finding.id] ?? ''}
                              onChange={(digits) => setJasaPasangMap(prev => ({ ...prev, [finding.id]: digits }))}
                              placeholder="150.000"
                              className="w-full bg-white dark:bg-[#1a1d23] border border-blue-200 dark:border-blue-500/30 rounded-lg py-1.5 pr-2.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500"
                            />
                            <p className="text-[9px] text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                              Estimasi ini digabung dengan sparepart di bawah jadi satu penawaran ke pelanggan lewat SA — isi 0 kalau memang tidak ada biaya jasa.
                            </p>
                          </div>

                          <div className="grid sm:grid-cols-3 gap-2.5">
                            {/* Option 1: Use Stock */}
                            <div className="space-y-2 bg-white dark:bg-[#1a1d23] p-3.5 rounded-xl border border-gray-150 dark:border-[#2a2d35] flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">Metode A: Alokasikan Stok</span>
                                <select
                                  value={selectedFindingStockMap[finding.id] || ''}
                                  onChange={(e) => setSelectedFindingStockMap(prev => ({ ...prev, [finding.id]: e.target.value }))}
                                  className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-1.5 px-2 text-[11px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500"
                                >
                                  <option value="">-- Pilih Barang Stok --</option>
                                  {warehouseStock.filter(s => s.stock > 0).map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.code}) - {formatRupiah(s.price)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleResolveWithStock(finding.id, finding.description)}
                                className="w-full bg-berlin-navy hover:bg-berlin-navy-dark text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition-colors cursor-pointer mt-2"
                              >
                                Tambah dari Stok
                              </button>
                            </div>

                            {/* Option 2: Customer brings own part */}
                            <div className="space-y-2 bg-white dark:bg-[#1a1d23] p-3.5 rounded-xl border border-gray-150 dark:border-[#2a2d35] flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">Metode B: Pelanggan Bawa</span>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
                                  Catat pengerjaan dengan sparepart bawaan pelanggan sendiri (Biaya Rp 0).
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleResolveWithBawaSendiri(finding.id, finding.description)}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                              >
                                Tambah Bawa Sendiri
                              </button>
                            </div>

                            {/* Option 3: No sparepart needed */}
                            <div className="space-y-2 bg-white dark:bg-[#1a1d23] p-3.5 rounded-xl border border-gray-150 dark:border-[#2a2d35] flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 block uppercase tracking-wider text-blue-500">Metode C: Tanpa Sparepart</span>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
                                  Tandai pengerjaan ini tidak memerlukan sparepart tambahan sama sekali.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleNoPartNeeded(finding.id, finding.description)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                              >
                                Tidak Perlu Sparepart
                              </button>
                            </div>
                          </div>

                          {/* Lock Resolution button (visible if there are added parts) */}
                          {finding.resolvedParts && finding.resolvedParts.length > 0 && (
                            <div className="pt-2 border-t border-dashed border-gray-200 dark:border-[#2a2d35] flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleLockResolution(finding.id, finding.description)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                              >
                                <Check className="w-4 h-4 text-white" weight="duotone" />
                                Simpan & Kunci Sourcing ({finding.resolvedParts.length} Barang)
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {selectedOrder.findings.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-[#22252c] rounded-lg border border-dashed border-gray-200 dark:border-[#2a2d35]">
                    Tidak ada temuan diagnosis mekanik untuk dicarikan sparepart pada WO ini.
                  </p>
                )}
              </div>
            </div>

            {/* Warehouse Stock Selection & Locator (Stock Opname) */}
            <div className="card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#2a2d35] pb-3.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#E6C687] shrink-0" weight="duotone" />
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 font-extrabold leading-none">STOCK OPNAME GUDANG</h4>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100 mt-1 block">Pilih Barang & Ambil Sesuai Lokasi Rak</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  className="bg-white dark:bg-[#1a1d23] hover:bg-gray-50 dark:hover:bg-[#22252c] border border-gray-250 dark:border-gray-600 hover:border-gray-350 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  <Package className="w-4 h-4 text-berlin-gold" weight="duotone" />
                  {showCustomForm ? 'Batal Tambah' : '+ Barang Tidak Ada Di Gudang'}
                </button>
              </div>

              {/* Custom Non-Stock Form */}
              {showCustomForm && (
                <form onSubmit={handleAddCustomPart} className="bg-amber-50/40 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400">
                    <Package className="w-4 h-4" weight="duotone" />
                    <span>FORM PENAMBAHAN BARANG NON-STOCK (TIDAK ADA DI GUDANG)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">NAMA BARANG SPAREPART</label>
                      <input
                        type="text"
                        placeholder="Contoh: Modul ECU BMW F30 LCI Original"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2 px-3 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">KODE BARANG (OPSIONAL)</label>
                      <input
                        type="text"
                        placeholder="Contoh: SP-BMW-02"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                        className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2 px-3 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 font-sans transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">ESTIMASI HARGA (RP)</label>
                      <RupiahInput
                        placeholder="1.250.000"
                        value={customPrice === 0 ? '' : String(customPrice)}
                        onChange={(digits) => setCustomPrice(Number(digits))}
                        required
                        className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2 pr-3 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 font-sans transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">QTY</label>
                      <input
                        type="number"
                        min="1"
                        value={customQty}
                        onChange={(e) => setCustomQty(Number(e.target.value))}
                        required
                        className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2 px-3 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 font-sans transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-berlin-navy hover:bg-berlin-navy-dark text-white py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-white" weight="duotone" />
                    Tambahkan Barang Non-Stock ke Stock Gudang
                  </button>
                </form>
              )}

              {/* Stock Search Engine */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari sparepart berdasarkan nama, kode, atau lokasi rak..."
                  value={searchStockQuery}
                  onChange={(e) => setSearchStockQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-250 dark:border-gray-600 focus:border-black dark:focus:border-gray-500 rounded-xl py-2.5 pl-9 pr-4 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none transition-all"
                />
                <MagnifyingGlass className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" weight="duotone" />
              </div>

              {/* Stock Opname Items Listing with Locator (Rack Location) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-96 overflow-y-auto pr-1">
                {filteredStock.map((stockItem) => (
                  <div key={stockItem.id}>
                    <StockItemCard
                      stockItem={stockItem}
                      onAdd={handleAddStockToOrder}
                      onUpdateMarketplaceLink={canManageMarketplaceLink ? onUpdateMarketplaceLink : undefined}
                      formatRupiah={formatRupiah}
                    />
                  </div>
                ))}

                {filteredStock.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400 dark:text-gray-500">
                    <WarningCircle className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1" weight="duotone" />
                    <p className="text-xs font-semibold">Tidak ada barang stock opname yang cocok.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="card p-16 text-center space-y-4">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" weight="duotone" />
            <div>
              <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">Pilih Antrean Sparepart Mobil</h4>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Pilih nomor Work Order aktif di antrean kiri untuk memasangkan sparepart dari Stock Opname Gudang.</p>
            </div>
          </div>
        )}
      </div>

      {zoomedImage && <ImageLightbox src={zoomedImage} alt="Bukti Kerusakan" onClose={() => setZoomedImage(null)} />}
    </div>
  );
}
