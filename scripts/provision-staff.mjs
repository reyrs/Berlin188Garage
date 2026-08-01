// One-time admin tool: creates real Supabase Auth accounts + matching
// profiles rows for Berlin188 Garage staff. Uses the service role key, so it
// must only ever run locally/server-side — never ship this key to the client.
//
// Usage: npm run staff:provision
//
// Safe to re-run: existing auth users (matched by email) are skipped, not
// duplicated. Add new staff by adding an entry to STAFF below and re-running.

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STAFF = [
  { name: 'Owner Berlin 188', role: 'owner', email: 'owner@berlin188.com', phone: '081234567890' },
  { name: 'Advisor Aris', role: 'advisor', email: 'advisor@berlin188.com', phone: '081298765432' },
  { name: 'Kasir Siska', role: 'kasir', email: 'kasir@berlin188.com', phone: '081255556666' },
  { name: 'Mekanik Joko', role: 'mekanik', email: 'joko@berlin188.com', phone: '081288889999' },
  { name: 'Mekanik Rudi', role: 'mekanik', email: 'rudi@berlin188.com', phone: '081211112222' },
  { name: 'Gudang Toni', role: 'gudang', email: 'toni@berlin188.com', phone: '081233334444' },
  { name: 'Manager Dedi', role: 'manager', email: 'manager@berlin188.com', phone: '081244445555' },
  { name: 'Marketing Nina', role: 'marketing', email: 'marketing@berlin188.com', phone: '081266667777' },
];

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(16);
  let pw = '';
  for (let i = 0; i < 16; i++) pw += alphabet[bytes[i] % alphabet.length];
  return pw;
}

async function findExistingUserByEmail(email) {
  // Supabase's admin API has no direct "get by email" — page through the list.
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function provisionStaff() {
  const results = [];

  for (const staff of STAFF) {
    const existing = await findExistingUserByEmail(staff.email);

    if (existing) {
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: existing.id,
        name: staff.name,
        role: staff.role,
        email: staff.email,
        phone: staff.phone,
      });
      if (upsertError) throw upsertError;
      results.push({ ...staff, id: existing.id, password: '(sudah ada — tidak diubah)' });
      continue;
    }

    const password = generatePassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email: staff.email,
      password,
      email_confirm: true,
      user_metadata: { name: staff.name, role: staff.role, phone: staff.phone },
    });
    if (error) throw error;

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone,
    });
    if (profileError) throw profileError;

    results.push({ ...staff, id: data.user.id, password });
  }

  console.log('\nAkun staf selesai diprovisi:\n');
  console.table(
    results.map((r) => ({ Nama: r.name, Role: r.role, Email: r.email, Password: r.password }))
  );
  console.log(
    '\nSimpan/kirim password ini ke masing-masing staf secara personal — tidak disimpan di mana pun oleh skrip ini.\n'
  );
}

provisionStaff().catch((err) => {
  console.error('Provisioning gagal:', err);
  process.exit(1);
});
