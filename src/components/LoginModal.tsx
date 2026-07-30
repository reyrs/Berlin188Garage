import React, { useState } from 'react';
import { X, Lock, Phone, Mail, UserCheck, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  users: User[];
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess, users }: LoginModalProps) {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('password188');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput) {
      setError('Silakan masukkan Email atau No. HP');
      return;
    }

    // Look up in our mock staff
    const matchedUser = users.find(
      (u) => 
        u.email.toLowerCase() === loginInput.toLowerCase().trim() ||
        u.phone === loginInput.trim()
    );

    if (matchedUser) {
      setError('');
      onLoginSuccess(matchedUser);
    } else {
      setError('Akun tidak ditemukan. Gunakan daftar shortcut staf di bawah untuk masuk cepat.');
    }
  };

  const handleQuickLogin = (user: User) => {
    setLoginInput(user.email);
    setPassword('password188');
    setError('');
    onLoginSuccess(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Banner decorator */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-berlin-navy" />
        
        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
              <img 
                src="/logo-small.png" 
                alt="Berlin 188 Garage" 
                className="h-8 object-contain" 
              />
            <span className="font-extrabold tracking-tight text-sm text-berlin-navy ml-1">
              BERLIN <span className="text-berlin-red">188</span> <span className="text-gray-400 font-light">GARAGE</span>
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-black border border-gray-150 hover:border-gray-250 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form area */}
        <div className="p-6 space-y-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-berlin-navy">Selamat Datang</h3>
            <p className="text-gray-500 text-xs mt-1">Masuk ke akun utama staf Berlin 188 Garage Anda.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">No. HP atau Email</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-berlin-navy transition-colors"
                />
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Password</label>
                <button type="button" className="text-[11px] text-gray-500 hover:text-berlin-navy hover:underline">Lupa password?</button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-berlin-navy transition-colors"
                />
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-250 text-berlin-navy focus:ring-0 w-3.5 h-3.5"
                />
                <span>Ingat saya</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-berlin-navy hover:bg-berlin-navy/90 text-white py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all border border-berlin-gold/30 mt-2 cursor-pointer shadow-md"
            >
              MASUK
            </button>
          </form>

          {/* Quick Login Section */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-berlin-navy" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-berlin-navy">Shortcut Masuk Cepat Staf</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal">
              Akun user sudah dibuatkan secara otomatis. Klik tombol di bawah untuk langsung mencoba peran masing-masing:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u)}
                  className="bg-white hover:bg-gray-50 border border-gray-200 hover:border-berlin-gold/50 p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer shadow-xs"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-[10px] text-berlin-navy">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      u.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[10px] truncate leading-tight text-gray-800">{u.name}</div>
                    <div className="text-[9px] uppercase font-bold text-berlin-navy tracking-wider leading-none mt-0.5">{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
