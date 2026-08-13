import { create } from 'zustand';

export type StaffTab =
  | 'dashboard' | 'create_order' | 'track_dashboard' | 'accounting'
  | 'gudang' | 'monitor_service' | 'monitor_tunggu' | 'spk'
  | 'manager_dashboard' | 'marketing' | 'finance_report' | 'audit_log' | 'settings';

interface UIState {
  activeTab: StaffTab;
  sidebarCollapsed: boolean;
  sandboxNotification: string | null;
  dbError: string | null;
  commandPaletteOpen: boolean;

  setActiveTab: (tab: StaffTab) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  showNotification: (msg: string) => void;
  setDbError: (error: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'dashboard',
  sidebarCollapsed: localStorage.getItem('staff_sidebar_collapsed') === 'true',
  sandboxNotification: null,
  dbError: null,
  commandPaletteOpen: false,

  setActiveTab: (activeTab) => set({ activeTab }),

  toggleSidebar: () => set((state) => {
    const next = !state.sidebarCollapsed;
    localStorage.setItem('staff_sidebar_collapsed', String(next));
    return { sidebarCollapsed: next };
  }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  showNotification: (msg) => {
    set({ sandboxNotification: msg });
    setTimeout(() => set({ sandboxNotification: null }), 5000);
  },

  setDbError: (dbError) => set({ dbError }),

  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));
