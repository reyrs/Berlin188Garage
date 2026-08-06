import React, { createContext, useContext, useState } from 'react';

export interface Notification {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  push: (message: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const now = Date.now();

const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'seed-1', message: 'WO #1042 berhasil dibuat', timestamp: now - 5 * 60 * 1000, read: false },
  { id: 'seed-2', message: 'Pembayaran WO #1038 telah dikonfirmasi', timestamp: now - 60 * 60 * 1000, read: false },
  { id: 'seed-3', message: 'SPK WO #1040 dikirim ke mekanik', timestamp: now - 26 * 60 * 60 * 1000, read: true },
];

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  push: () => {},
  markRead: () => {},
  markAllRead: () => {},
  clear: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);

  const push = (message: string) => {
    setNotifications(prev => [
      { id: crypto.randomUUID(), message, timestamp: Date.now(), read: false },
      ...prev,
    ]);
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clear = () => setNotifications([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markRead, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
