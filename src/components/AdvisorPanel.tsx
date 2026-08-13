import React, { useMemo, useState } from 'react';
import { Car, Wrench, CaretRight, CaretDown, CaretUp, FileText, ArrowRight, CheckCircle, MagnifyingGlass, X, ClipboardText } from '@phosphor-icons/react';
import { Order, ServiceItem, User as StaffUser, WarehouseStockItem } from '../types';
import { genId } from '../lib/id';

interface AdvisorPanelProps {
  onAddOrder: (newOrder: Order) => void;
  activeUser: StaffUser;
  orders: Order[];
  warehouseStock: WarehouseStockItem[];
}

const fmtRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

// Satu baris saran jasa/part hasil agregasi riwayat servis plat yang sama —
// bukan ServiceItem langsung karena butuh `count` buat sorting frekuensi, dan
// id baru digenerate pas beneran ditambahkan ke WO.
interface HistorySuggestion {
  key: string;
  name: string;
  type: 'jasa' | 'part';
  price: number;
  qty: number;
  count: number;
  partSource?: 'gudang_stock' | 'bawa_sendiri';
  liveStock?: number;
}

// Date-scoped + random suffix so WO numbers stay short but effectively
// collision-free (unlike a flat 3-digit random pick, which starts colliding
// after only a few dozen orders). Ambiguous chars (0/O, 1/I) are excluded so
// numbers read cleanly on a printed SPK or read aloud on the shop floor.
function generateWoNumber(): string {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `WO-${datePart}-${suffix}`;
}

const normalizePlate = (value: string) => value.replace(/\s+/g, '').toUpperCase();

