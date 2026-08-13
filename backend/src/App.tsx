import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@shared/supabase';
import { mapOrder } from '@shared/db';
import { usePresence } from '@shared/usePresence';
import { useAuthStore, useOrderStore, useUIStore } from '@/stores';
import type { StaffTab } from '@/stores';
import { ALL_TABS } from '@/lib/tabs';

import LoginModal from './components/LoginModal';
import CommandPalette from './components/CommandPalette';
import NotificationCenter from './components/NotificationCenter';
import ThemeToggle from '@shared/components/ThemeToggle';
import { Search, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const AdvisorPanel = lazy(() => import('./pages/AdvisorPanel'));
const AdvisorDashboard = lazy(() => import('./pages/AdvisorDashboard'));
const AccountingPanel = lazy(() => import('./pages/AccountingPanel'));
const OwnerPanel = lazy(() => import('./pages/OwnerPanel'));
const WarehousePanel = lazy(() => import('./pages/WarehousePanel'));
const TechnicianPanel = lazy(() => import('./pages/TechnicianPanel'));
const ManagerPanel = lazy(() => import('./pages/ManagerPanel'));
const FinanceReportPanel = lazy(() => import('./pages/FinanceReportPanel'));
const AuditLogPanel = lazy(() => import('./pages/AuditLogPanel'));
const SettingsPanel = lazy(() => import('./pages/SettingsPanel'));
const MarketingPanel = lazy(() => import('./pages/MarketingPanel'));
const SlotBoard = lazy(() => import('./pages/SlotBoard'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400 text-sm">
      Memuat...
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { activeStaffUser, isRestoring, restoreSession, initAuthListener } = useAuthStore();
  const { loadOrders } = useOrderStore();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (cleanupRef.current) cleanupRef.current();
    restoreSession();
    cleanupRef.current = initAuthListener();
    return () => {
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (activeStaffUser) loadOrders();
  }, [activeStaffUser, loadOrders]);

  if (isRestoring) return <LoadingFallback />;
  if (!activeStaffUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function StaffLayout() {
  const { activeStaffUser, logout, setOnlineStaffIds } = useAuthStore();
  const { orders, setOrders } = useOrderStore();
  const {
    activeTab, sidebarCollapsed, toggleSidebar,
    sandboxNotification, dbError, commandPaletteOpen, setCommandPaletteOpen,
    setActiveTab, showNotification, setDbError,
  } = useUIStore();

  const userRole = activeStaffUser?.role ?? 'advisor';
  const visibleTabs = ALL_TABS.filter((t) => t.roles.includes(userRole));

  const presence = usePresence(activeStaffUser?.id);
  useEffect(() => {
    setOnlineStaffIds(presence as unknown as Set<string>);
  }, [presence, setOnlineStaffIds]);

  useEffect(() => {
    if (!supabase || !activeStaffUser) return;
    const channel = supabase
      .channel(`orders-realtime-backend`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const current = useOrderStore.getState().orders;
        if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as { id?: string }).id;
          if (deletedId) setOrders(current.filter((o) => o.id !== deletedId));
          return;
        }
        const updated = mapOrder(payload.new);
        const exists = current.some((o) => o.id === updated.id);
        setOrders(exists ? current.map((o) => (o.id === updated.id ? updated : o)) : [updated, ...current]);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [activeStaffUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  // Papan slot standalone (dark screen untuk TV bengkel) — Ruang Service
  // interaktif (klik slot buka SPK), Ruang Tunggu pasif (papan status doang,
  // supaya customer nggak bisa buka data pribadi customer lain). Sengaja
  // di luar shell sidebar+header, sama kayak monitor_service/monitor_tunggu
  // di app lama (src/App.tsx) — bukan tab dashboard biasa. Harus setelah
  // semua hook di atas (Rules of Hooks — nggak boleh early-return sebelum
  // hook lain kepanggil).
  if (activeTab === 'monitor_service' || activeTab === 'monitor_tunggu') {
    return (
      <div>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="print:hidden fixed top-4 left-4 z-50 bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700"
        >
          ← Kembali
        </button>
        <Suspense fallback={<LoadingFallback />}>
          <SlotBoard interactive={activeTab === 'monitor_service'} />
        </Suspense>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    showNotification('Anda telah logout.');
  };

  const tabContent: Partial<Record<StaffTab, React.ReactNode>> = {
    dashboard: <OwnerPanel />,
    create_order: <AdvisorPanel />,
    track_dashboard: <AdvisorDashboard />,
    accounting: <AccountingPanel />,
    gudang: <WarehousePanel />,
    spk: <TechnicianPanel />,
    manager_dashboard: <ManagerPanel />,
    marketing: <MarketingPanel />,
    finance_report: <FinanceReportPanel />,
    audit_log: <AuditLogPanel />,
    settings: <SettingsPanel />,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {dbError && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-berlin-red text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
          <span>⚠️ {dbError}</span>
          <button
            onClick={() => setDbError(null)}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      )}

      {sandboxNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 p-4 rounded-xl shadow-lg max-w-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <LogOut className="w-5 h-5 text-black shrink-0 mt-0.5" />
          <p className="text-gray-800 text-sm leading-snug">{sandboxNotification}</p>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-[#2a2d35] bg-white dark:bg-[#1a1d23] py-3 px-6 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-on-white.png" alt="Berlin 188 Garage" className="h-8 object-contain rounded-lg" />
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest leading-none">Berlin188 Garage</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                {activeStaffUser?.name} <span className="text-gray-400 dark:text-gray-500 font-normal">· {activeStaffUser?.role}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#2a2d35] hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Cari
              <kbd className="text-[10px] font-semibold border border-gray-200 dark:border-[#2a2d35] rounded px-1">⌘K</kbd>
            </button>
            <NotificationCenter />
            <ThemeToggle />
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0">
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>

        <div className="lg:hidden max-w-7xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-berlin-navy text-white'
                    : 'bg-gray-100 dark:bg-[#22252c] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        navItems={visibleTabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
        onNavigate={(tabId) => { setActiveTab(tabId as StaffTab); setCommandPaletteOpen(false); }}
        orders={orders}
        onSelectOrder={() => { setActiveTab('track_dashboard'); setCommandPaletteOpen(false); }}
      />

      <div className="max-w-7xl mx-auto flex gap-6 p-4 sm:p-6 pb-24">
        <aside className={`hidden lg:block shrink-0 transition-all ${sidebarCollapsed ? 'w-14' : 'w-56'}`}>
          <nav className="sticky top-24 space-y-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={sidebarCollapsed ? tab.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    activeTab === tab.id
                      ? 'bg-berlin-navy text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && tab.label}
                </button>
              );
            })}
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Perlebar menu' : 'Ciutkan menu'}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all mt-2 border-t border-gray-100 dark:border-[#2a2d35] pt-3 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}>
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronLeft className="w-4 h-4 shrink-0" />}
              {!sidebarCollapsed && 'Ciutkan'}
            </button>
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <Suspense fallback={<LoadingFallback />}>
            {tabContent[activeTab] ?? (
              <div className="bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] p-10 rounded-2xl text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Pilih menu di samping untuk memulai.</p>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <Suspense fallback={<LoadingFallback />}>
          <LoginModal />
        </Suspense>
      } />
      <Route path="/*" element={
        <AuthGuard>
          <StaffLayout />
        </AuthGuard>
      } />
    </Routes>
  );
}
