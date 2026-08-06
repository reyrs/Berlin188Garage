import React from 'react';
import { Users, ShieldCheck, Check, Minus } from '@phosphor-icons/react';
import { User, UserRole } from '../types';

interface TabRoleEntry {
  label: string;
  roles: string[];
}

interface SettingsPanelProps {
  staffUsers: User[];
  onlineStaffIds: Set<string>;
  tabs: TabRoleEntry[];
  activeUser: User;
}

const STAFF_ROLES: UserRole[] = ['owner', 'manager', 'advisor', 'kasir', 'gudang', 'mekanik', 'marketing', 'accounting'];

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner', manager: 'Manager', advisor: 'Advisor', kasir: 'Kasir',
  gudang: 'Gudang', mekanik: 'Mekanik', marketing: 'Marketing', accounting: 'Accounting',
};

export default function SettingsPanel({ staffUsers, onlineStaffIds, tabs, activeUser }: SettingsPanelProps) {
  return (
    <div className="space-y-6">

      {/* Account card */}
      <div className="card p-6 space-y-4">
        <div className="border-b border-gray-100 dark:border-[#2a2d35] pb-4">
          <span className="text-[10px] bg-gray-100 dark:bg-[#22252c] text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
            Pengaturan
          </span>
          <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-white mt-2">Akun Saya</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-gray-400 dark:text-gray-500 block font-semibold">NAMA</span>
            <span className="text-gray-800 dark:text-gray-100 font-bold mt-0.5 block">{activeUser.name}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500 block font-semibold">EMAIL</span>
            <span className="text-gray-800 dark:text-gray-100 font-bold mt-0.5 block">{activeUser.email}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500 block font-semibold">ROLE</span>
            <span className="text-gray-800 dark:text-gray-100 font-bold mt-0.5 block">{ROLE_LABEL[activeUser.role] || activeUser.role}</span>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
          Untuk ganti password, gunakan link "Lupa password?" di halaman login — mengirim link reset ke email Anda.
        </div>
      </div>

      {/* Staff directory */}
      <div className="card p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pb-3 border-b border-gray-100 dark:border-[#2a2d35] flex items-center gap-2">
          <Users className="w-4 h-4" weight="duotone" />
          Direktori Staff ({staffUsers.length})
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {staffUsers.map(u => (
            <div key={u.id} className="bg-gray-50 dark:bg-[#22252c] border border-gray-150 dark:border-[#2a2d35] p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 text-xs shrink-0">
                {u.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{u.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                <p className="text-[9px] uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${onlineStaffIds.has(u.id) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className={onlineStaffIds.has(u.id) ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission matrix */}
      <div className="card p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pb-3 border-b border-gray-100 dark:border-[#2a2d35] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" weight="duotone" />
          Matriks Hak Akses Menu
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky left-0 bg-white dark:bg-[#1a1d23]">Menu</th>
                {STAFF_ROLES.map(role => (
                  <th key={role} className="py-2 px-2 text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-wider text-center whitespace-nowrap">
                    {ROLE_LABEL[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabs.map(tab => (
                <tr key={tab.label} className="border-t border-gray-100 dark:border-[#2a2d35]">
                  <td className="py-2 pr-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap sticky left-0 bg-white dark:bg-[#1a1d23]">{tab.label}</td>
                  {STAFF_ROLES.map(role => (
                    <td key={role} className="py-2 px-2 text-center">
                      {tab.roles.includes(role) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mx-auto" weight="bold" />
                      ) : (
                        <Minus className="w-3 h-3 text-gray-200 dark:text-gray-700 mx-auto" weight="bold" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
          Untuk menambah staf baru atau mengubah role, gunakan <code className="bg-gray-100 dark:bg-[#22252c] px-1 rounded">npm run staff:provision</code> (lihat <code className="bg-gray-100 dark:bg-[#22252c] px-1 rounded">STAFF_CREDENTIALS.local.md</code>). Manajemen akun langsung dari dashboard ini belum tersedia.
        </p>
      </div>
    </div>
  );
}