export default function AdvisorPanel({ onAddOrder, activeUser, orders, warehouseStock }: AdvisorPanelProps) {
  const [step, setStep] = useState<number>(1);
  const [success, setSuccess] = useState<boolean>(false);
  const [lastOrderId, setLastOrderId] = useState<string>('');

  // Form Fields
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [brand, setBrand] = useState<'Mercedes-Benz' | 'BMW' | 'Audi' | 'VW' | 'MINI' | 'Land Rover' | 'Lainnya'>('Mercedes-Benz');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [carType, setCarType] = useState('');
  const [year, setYear] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [serviceType, setServiceType] = useState<Order['serviceType']>('Servis Rutin');
  const [complaint, setComplaint] = useState('');

  // Riwayat pelanggan/kendaraan by plat — dicari langsung dari `orders` yang
  // udah ke-load di memory, bukan lewat network, jadi nggak perlu loading
  // state. Baru mulai cari kalau plat udah cukup panjang biar nggak numpuk
  // match acak dari 1-2 karakter pertama.
  const [dismissedForPlate, setDismissedForPlate] = useState<string | null>(null);
  const [autofilledFromId, setAutofilledFromId] = useState<string | null>(null);
  const [showAltProfiles, setShowAltProfiles] = useState(false);

  const normalizedPlateQuery = normalizePlate(plate);

  // `matches` dipakai buat dua hal: kartu profil pelanggan (prefix match,
  // di-dedupe ke pemilik unik) dan agregat riwayat jasa/part (exact match,
  // lebih ketat — plat yang cuma mirip prefix-nya nggak boleh nyampur riwayat
  // servisnya). Satu scan dipakai bareng biar nggak filter `orders` 2x.
  const { plateProfiles, exactPlateMatches } = useMemo(() => {
    if (normalizedPlateQuery.length < 5) return { plateProfiles: [] as Order[], exactPlateMatches: [] as Order[] };
    const matches = orders
      .filter(o => normalizePlate(o.plateNumber).startsWith(normalizedPlateQuery))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Dedupe ke profil unik (nama + model) — plat yang sama bisa punya lebih
    // dari satu "pemilik" kalau mobilnya pindah tangan, dan yang paling baru
    // per profil udah otomatis di depan berkat sort di atas.
    const seen = new Set<string>();
    const profiles: Order[] = [];
    for (const o of matches) {
      const key = `${o.customerName.trim().toLowerCase()}|${o.carModel.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      profiles.push(o);
    }

    const exact = matches.filter(o => normalizePlate(o.plateNumber) === normalizedPlateQuery);
    return { plateProfiles: profiles, exactPlateMatches: exact };
  }, [orders, normalizedPlateQuery]);

  const showSuggestion = plateProfiles.length > 0 && dismissedForPlate !== normalizedPlateQuery;
  const primaryProfile = plateProfiles[0];
  const altProfiles = plateProfiles.slice(1);

  // Agregat jasa/part yang paling sering dipakai buat plat ini di masa lalu
  // — dihitung dari serviceItems semua WO sebelumnya (bukan cuma yang
  // terakhir), diurut dari yang paling sering dipakai.
  const historySuggestions = useMemo<HistorySuggestion[]>(() => {
    const groups = new Map<string, HistorySuggestion & { lastCreatedAt: string }>();
    for (const o of exactPlateMatches) {
      for (const item of o.serviceItems || []) {
        const key = `${item.type}|${item.name.trim().toLowerCase()}`;
        const existing = groups.get(key);
        if (!existing || o.createdAt > existing.lastCreatedAt) {
          groups.set(key, {
            key,
            name: item.name.trim(),
            type: item.type,
            price: item.price,
            qty: item.qty,
            count: (existing?.count || 0) + 1,
            lastCreatedAt: o.createdAt,
          });
        } else {
          existing.count += 1;
        }
      }
    }

    const list = Array.from(groups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Part disilangkan sama stok gudang saat ini biar harga & sumbernya real,
    // bukan harga historis yang mungkin udah basi. Part yang diambil dari
    // gudang selalu tersimpan sebagai "Nama Part (KODE)" (lihat
    // WarehousePanel.tsx handleAddStockToOrder), jadi kode di dalam kurung
    // itu kunci match yang jauh lebih reliable ketimbang nama penuh.
    return list.map(({ lastCreatedAt: _lastCreatedAt, ...item }) => {
      if (item.type !== 'part') return item;
      const codeMatch = item.name.match(/\(([^()]+)\)\s*$/);
      const stockMatch = codeMatch
        ? warehouseStock.find(s => s.code.trim().toLowerCase() === codeMatch[1].trim().toLowerCase())
        : warehouseStock.find(s => s.name.trim().toLowerCase() === item.name.toLowerCase());
      if (!stockMatch) return item;
      return {
        ...item,
        price: stockMatch.price,
        liveStock: stockMatch.stock,
        partSource: stockMatch.stock > 0 ? 'gudang_stock' as const : undefined,
      };
    });
  }, [exactPlateMatches, warehouseStock]);

  const [selectedHistoryKeys, setSelectedHistoryKeys] = useState<Set<string>>(new Set());

  const toggleHistoryKey = (key: string) => {
    setSelectedHistoryKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const [addedHistoryItems, setAddedHistoryItems] = useState<ServiceItem[]>([]);

  const addSelectedHistoryItems = () => {
    const toAdd = historySuggestions
      .filter(s => selectedHistoryKeys.has(s.key) && !addedHistoryItems.some(a => a.name === s.name && a.type === s.type))
      .map<ServiceItem>(s => ({
        id: genId('svc'),
        name: s.name,
        type: s.type,
        price: s.price,
        qty: s.qty,
        status: 'pending',
        ...(s.partSource ? { partSource: s.partSource } : {}),
      }));
    setAddedHistoryItems(prev => [...prev, ...toAdd]);
    setSelectedHistoryKeys(new Set());
  };

  const removeAddedHistoryItem = (id: string) => {
    setAddedHistoryItems(prev => prev.filter(i => i.id !== id));
  };

  const applyProfile = (order: Order) => {
    setName(order.customerName);
    setPhone(order.customerPhone);
    setAddress(order.customerAddress || '');
    setBrand(order.carBrand);
    setModel(order.carModel);
    setCarType(order.carType || '');
    setYear(order.carYear || '');
    setEngineCode(order.carEngineCode || '');
    setVin(order.carVin || '');
    setAutofilledFromId(order.id);
    setShowAltProfiles(false);
  };

  const dismissSuggestion = () => {
    setDismissedForPlate(normalizedPlateQuery);
    setShowAltProfiles(false);
  };

  // Multi-step validator — cuma no HP, nama, plat, dan keluhan yang jadi
  // gerbang wajib buat WO bisa terbit. Detail teknis kendaraan (VIN, kode
  // engine, tipe, tahun) boleh nyusul diisi pas mobil udah di bay, jadi
  // nggak ngeblok WO terbit cuma gara-gara data itu belum ada di tangan SA.
  const canProceed = () => {
    if (step === 1) return phone.length >= 10 && name.length >= 3 && plate.trim() !== '';
    if (step === 2) return complaint.trim() !== '';
    return true;
  };

  const handleNext = () => {
    if (canProceed()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const nextWoNumber = generateWoNumber();

    const newOrder: Order = {
      id: nextWoNumber,
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      carBrand: brand,
      carModel: model,
      plateNumber: plate.toUpperCase(),
      carVin: vin.toUpperCase(),
      carType: carType,
      carYear: year,
      carEngineCode: engineCode.toUpperCase(),
      complaint: complaint,
      serviceType: serviceType,
      status: 'antre',
      createdAt: new Date().toISOString(),
      advisorId: activeUser?.id || '',  // SA yang pegang WO
      advisorName: activeUser?.name || 'SA',  // SA bertanggung jawab
      // Penugasan mekanik sengaja nggak diminta di sini — dipilih sekali di
      // Papan Kerja Advisor pas SPK dikirim (App.tsx handleSendSPK), jadi
      // minta di sini cuma bikin SA isi 2x buat hal yang sama.
      findings: [],
      serviceItems: addedHistoryItems,
      timeline: [
        {
          id: genId('t-init'),
          status: 'antre',
          timestamp: new Date().toISOString(),
          title: 'Registrasi Selesai',
          description: `Kendaraan didaftarkan oleh Advisor ${activeUser.name}. Menunggu mekanik memulai diagnosis.`,
          actor: `Advisor ${activeUser.name}`
        }
      ],
      paymentStatus: 'belum_dibayar'
    };

    onAddOrder(newOrder);
    setLastOrderId(nextWoNumber);
    setSuccess(true);
  };

  const resetForm = () => {
    setPhone('');
    setName('');
    setAddress('');
    setBrand('Mercedes-Benz');
    setModel('');
    setPlate('');
    setVin('');
    setCarType('');
    setYear('');
    setEngineCode('');
    setServiceType('Servis Rutin');
    setComplaint('');
    setDismissedForPlate(null);
    setAutofilledFromId(null);
    setShowAltProfiles(false);
    setSelectedHistoryKeys(new Set());
    setAddedHistoryItems([]);
    setStep(1);
    setSuccess(false);
  };

  const STEPS = [
    { s: 1, label: 'Kendaraan & Pelanggan', icon: Car },
    { s: 2, label: 'Layanan', icon: Wrench },
    { s: 3, label: 'Tinjau', icon: FileText }
  ];

  return (
    <div className="card p-6 space-y-6">

      {/* Advisor Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d35] pb-4">
        <div>
          <span className="text-[10px] bg-gray-100 dark:bg-[#22252c] text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
            Service Advisor Board
          </span>
          <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-white mt-2">Buat Orderan Baru (Work Order)</h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Mendaftarkan pelanggan baru dan detail problem kendaraannya.</p>
        </div>
      </div>

      {success ? (
        <div className="p-8 text-center bg-gray-50 dark:bg-[#22252c] rounded-xl border border-gray-200 dark:border-[#2a2d35] space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" weight="duotone" />
          </div>
          <div className="space-y-1">
            <h4 className="text-md font-bold text-black dark:text-white">Work Order Berhasil Dibuat!</h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed max-w-md mx-auto">
              Pesanan dengan kode <span className="text-black dark:text-white font-sans font-bold">{lastOrderId}</span> telah berhasil disimpan di server. Mekanik yang ditugaskan akan langsung melihat orderan ini di papan kerja mereka.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={resetForm}
              className="bg-berlin-navy hover:bg-berlin-navy-dark text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Buat Orderan Lagi
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Form Step Tracker */}
          <div className="flex justify-between items-center bg-gray-50 dark:bg-[#22252c] p-3 rounded-xl border border-gray-150 dark:border-[#2a2d35]">
            {STEPS.map((st, idx) => {
              const isActive = step === st.s;
              const isDone = step > st.s;
              return (
                <div key={st.s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                    isActive ? 'bg-berlin-navy text-white' :
                    isDone ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white border border-gray-300 dark:border-gray-600' :
                    'bg-white dark:bg-[#1a1d23] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#2a2d35]'
                  }`}>
                    {isDone ? '' : st.s}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider hidden md:block ${isActive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {st.label}
                  </span>
                  {idx < STEPS.length - 1 && <CaretRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 hidden md:block" weight="duotone" />}
                </div>
              );
            })}
          </div>

          {/* STEP 1: Kendaraan & Pelanggan */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-[#22252c] p-4 rounded-xl border border-gray-150 dark:border-[#2a2d35]">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Mulai dari plat nomor</h4>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
                  Kalau kendaraan ini pernah servis di sini, data pelanggan & mobilnya bisa langsung dipakai ulang. Detail teknis (VIN, kode engine, tipe, tahun) boleh dilengkapi belakangan.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">PLAT NOMOR (NO. POLISI)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: B 1234 AE"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 uppercase font-sans transition-colors"
                  />
                  {normalizedPlateQuery.length >= 5 && plateProfiles.length === 0 && (
                    <MagnifyingGlass className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 absolute right-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
                  )}
                </div>

                {showSuggestion && primaryProfile && (
                  <div className={`rounded-xl border p-3.5 space-y-2.5 ${autofilledFromId === primaryProfile.id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'}`}>
                    <div className="flex items-start gap-2.5">
                      <Car className="w-4 h-4 shrink-0 mt-0.5 text-blue-700 dark:text-blue-400" weight="duotone" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                          {autofilledFromId === primaryProfile.id ? 'Data dipakai dari riwayat servis' : 'Ditemukan riwayat servis'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                          {primaryProfile.customerName} — {primaryProfile.carBrand} {primaryProfile.carModel}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          Servis terakhir: {new Date(primaryProfile.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {altProfiles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAltProfiles(v => !v)}
                            className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {showAltProfiles ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                            +{altProfiles.length} riwayat lain buat plat ini
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={dismissSuggestion}
                        title="Tutup saran"
                        className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {showAltProfiles && (
                      <div className="space-y-1.5 border-t border-blue-200/60 dark:border-blue-500/20 pt-2.5">
                        {altProfiles.map(o => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => applyProfile(o)}
                            className="w-full text-left bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                          >
                            {o.customerName} — {o.carBrand} {o.carModel} · {new Date(o.createdAt).toLocaleDateString('id-ID')}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => applyProfile(primaryProfile)}
                        className="bg-berlin-navy hover:bg-berlin-navy-dark text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Pakai data ini
                      </button>
                      <button
                        type="button"
                        onClick={dismissSuggestion}
                        className="border border-gray-200 dark:border-[#2a2d35] text-gray-500 dark:text-gray-400 px-3.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-white dark:hover:bg-black/20 transition-colors cursor-pointer"
                      >
                        Bukan mobil ini
                      </button>
                    </div>
                  </div>
                )}

                {historySuggestions.length > 0 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <ClipboardText className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" weight="duotone" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Jasa & part yang biasa dipakai kendaraan ini</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Dari riwayat servis plat ini sebelumnya. Centang yang mau dimasukkan ke WO ini.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {historySuggestions.map(item => {
                        const alreadyAdded = addedHistoryItems.some(a => a.name === item.name && a.type === item.type);
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] transition-colors ${
                              alreadyAdded
                                ? 'bg-white/40 dark:bg-black/10 opacity-50 cursor-not-allowed'
                                : 'bg-white/70 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={alreadyAdded}
                              checked={selectedHistoryKeys.has(item.key)}
                              onChange={() => toggleHistoryKey(item.key)}
                              className="rounded border-gray-300 text-berlin-navy focus:ring-0 w-3.5 h-3.5 shrink-0"
                            />
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${item.type === 'jasa' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'}`}>
                              {item.type === 'jasa' ? 'JASA' : 'PART'}
                            </span>
                            <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                            {item.type === 'part' && item.liveStock !== undefined && (
                              <span className={`shrink-0 text-[9px] font-bold ${item.liveStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {item.liveStock > 0 ? `stok ${item.liveStock}` : 'stok habis'}
                              </span>
                            )}
                            <span className="shrink-0 font-sans tabular-nums text-gray-500 dark:text-gray-400">{fmtRupiah(item.price)} × {item.qty}</span>
                          </label>
                        );
                      })}
                    </div>

                    {addedHistoryItems.length > 0 && (
                      <div className="space-y-1.5 border-t border-amber-200/60 dark:border-amber-500/20 pt-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Sudah ditambahkan ke WO ini:</p>
                        {addedHistoryItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-[11px] bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                            <span className="text-emerald-800 dark:text-emerald-300">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-sans tabular-nums text-emerald-700 dark:text-emerald-400">{fmtRupiah(item.price)} × {item.qty}</span>
                              <button type="button" onClick={() => removeAddedHistoryItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={selectedHistoryKeys.size === 0}
                      onClick={addSelectedHistoryItems}
                      className="bg-berlin-navy hover:bg-berlin-navy-dark disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Tambahkan Terpilih
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">NO. HP PELANGGAN (WA)</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 085156010707"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 font-sans transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">NAMA LENGKAP PELANGGAN</label>
                  <input
                    type="text"
                    placeholder="Contoh: Arya Veda Setyanindito"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">ALAMAT PELANGGAN (OPSIONAL)</label>
                  <textarea
                    placeholder="Contoh: Jl. Sudirman No. 123, Jakarta Selatan"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 resize-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">MEREK MOBIL</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value as any)}
                    className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 transition-colors"
                  >
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="BMW">BMW</option>
                    <option value="Audi">Audi</option>
                    <option value="VW">Volkswagen (VW)</option>
                    <option value="MINI">MINI Cooper</option>
                    <option value="Land Rover">Land Rover</option>
                    <option value="Lainnya">Lainnya / Non-Eropa</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">SERI / MODEL (OPSIONAL)</label>
                  <input
                    type="text"
                    placeholder="Contoh: C300 atau E250 Avantgarde"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 transition-colors"
                  />
                </div>
              </div>

              <details className="group">
                <summary className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500 cursor-pointer select-none list-none flex items-center gap-1.5">
                  <CaretDown className="w-3 h-3 group-open:hidden" />
                  <CaretUp className="w-3 h-3 hidden group-open:block" />
                  Detail Teknis Kendaraan (opsional, boleh nyusul)
                </summary>
                <div className="space-y-4 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">TYPE / VARIAN</label>
                      <input
                        type="text"
                        placeholder="Contoh: W204, LCI, Coupe"
                        value={carType}
                        onChange={(e) => setCarType(e.target.value)}
                        className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">TAHUN PEMBUATAN</label>
                      <input
                        type="text"
                        placeholder="Contoh: 2018"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 font-sans transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">KODE ENGINE</label>
                      <input
                        type="text"
                        placeholder="Contoh: M271, N20, EA888"
                        value={engineCode}
                        onChange={(e) => setEngineCode(e.target.value)}
                        className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 uppercase font-sans transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">NOMOR RANGKA (VIN)</label>
                      <input
                        type="text"
                        placeholder="Contoh: WDD2040491F123456"
                        value={vin}
                        onChange={(e) => setVin(e.target.value)}
                        className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 uppercase font-sans transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* STEP 2: Layanan & Keluhan */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-[#22252c] p-4 rounded-xl border border-gray-150 dark:border-[#2a2d35]">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Layanan & Keluhan Utama</h4>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
                  Pilih kategori pengerjaan utama serta catat keluhan langsung pemilik kendaraan dengan detail.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">TIPE LAYANAN UTAMA</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['Servis Rutin', 'Perbaikan Mesin', 'Kelistrikan', 'Kaki-Kaki', 'Restorasi'] as Order['serviceType'][]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`py-2 px-3.5 text-center text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                        serviceType === type
                          ? 'bg-berlin-navy text-white border-berlin-navy'
                          : 'bg-white dark:bg-[#22252c] border-gray-200 dark:border-[#2a2d35] hover:border-gray-300 dark:hover:border-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">DETAIL KELUHAN AWAL</label>
                <textarea
                  placeholder="Contoh: Mesin sering mati mendadak saat berjalan lambat, rem belakang bunyi berdecit keras..."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  rows={4}
                  className="w-full bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-black dark:focus:border-gray-500 resize-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Tinjau & Simpan */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-[#22252c] p-4 rounded-xl border border-gray-150 dark:border-[#2a2d35]">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Tinjau Rincian Work Order</h4>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
                  Pastikan semua rincian data pelanggan dan kendaraan di bawah ini sudah akurat sebelum didaftarkan ke server bengkel.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-[#22252c] rounded-xl border border-gray-150 dark:border-[#2a2d35] p-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200/80 dark:border-[#2a2d35]">
                  <div className="space-y-1">
                    <span className="text-gray-400 dark:text-gray-500 block leading-tight font-semibold">PELANGGAN</span>
                    <span className="font-bold text-gray-850 dark:text-white block">{name}</span>
                    <span className="text-gray-500 dark:text-gray-400 block font-sans">{phone}</span>
                    <span className="text-gray-400 dark:text-gray-500 block mt-1 font-semibold">ALAMAT:</span>
                    <span className="text-gray-600 dark:text-gray-300 block bg-white dark:bg-[#1a1d23] p-1.5 rounded border border-gray-100 dark:border-[#2a2d35] italic">{address || '-'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-400 dark:text-gray-500 block leading-tight font-semibold">KENDARAAN</span>
                    <span className="font-bold text-gray-850 dark:text-white block">{brand} {model}</span>
                    <span className="text-gray-500 dark:text-gray-400 block font-sans uppercase">{plate}</span>
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-[10px] bg-white dark:bg-[#1a1d23] p-2 rounded border border-gray-100 dark:border-[#2a2d35] mt-1">
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block">TYPE:</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{carType || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block">TAHUN:</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{year || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block">ENGINE:</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase">{engineCode || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block">VIN:</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase font-sans">{vin || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 dark:text-gray-500 block leading-tight font-semibold">KATEGORI LAYANAN</span>
                  <span className="font-bold text-black dark:text-white mt-1 block">{serviceType}</span>
                </div>

                <div>
                  <span className="text-gray-400 dark:text-gray-500 block leading-tight font-semibold">DETAIL KELUHAN AWAL</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 mt-1 block italic bg-white dark:bg-[#1a1d23] p-2.5 rounded-lg border border-gray-200 dark:border-[#2a2d35]">
                    "{complaint}"
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#2a2d35] pt-5">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                step === 1
                  ? 'border-gray-150 dark:border-[#2a2d35] text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'border-gray-200 dark:border-[#2a2d35] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#22252c] cursor-pointer shadow-xs'
              }`}
            >
              KEMBALI
            </button>

            {step < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-5 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1 transition-all ${
                  canProceed()
                    ? 'bg-berlin-navy hover:bg-berlin-navy-dark text-white cursor-pointer shadow-sm'
                    : 'bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                LANJUT
                <ArrowRight className="w-3.5 h-3.5" weight="duotone" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="bg-berlin-navy hover:bg-berlin-navy-dark text-white px-6 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer shadow-sm"
              >
                SIMPAN & TERBITKAN WORK ORDER
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
