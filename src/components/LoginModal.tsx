import React, { useState } from 'react';
import { X, Lock, Mail, ShieldAlert, Loader2 } from 'lucide-react';
import { User } from '../types';
import { signInStaff, resetStaffPassword } from '../lib/auth';
import { fetchProfiles } from '../lib/db';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  variant?: 'modal' | 'page';
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email atau password salah.';
  if (message.includes('Email not confirmed')) return 'Akun belum dikonfirmasi. Hubungi admin.';
  return 'Gagal masuk. Coba lagi beberapa saat.';
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess, variant = 'modal' }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email || !password) {
      setError('Silakan masukkan email dan password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { user: authUser } = await signInStaff(email.trim(), password);
      if (!authUser) throw new Error('Sesi tidak ditemukan.');

      const profiles = await fetchProfiles();
      const profile = profiles.find((p) => p.id === authUser.id);
      if (!profile) {
        setError('Akun Anda belum terdaftar sebagai staf. Hubungi admin.');
        return;
      }

      onLoginSuccess(profile);
    } catch (err) {
      setError(translateAuthError(err instanceof Error ? err.message : ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError('Masukkan email Anda dulu, lalu klik "Lupa password?".');
      return;
    }
    try {
      await resetStaffPassword(email.trim());
      setInfo('Cek email Anda untuk link reset password.');
    } catch {
      setError('Gagal mengirim email reset password. Coba lagi.');
    }
  };

  return (
    <div className={variant === 'page'
      ? 'min-h-screen flex items-center justify-center p-4 bg-gray-50'
      : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'
    }>
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Banner decorator */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-berlin-navy" />

        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between mt-1">
          <div className="flex items-center">
              <img
                src="/logo-on-white.png"
                alt="Berlin 188 Garage"
                className="h-10 object-contain"
              />
          </div>
          {variant === 'modal' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-black border border-gray-150 hover:border-gray-250 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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

          {info && !error && (
            <div className="bg-info-50 border border-info-100 p-3 rounded-lg flex items-start gap-2.5 text-xs text-info-600">
              <Mail className="w-4 h-4 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Email Staf</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="nama@berlin188.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-berlin-navy transition-colors"
                />
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Password</label>
                <button type="button" onClick={handleForgotPassword} className="text-[11px] text-gray-500 hover:text-berlin-navy hover:underline cursor-pointer">Lupa password?</button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
              disabled={isSubmitting}
              className="w-full bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all border border-berlin-gold/30 mt-2 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'MEMPROSES...' : 'MASUK'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
