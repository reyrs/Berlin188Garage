import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '../lib/notifications';

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / (60 * 1000));

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c] hover:text-gray-900 dark:hover:text-white transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#2a2d35]">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifikasi</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-berlin-navy dark:text-berlin-gold hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <BellOff className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Belum ada notifikasi</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Aktivitas terbaru akan muncul di sini</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="w-full text-left flex items-start gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-[#2a2d35] last:border-b-0 hover:bg-gray-50 dark:hover:bg-[#22252c] transition-colors"
                >
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      n.read ? 'bg-transparent' : 'bg-berlin-navy dark:bg-berlin-gold'
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm ${
                        n.read
                          ? 'text-gray-500 dark:text-gray-400 font-normal'
                          : 'text-gray-900 dark:text-white font-semibold'
                      }`}
                    >
                      {n.message}
                    </span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatRelativeTime(n.timestamp)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
