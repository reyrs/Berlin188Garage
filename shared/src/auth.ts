import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

function client() {
  if (!supabase) throw new Error('Supabase belum terkonfigurasi.');
  return supabase;
}

export async function signInStaff(email: string, password: string) {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutStaff(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await client().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = client().auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function resetStaffPassword(email: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(email);
  if (error) throw error;
}
