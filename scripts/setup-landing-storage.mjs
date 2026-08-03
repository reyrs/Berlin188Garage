// One-time admin tool: creates the public Storage bucket used for landing
// page marketing assets (hero background image, etc). Uses the service role
// key — run locally only, never ship this key to the client.
//
// Usage: node scripts/setup-landing-storage.mjs
// Safe to re-run — skips creation if the bucket already exists.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const BUCKET = 'landing-assets';

const { data: existing } = await supabase.storage.listBuckets();
if (existing?.some((b) => b.id === BUCKET)) {
  console.log(`Bucket "${BUCKET}" sudah ada, tidak dibuat ulang.`);
} else {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '5MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });
  if (error) {
    console.error('Gagal bikin bucket:', error);
    process.exit(1);
  }
  console.log(`Bucket "${BUCKET}" berhasil dibuat (publik, maks 5MB, png/jpeg/webp).`);
}
