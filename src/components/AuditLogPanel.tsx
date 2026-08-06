import React, { useEffect, useMemo, useState } from 'react';
import { Clipboard, CurrencyCircleDollar, Vault, MagnifyingGlass, ListBullets, Bug } from '@phosphor-icons/react';
import { Order, CashTransaction, CashClosing } from '../types';
import { fetchErrorLogs } from '../lib/db';

interface AuditLogPanelProps {
  orders: Order[];
  transactions: CashTransaction[];
  closings: CashClosing[];
}

type EntryKind = 'order' | 'transaksi' | 'kas' | 'error';

interface AuditEntry {
  id: string;
  timestamp: number;
  actor: string;
  message: string;
  kind: EntryKind;
}

const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

const KIND_CONFIG: Record<EntryKind, { label: string; icon: any; color: string }> = {
  order: { label: 'Order', icon: Clipboard, color: 'text-berlin-navy dark:text-berlin-gold' },
  transaksi: { label: 'Transaksi', icon: CurrencyCircleDollar, color: 'text-emerald-600 dark:text-emerald-400' },
  kas: { label: 'Closing Kas', icon: Vault, color: 'text-amber-600 dark:text-amber-400' },
  error: { label: 'Error', icon: Bug, color: 'text-red-600 dark:text-red-400' },
};

export default function AuditLogPanel({ orders, transactions, closings }: AuditLogPanelProps) {
  const [kindFilter, setKindFilter] = useState<EntryKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [errorEntries, setErrorEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetchErrorLogs()
      .then(logs => setErrorEntries(logs.map(e => ({
        id: `error-${e.id}`,
        timestamp: new Date(e.createdAt).getTime(),
        actor: e.source,
        message: `${e.message}${e.pageUrl ? ` — di ${e.pageUrl.replace(window.location.origin, '')}` : ''}`,
        kind: 'error' as const,
      }))))
      .catch(err => console.error('Failed to load error logs:', err));
  }, []);

  const entries = useMemo<AuditEntry[]>(() => {
    const orderEntries: AuditEntry[] = orders.flatMap(o =>
      o.timeline.map(t => ({
        id: `order-${o.id}-${t.id}`,
        timestamp: new Date(t.timestamp).getTime(),
        actor: t.actor,
        message: `${t.title} — WO ${o.id} (${o.customerName}): ${t.description}`,
        kind: 'order' as const,
      }))
    );

    const txEntries: AuditEntry[] = transactions.map(tx => ({
      id: `tx-${tx.id}`,
      timestamp: new Date(tx.timestamp).getTime(),
      actor: tx.createdBy || 'Sistem',
      message: `${tx.type === 'masuk' ? 'Kas masuk' : 'Kas keluar'} ${fmt(tx.amount)} — ${tx.description}`,
      kind: 'transaksi' as const,
    }));

    const kasEntries: AuditEntry[] = closings.map(c => ({
      id: `kas-${c.id}`,
      timestamp: new Date(c.timestamp).getTime(),
      actor: c.closedBy,
      message: `Closing kas — sistem ${fmt(c.systemCash)}, fisik ${fmt(c.physicalCash)}${c.discrepancy !== 0 ? `, selisih ${fmt(c.discrepancy)}` : ' (cocok)'}`,
      kind: 'kas' as const,
    }));

    return [...orderEntries, ...txEntries, ...kasEntries, ...errorEntries].sort((a, b) => b.timestamp - a.timestamp);
  }, [orders, transactions, closings, errorEntries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (kindFilter !== 'all') list = list.filter(e => e.kind === kindFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.actor.toLowerCase().includes(q) || e.message.toLowerCase().includes(q));
    }
    return list.slice(0, 200);
  }, [entries, kindFilter, search]);

  const counts = useMemo(() => ({
    all: entries.length,
    order: entries.filter(e => e.kind === 'order').length,
    transaksi: entries.filter(e => e.kind === 'transaksi').length,
    kas: entries.filter(e => e.kind === 'kas').length,
    error: entries.filter(e => e.kind === 'error').length,
  }), [entries]);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d35] pb-4">
        <div>
          <span className="text-[10px] bg-gray-100 dark:bg-[#22252c] text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
            Riwayat Aktivitas
          </span>
          <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-white mt-2">Log Aktivitas Bengkel</h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
            Gabungan riwayat order, transaksi kas, closing kas, dan error yang tertangkap di website — siapa/apa terjadi dan kapan.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'order', 'transaksi', 'kas', 'error'] as const).map(k => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              kindFilter === k
                ? 'bg-berlin-navy text-white'
                : 'bg-gray-100 dark:bg-[#22252c] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            {k === 'all' ? <ListBullets className="w-3.5 h-3.5" weight="duotone" /> : React.createElement(KIND_CONFIG[k].icon, { className: 'w-3.5 h-3.5', weight: 'duotone' })}
            {k === 'all' ? 'Semua' : KIND_CONFIG[k].label}
            <span className="text-[10px] opacity-70">({counts[k]})</span>
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Cari nama staf atau kata kunci..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-1.5 pl-8 pr-3 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy dark:focus:border-berlin-gold transition-colors"
          />
          <MagnifyingGlass className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" weight="duotone" />
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-[#2a2d35] max-h-[560px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500 space-y-2">
            <ListBullets className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" weight="duotone" />
            <p className="text-xs font-semibold">Belum ada aktivitas tercatat.</p>
          </div>
        ) : (
          filtered.map(entry => {
            const cfg = KIND_CONFIG[entry.kind];
            const Icon = cfg.icon;
            return (
              <div key={entry.id} className="py-3 flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg bg-gray-50 dark:bg-[#22252c] flex items-center justify-center shrink-0 ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 dark:text-gray-100 leading-snug">{entry.message}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    <span className="font-semibold">{entry.actor}</span>
                    {' · '}
                    {new Date(entry.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
