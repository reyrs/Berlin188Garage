import React, { useState } from 'react';
import { UserPlus, Car, Wrench, ChevronRight, Check, Sparkles, User, HelpCircle, FileText, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';
import { Order, User as StaffUser } from '../types';

interface AdvisorPanelProps {
  onAddOrder: (newOrder: Order) => void;
  activeUser: StaffUser;
  staffUsers: StaffUser[];
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

export default function AdvisorPanel({ onAddOrder, activeUser, staffUsers }: AdvisorPanelProps) {
  const mechanics = staffUsers.filter(u => u.role === 'mekanik');
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
  const [mechanicId, setMechanicId] = useState('');

  // Multi-step validator
  const canProceed = () => {
    if (step === 1) return phone.length >= 10 && name.length >= 3 && address.trim().length >= 3;
    if (step === 2) {
      return (
        plate.trim() !== '' &&
        model.trim() !== '' &&
        vin.trim() !== '' &&
        carType.trim() !== '' &&
        year.trim() !== '' &&
        engineCode.trim() !== ''
      );
    }
    if (step === 3) return complaint.trim() !== '';
    if (step === 4) return mechanicId !== '';
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
    const selectedMechanic = mechanics.find(m => m.id === mechanicId);

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
      assignedMechanicId: selectedMechanic?.id,
      assignedMechanicName: selectedMechanic?.name,
      findings: [],
      serviceItems: [],
      timeline: [
        {
          id: `t-init-${Date.now()}`,
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
    setMechanicId('');
    setStep(1);
    setSuccess(false);
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-6 shadow-sm">
      
      {/* Advisor Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
            Service Advisor Board
          </span>
          <h3 className="text-lg font-bold text-[#1A1A1A] mt-2">Buat Orderan Baru (Work Order)</h3>
          <p className="text-gray-500 text-xs mt-0.5">Mendaftarkan pelanggan baru dan detail problem kendaraannya.</p>
        </div>
      </div>

      {success ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto text-2xl font-bold">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h4 className="text-md font-bold text-black">Work Order Berhasil Dibuat!</h4>
            <p className="text-gray-500 text-xs leading-relaxed max-w-md mx-auto">
              Pesanan dengan kode <span className="text-black font-sans font-bold">{lastOrderId}</span> telah berhasil disimpan di server. Mekanik yang ditugaskan akan langsung melihat orderan ini di papan kerja mereka.
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
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-150">
            {[
              { s: 1, label: 'Pelanggan', icon: UserPlus },
              { s: 2, label: 'Kendaraan', icon: Car },
              { s: 3, label: 'Layanan', icon: Wrench },
              { s: 4, label: 'Teknisi', icon: User },
              { s: 5, label: 'Tinjau', icon: FileText }
            ].map((st, idx) => {
              const Icon = st.icon;
              const isActive = step === st.s;
              const isDone = step > st.s;
              return (
                <div key={st.s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                    isActive ? 'bg-berlin-navy text-white' :
                    isDone ? 'bg-gray-200 text-black border border-gray-300' :
                    'bg-white text-gray-400 border border-gray-200'
                  }`}>
                    {isDone ? '' : st.s}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider hidden md:block ${isActive ? 'text-black' : 'text-gray-400'}`}>
                    {st.label}
                  </span>
                  {idx < 5 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 hidden md:block" />}
                </div>
              );
            })}
          </div>

          {/* STEP 1: Pelanggan */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Siapa pelanggannya?</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Masukkan data pelanggan dengan lengkap, termasuk nomor telepon WhatsApp dan alamat untuk memudahkan komunikasi dan administrasi.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">NO. HP PELANGGAN (WA)</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 085156010707"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black font-sans transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">NAMA LENGKAP PELANGGAN</label>
                  <input
                    type="text"
                    placeholder="Contoh: Arya Veda Setyanindito"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">ALAMAT PELANGGAN</label>
                  <textarea
                    placeholder="Contoh: Jl. Sudirman No. 123, Jakarta Selatan"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black resize-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Kendaraan */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Data Kendaraan Pemilik</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Pilih merek mobil Eropa spesialisasi kami dan input seri model, plat nomor aktif, nomor rangka (VIN), tipe spesifik, tahun pembuatan, dan kode engine.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">MEREK MOBIL</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black transition-colors"
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
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">SERI / MODEL</label>
                  <input
                    type="text"
                    placeholder="Contoh: C300 atau E250 Avantgarde"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">PLAT NOMOR (NO. POLISI)</label>
                  <input
                    type="text"
                    placeholder="Contoh: B 1234 AE"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black uppercase font-sans transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">TYPE / VARIAN</label>
                  <input
                    type="text"
                    placeholder="Contoh: W204, LCI, Coupe"
                    value={carType}
                    onChange={(e) => setCarType(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">TAHUN PEMBUATAN</label>
                  <input
                    type="text"
                    placeholder="Contoh: 2018"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black font-sans transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">KODE ENGINE</label>
                  <input
                    type="text"
                    placeholder="Contoh: M271, N20, EA888"
                    value={engineCode}
                    onChange={(e) => setEngineCode(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black uppercase font-sans transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">NOMOR RANGKA (VIN NUMBER)</label>
                <input
                  type="text"
                  placeholder="Contoh: WDD2040491F123456"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black uppercase font-sans transition-colors"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Layanan & Keluhan */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Layanan & Keluhan Utama</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Pilih kategori pengerjaan utama serta catat keluhan langsung pemilik kendaraan dengan detail.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">TIPE LAYANAN UTAMA</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['Servis Rutin', 'Perbaikan Mesin', 'Kelistrikan', 'Kaki-Kaki', 'Restorasi'] as Order['serviceType'][]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`py-2 px-3.5 text-center text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                        serviceType === type 
                          ? 'bg-berlin-navy text-white border-berlin-navy' 
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-500'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">DETAIL KELUHAN AWAL</label>
                <textarea
                  placeholder="Contoh: Mesin sering mati mendadak saat berjalan lambat, rem belakang bunyi berdecit keras..."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-black resize-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Teknisi */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Penugasan Mekanik Utama</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Pilih mekanik spesialis yang sedang bertugas untuk menangani langsung pengerjaan diagnosis kendaraan ini.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">MEKANIK BERTUGAS</label>
                <p className="text-[10px] text-gray-400">Pilih mekanik yang sedang stand-by untuk mulai diagnosis kendaraan ini.</p>
                {mechanics.length > 0 ? (
                  <select
                    value={mechanicId}
                    onChange={e => setMechanicId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 bg-white cursor-pointer"
                  >
                    <option value="">— Pilih Mekanik —</option>
                    {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                ) : (
                  <div className="bg-warning-50 border border-warning-100 rounded-xl p-3 text-xs text-warning-700">
                    Daftar mekanik belum termuat. Coba refresh halaman.
                  </div>
                )}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  Mekanik yang dipilih bisa diganti nanti saat SPK dikirim dari Papan Kerja Advisor.
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Tinjau & Simpan */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tinjau Rincian Work Order</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Pastikan semua rincian data pelanggan dan kendaraan di bawah ini sudah akurat sebelum didaftarkan ke server bengkel.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-150 p-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200/80">
                  <div className="space-y-1">
                    <span className="text-gray-400 block leading-tight font-semibold">PELANGGAN</span>
                    <span className="font-bold text-gray-850 block">{name}</span>
                    <span className="text-gray-500 block font-sans">{phone}</span>
                    <span className="text-gray-400 block mt-1 font-semibold">ALAMAT:</span>
                    <span className="text-gray-600 block bg-white p-1.5 rounded border border-gray-100 italic">{address || '-'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-400 block leading-tight font-semibold">KENDARAAN</span>
                    <span className="font-bold text-gray-850 block">{brand} {model}</span>
                    <span className="text-gray-500 block font-sans uppercase">{plate}</span>
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-[10px] bg-white p-2 rounded border border-gray-100 mt-1">
                      <div>
                        <span className="text-gray-400 block">TYPE:</span>
                        <span className="font-semibold text-gray-700">{carType || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">TAHUN:</span>
                        <span className="font-semibold text-gray-700">{year || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">ENGINE:</span>
                        <span className="font-semibold text-gray-700 uppercase">{engineCode || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">VIN:</span>
                        <span className="font-semibold text-gray-700 uppercase font-sans">{vin || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200/80">
                  <div>
                    <span className="text-gray-400 block leading-tight font-semibold">KATEGORI LAYANAN</span>
                    <span className="font-bold text-black mt-1 block">{serviceType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block leading-tight font-semibold">MEKANIK BERTUGAS</span>
                    <span className="font-bold text-gray-850 mt-1 block">{mechanics.find(m => m.id === mechanicId)?.name || 'Belum ditentukan'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 block leading-tight font-semibold font-bold">DETAIL KELUHAN AWAL</span>
                  <span className="font-semibold text-gray-700 mt-1 block italic bg-white p-2.5 rounded-lg border border-gray-200">
                    "{complaint}"
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                step === 1 
                  ? 'border-gray-150 text-gray-300 cursor-not-allowed' 
                  : 'border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 cursor-pointer shadow-xs'
              }`}
            >
              KEMBALI
            </button>

            {step < 5 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-5 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1 transition-all ${
                  canProceed()
                    ? 'bg-berlin-navy hover:bg-berlin-navy-dark text-white cursor-pointer shadow-sm'
                    : 'bg-gray-50 border border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                LANJUT
                <ArrowRight className="w-3.5 h-3.5" />
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
