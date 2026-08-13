export type UserRole = 'owner' | 'manager' | 'kasir' | 'advisor' | 'gudang' | 'mekanik' | 'marketing' | 'accounting' | 'customer' | 'vendor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  avatarUrl?: string;
  specialization?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  type: 'jasa' | 'part';
  price: number;
  qty: number;
  status?: 'pending' | 'approved' | 'rejected';
  // Siapa yang mencatat ACC/Tolak — 'customer' cuma disetel oleh RPC
  // customer_set_service_item_status (persetujuan asli lewat portal
  // tracking); 'advisor' disetel SA saat mencatat keputusan pelanggan
  // secara manual (mis. lewat telepon/WA). Tanpa ini nggak ada cara
  // membedakan ACC asli pelanggan dari SA yang mencatat atas nama pelanggan.
  approvedBy?: 'customer' | 'advisor';
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
  // Sama seperti ServiceItem.approvedBy — 'customer' cuma disetel RPC
  // customer_set_finding_status (ACC asli lewat portal tracking), 'advisor'
  // disetel SA saat mencatat keputusan pelanggan secara manual.
  approvedBy?: 'customer' | 'advisor';
  // Kapan estimasi (temuan ini + serviceItems terkaitnya) resmi ditawarkan
  // ke pelanggan (tahap PENAWARAN) — disetel saat SA klik "Kirim Penawaran
  // ke WA Customer" di AdvisorDashboard.
  offeredAt?: string;
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
  // Maks 3 keluhan terpisah per WO (revisi alur manager 2026-08-13). Field
  // `complaint` (string tunggal) lama masih ada di DB buat backward-compat
  // tapi sudah nggak ditulis lagi — pakai `complaints`.
  complaints: string[];
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
  // Tahap ACCOUNTING: invoice harus diterbitkan dulu (kasir/SA klik
  // "Terbitkan Invoice") sebelum pembayaran bisa dicatat.
  invoicedAt?: string;
  paidAt?: string;
  dpAmountPaid?: number;
  notes?: string;
  spkSent?: boolean;
  assignedMechanicId?: string;
  assignedMechanicName?: string;
  slotNumber?: number;
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
  marketplaceProductId?: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: 'operasional' | 'pembelian_part' | 'gaji' | 'utilitas' | 'bayar_supplier' | 'bayar_hutang_owner' | 'lainnya';
  method: 'tunai' | 'transfer' | 'qris' | 'edc';
  createdBy: string;
  receiptUrl?: string;
}

export interface HeroContent {
  headline: string;
  subtitle: string;
  ctaText: string;
  backgroundImageUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PromoPopup {
  enabled: boolean;
  imageUrl?: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  delaySeconds: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PortfolioItem {
  id: string;
  carBrand: string;
  carModel: string;
  serviceType: 'Servis Rutin' | 'Perbaikan Mesin' | 'Kelistrikan' | 'Kaki-Kaki' | 'Restorasi';
  workDescription: string;
  imageUrl: string;
  createdAt?: string;
  createdBy?: string;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  source: string;
  pageUrl?: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  category: 'Tips Perawatan' | 'Berita Bengkel' | 'Promo';
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  sourceUrl?: string;
}

