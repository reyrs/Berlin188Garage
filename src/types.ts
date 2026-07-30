export type UserRole = 'owner' | 'manager' | 'kasir' | 'advisor' | 'gudang' | 'mekanik' | 'marketing' | 'customer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  avatarUrl?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  type: 'jasa' | 'part';
  price: number;
  qty: number;
  status?: 'pending' | 'approved' | 'rejected';
  completed?: boolean;
  partSource?: 'gudang_stock' | 'bawa_sendiri' | 'none';
  photoUrl?: string;
  findingId?: string;
}

export interface TimelineEvent {
  id: string;
  status: 'antre' | 'dikerjakan' | 'temuan_dilaporkan' | 'menunggu_pembayaran' | 'selesai';
  timestamp: string;
  title: string;
  description: string;
  actor: string;
}

export interface DiagnosticFinding {
  id: string;
  description: string;
  imageUrl?: string;
  estimatedCost: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  warehouseResolved?: boolean;
  resolvedPartName?: string;
  resolvedPartSource?: 'gudang_stock' | 'bawa_sendiri' | 'none';
  resolvedParts?: Array<{
    id: string;
    name: string;
    price: number;
    qty: number;
    source: 'gudang_stock' | 'bawa_sendiri' | 'none';
  }>;
  services?: Array<{
    id: string;
    name: string;
    price: number;
    qty: number;
    completed?: boolean;
    status?: 'draft' | 'pending' | 'approved' | 'rejected';
  }>;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  carBrand: 'Mercedes-Benz' | 'BMW' | 'Audi' | 'VW' | 'MINI' | 'Land Rover' | 'Lainnya';
  carModel: string;
  plateNumber: string;
  carVin?: string;
  carType?: string;
  carYear?: string;
  carEngineCode?: string;
  complaint: string;
  serviceType: 'Servis Rutin' | 'Perbaikan Mesin' | 'Kelistrikan' | 'Kaki-Kaki' | 'Restorasi';
  status: 'antre' | 'dikerjakan' | 'temuan_dilaporkan' | 'menunggu_pembayaran' | 'selesai';
  createdAt: string;
  advisorId?: string;
  advisorName?: string;
  spkNumber?: string;
  findings: DiagnosticFinding[];
  serviceItems: ServiceItem[];
  timeline: TimelineEvent[];
  paymentStatus: 'belum_dibayar' | 'dp' | 'lunas';
  paymentMethod?: 'tunai' | 'transfer' | 'qris' | 'edc';
  paymentDestination?: string;
  paidAt?: string;
  notes?: string;
  spkSent?: boolean;
  assignedMechanicId?: string;
  assignedMechanicName?: string;
}

export interface CashTransaction {
  id: string;
  orderId?: string;
  customerName?: string;
  amount: number;
  type: 'masuk' | 'keluar';
  method: 'tunai' | 'transfer' | 'qris' | 'edc';
  category: 'pendapatan_jasa' | 'pendapatan_part' | 'operasional' | 'pembelian_part' | 'gaji' | 'lainnya';
  description: string;
  timestamp: string;
  createdBy?: string;
}

export interface CashClosing {
  id: string;
  timestamp: string;
  systemCash: number;
  physicalCash: number;
  discrepancy: number;
  closedBy: string;
  notes?: string;
}

export interface WarehouseStockItem {
  id: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  rackLocation: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: 'operasional' | 'pembelian_part' | 'gaji' | 'utilitas' | 'lainnya';
  method: 'tunai' | 'transfer' | 'qris' | 'edc';
  createdBy: string;
  receiptUrl?: string;
}
