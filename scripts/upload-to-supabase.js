import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET = 'product-images';
const THUMB = 'processed/thumb';
const FULL = 'processed/full';

const files = readdirSync(THUMB);
const map = {};

for (let i = 0; i < files.length; i++) {
  const name = files[i];
  const base = name.replace('.webp', '');

  // Upload thumb
  const thumbData = readFileSync(join(THUMB, name));
  await supabase.storage.from(BUCKET).upload(`thumb/${name}`, thumbData, { contentType: 'image/webp', upsert: true });

  // Upload full
  const fullName = name;
  const fullData = readFileSync(join(FULL, fullName));
  await supabase.storage.from(BUCKET).upload(`full/${fullName}`, fullData, { contentType: 'image/webp', upsert: true });

  // Get public URL
  const { data: thumbUrl } = supabase.storage.from(BUCKET).getPublicUrl(`thumb/${name}`);
  const { data: fullUrl } = supabase.storage.from(BUCKET).getPublicUrl(`full/${fullName}`);

  map[base] = { thumb: thumbUrl.publicUrl, full: fullUrl.publicUrl };

  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${files.length} uploaded`);
}

// Save mapping
import { writeFileSync } from 'node:fs';
writeFileSync('processed/image-map.json', JSON.stringify(map, null, 2));
console.log(`Done — ${Object.keys(map).length} images uploaded. Map saved to processed/image-map.json`);
