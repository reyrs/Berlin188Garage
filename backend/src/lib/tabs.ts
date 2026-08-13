import { LayoutDashboard, FilePlus, ClipboardList, Package, Monitor, BookOpen, FileBarChart, Wrench, History, Settings } from 'lucide-react';
import type { StaffTab } from '@/stores';

export const ALL_TABS: { id: StaffTab; label: string; icon: any; roles: string[] }[] = [
  { id: 'dashboard', label: 'Laporan', icon: LayoutDashboard, roles: ['owner', 'advisor'] },
  { id: 'create_order', label: 'Buat WO', icon: FilePlus, roles: ['advisor', 'owner'] },
  { id: 'track_dashboard', label: 'Kelola WO', icon: ClipboardList, roles: ['advisor', 'owner'] },
  { id: 'gudang', label: 'Gudang', icon: Package, roles: ['gudang', 'owner', 'advisor'] },
  { id: 'spk', label: 'Kerja Saya', icon: Wrench, roles: ['mekanik', 'advisor'] },
  { id: 'manager_dashboard', label: 'Pantauan', icon: LayoutDashboard, roles: ['manager', 'advisor'] },
  { id: 'marketing', label: 'Konten & Portofolio', icon: Monitor, roles: ['marketing', 'advisor'] },
  { id: 'monitor_service', label: 'Monitor Service', icon: Monitor, roles: ['advisor', 'kasir', 'gudang', 'owner', 'manager', 'mekanik'] },
  { id: 'monitor_tunggu', label: 'Monitor Tunggu', icon: Monitor, roles: ['advisor', 'kasir', 'gudang', 'owner', 'manager'] },
  { id: 'accounting', label: 'Akunting', icon: BookOpen, roles: ['kasir', 'owner', 'advisor'] },
  { id: 'finance_report', label: 'Laporan Keuangan', icon: FileBarChart, roles: ['accounting', 'owner', 'kasir', 'advisor'] },
  { id: 'audit_log', label: 'Log Aktivitas', icon: History, roles: ['owner', 'manager'] },
  { id: 'settings', label: 'Pengaturan', icon: Settings, roles: ['owner', 'manager'] },
];
