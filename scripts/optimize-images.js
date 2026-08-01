import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const SOURCE = 'berlin';
const THUMB = 'processed/thumb';
const FULL = 'processed/full';

const THUMB_SIZE = 300;
const FULL_SIZE = 1000;

let total = 0;
let processed = 0;

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(jpe?g|png|webp)$/i.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const images = walk(SOURCE);
total = images.length;

for (const file of images) {
  const base = file.replace(/^berlin\//, '').replace(/\/+/g, '-').replace(/\.[^.]+$/, '');
  const thumbPath = join(THUMB, `${base}.webp`);
  const fullPath = join(FULL, `${base}.webp`);

  const img = sharp(file);
  const ext = extname(file).toLowerCase();

  const pipeline = [
    img.clone().resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toFile(thumbPath),
    img.clone().resize(FULL_SIZE, FULL_SIZE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(fullPath),
  ];

  await Promise.all(pipeline);
  processed++;
  if (processed % 50 === 0) console.log(`  ${processed}/${total} done`);
}

console.log(`Done — ${processed} images processed`);
