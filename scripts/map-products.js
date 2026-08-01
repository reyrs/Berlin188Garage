import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// Load image map from upload script output
const mapPath = 'processed/image-map.json';
let imageMap = {};
try {
  imageMap = JSON.parse(readFileSync(mapPath, 'utf8'));
} catch {
  console.error('Run upload-to-supabase.js first to generate image-map.json');
  process.exit(1);
}

const THUMB = 'processed/thumb';
const files = readdirSync(THUMB).filter(f => f.endsWith('.webp'));
const categories = {
  // ── Oli & Cairan ──
  'OLI': 'Oli & Cairan',
  'COOLANT': 'Oli & Cairan',
  'CAIRAN': 'Oli & Cairan',

  // ── Rem ──
  'CALIPER': 'Rem',
  'KAMPAS': 'Rem',
  'CAKRAM': 'Rem',
  'BRAKE': 'Rem',
  'DISC': 'Rem',
  'REM ': 'Rem',
  ' REM': 'Rem',

  // ── Kaki-Kaki ──
  'SHOCK': 'Kaki-Kaki',
  'SHOCKBREAKER': 'Kaki-Kaki',
  'LINK ': 'Kaki-Kaki',
  'BUSHING': 'Kaki-Kaki',
  'STABILIZER': 'Kaki-Kaki',
  'KAKI': 'Kaki-Kaki',

  // ── Lampu & Penerangan ──
  'HEADLAMP': 'Lampu & Penerangan',
  'LAMPU': 'Lampu & Penerangan',
  'LED ': 'Lampu & Penerangan',
  'FOG ': 'Lampu & Penerangan',
  'LENS ': 'Lampu & Penerangan',
  'LIGHT ': 'Lampu & Penerangan',
  'HEAD LAMP': 'Lampu & Penerangan',

  // ── Interior ──
  'JOK ': 'Interior',
  'KURSI': 'Interior',
  'HEADREST': 'Interior',
  'CONSOLE': 'Interior',
  'DASHBOARD': 'Interior',
  'AIRBAG': 'Interior',
  'CUP HOLDER': 'Interior',
  'DOOR TRIM': 'Interior',
  'DOOR SILL': 'Interior',
  'PILLAR': 'Interior',
  'HEADLINER': 'Interior',
  'SEATBELT': 'Interior',
  'SEAT BELT': 'Interior',
  'SAFETY BELT': 'Interior',
  'BANTALAN': 'Interior',
  'HEAD UNIT': 'Interior',
  'CARPET': 'Interior',
  'SUN VISOR': 'Interior',
  'SUNVISOR': 'Interior',
  'VANITY': 'Interior',
  'DOOR PANEL': 'Interior',
  'GLOVE BOX': 'Interior',
  'GLOVEBOX': 'Interior',
  'HAND GRIP': 'Interior',
  'HANDLE GRIP': 'Interior',
  'HANDLE HAND': 'Interior',
  'CLADDING': 'Interior',
  'KOLOM MOBIL': 'Interior',
  'KNEE PANEL': 'Interior',
  'PLAFON': 'Interior',

  // ── Body & Eksterior ──
  'BODY VENTILATION': 'Body & Eksterior',
  'FENDER': 'Body & Eksterior',
  'BUMPER': 'Body & Eksterior',
  'GRILLE': 'Body & Eksterior',
  'AFRON': 'Body & Eksterior',
  'BULLHEAD': 'Body & Eksterior',
  'CROSSMEMBER': 'Body & Eksterior',
  'TOWING': 'Body & Eksterior',
  'STRUT BRACE': 'Body & Eksterior',
  'ANGKUR': 'Body & Eksterior',
  'SPOILER': 'Body & Eksterior',
  'DEFLECTOR': 'Body & Eksterior',

  // ── Body parts: brackets, covers, mounts, doors ──
  'BRACKET': 'Body & Eksterior',
  'DUDUKAN': 'Body & Eksterior',
  'ENGSEL': 'Body & Eksterior',
  'PENYANGGA': 'Body & Eksterior',
  'LOCK STRIKER': 'Body & Eksterior',
  'LOCK ACTUATOR': 'Body & Eksterior',
  'DOOR LOCK': 'Body & Eksterior',
  'STRIKER PLATE': 'Body & Eksterior',
  'DOOR HANDLE': 'Body & Eksterior',
  'COVER ': 'Body & Eksterior',
  'PANEL ': 'Body & Eksterior',
  'PLAT ': 'Body & Eksterior',
  'SEAL ': 'Body & Eksterior',
  'CABLE DUCT': 'Body & Eksterior',
  'CABLE GUIDE': 'Body & Eksterior',
  'CABLE COUNDIT': 'Body & Eksterior',
  'TUTUP ': 'Body & Eksterior',
  'PELINDUNG': 'Body & Eksterior',
  'PENUTUP': 'Body & Eksterior',
  'PENGUNCI': 'Body & Eksterior',
  'BOX ': 'Body & Eksterior',
  'TABUNG RESERVOIR': 'Body & Eksterior',
  'TABUNG CADANGAN': 'Body & Eksterior',
  'TANKI': 'Body & Eksterior',
  'BAN SEREP': 'Body & Eksterior',

  // ── Mesin ──
  'ENGINE ': 'Mesin',
  'MESIN ': 'Mesin',
  'TIMING ': 'Mesin',
  'BELT ': 'Mesin',
  'GASKET ': 'Mesin',
  'INTAKE ': 'Mesin',
  'MANIFOLD': 'Mesin',
  'MANIPOLD': 'Mesin',
  'WATER PUMP': 'Mesin',
  'FUEL PUMP': 'Mesin',
  'FUEL TANK': 'Mesin',
  'GARDAN': 'Mesin',
  'TRANSMISI': 'Mesin',
  'PROPELLER': 'Mesin',
  'DRIVESHAFT': 'Mesin',
  'AS RODA': 'Mesin',
  'MOUNTING': 'Mesin',
  'INTERCOOLER': 'Mesin',
  'RADIATOR': 'Mesin',
  'TURBO': 'Mesin',
  'EGR ': 'Mesin',
  'OIL COOLER': 'Mesin',
  'OIL PAN': 'Mesin',
  'CRANKSHAFT': 'Mesin',
  'CAMSHAFT': 'Mesin',
  'PISTON': 'Mesin',
  'VALVE ': 'Mesin',
  'HEADTER VALVE': 'Mesin',
  'HEATER VALVE': 'Mesin',
  'HEATHER CONTROL': 'Mesin',
  'CONDENSOR': 'Mesin',
  'DONGKRAK': 'Body & Eksterior',

  // ── Kelistrikan ──
  'KELISTRIKAN': 'Kelistrikan',
  'SENSOR ': 'Kelistrikan',
  'AKI ': 'Kelistrikan',
  'ACCU ': 'Kelistrikan',
  'ALTERNATOR': 'Kelistrikan',
  'STARTER': 'Kelistrikan',
  'SWITCH ': 'Kelistrikan',
  'MODULE ': 'Kelistrikan',
  'KOMPUTER': 'Kelistrikan',
  'KEYLESS': 'Kelistrikan',
  'ANTENNA': 'Kelistrikan',
  'AERIAL': 'Kelistrikan',
  'AMPLIFIER': 'Kelistrikan',
  'FRONTSAM': 'Kelistrikan',
  ' SAM ': 'Kelistrikan',
  'SAM.': 'Kelistrikan',
  'SAM ': 'Kelistrikan',
  'ECU ': 'Kelistrikan',
  'FUSE ': 'Kelistrikan',
  'SIKRING': 'Kelistrikan',
  'KABEL ': 'Kelistrikan',
  'WIPER': 'Kelistrikan',
  'WIPPER': 'Kelistrikan',
  'RELAY ': 'Kelistrikan',
  'COIL ': 'Kelistrikan',
  'KOIL ': 'Kelistrikan',
  'BUSI ': 'Mesin',
  'PLUG ': 'Mesin',
  'GLOW ': 'Mesin',
  'INJECTOR': 'Mesin',
  'THROTTLE': 'Mesin',
  'CARBURETOR': 'Mesin',

  // ── Filter & AC ──
  'FILTER ': 'Filter & AC',
  'AC ': 'Filter & AC',
  'AC.': 'Filter & AC',
  'AIR DUCT': 'Filter & AC',
  'AIRDUCT': 'Filter & AC',
  'EVAPORATOR': 'Filter & AC',
  'KOMPRESOR': 'Filter & AC',
  'COMPRESSOR': 'Filter & AC',
  'BLOWER': 'Filter & AC',
  'PIPA ': 'Filter & AC',
  'HOSE ': 'Filter & AC',
  'REFRIGERANT': 'Filter & AC',
  'CONDENSER': 'Filter & AC',
  'CONDENSOR': 'Filter & AC',
  'HEATER ': 'Filter & AC',
};

function guessCategory(name) {
  const upper = name.toUpperCase();
  for (const [key, cat] of Object.entries(categories)) {
    if (upper.includes(key)) return cat;
  }
  return 'Mesin';
}

function guessPrice(name) {
  const upper = name.toUpperCase();
  if (upper.includes('SHOCK') || upper.includes('TIMING') || upper.includes('ALTERNATOR') || upper.includes('STARTER') || upper.includes('ENGINE')) return 2500000;
  if (upper.includes('COIL') || upper.includes('ARM') || upper.includes('CALIPER') || upper.includes('KOMPRESOR') || upper.includes('COMPRESSOR')) return 1800000;
  if (upper.includes('DISC') || upper.includes('CAKRAM') || upper.includes('MODULE') || upper.includes('KEYLESS')) return 1200000;
  if (upper.includes('KAMPAS') || upper.includes('SENSOR') || upper.includes('AKI') || upper.includes('ACCU') || upper.includes('BELT')) return 850000;
  if (upper.includes('BUSI') || upper.includes('PLUG') || upper.includes('GASKET') || upper.includes('LINK') || upper.includes('BUSHING')) return 450000;
  if (upper.includes('FILTER') || upper.includes('HOSE') || upper.includes('PIPA') || upper.includes('LAMPU') || upper.includes('LED')) return 280000;
  return 500000;
}

function guessBrand(name) {
  const upper = name.toUpperCase();
  if (upper.includes('AUDI')) return 'Audi';
  if (upper.includes('MERCY') || upper.includes('MERC.')) return 'Mercedes';
  if (upper.includes('BREMBO')) return 'Brembo';
  if (upper.includes('BOSCH')) return 'Bosch';
  if (upper.includes('MANN')) return 'Mann';
  if (upper.includes('SACHS')) return 'Sachs';
  if (upper.includes('NGK')) return 'NGK';
  return 'OEM';
}

function cleanName(filename) {
  return filename
    .replace(/\.\.+\.webp$/, '.webp')
    .replace(/\.webp$/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/AUDI A6[ .]*(NEW)?/gi, '')
    .replace(/MERCY[ .]?W221[ .]*(NEW)?/gi, '')
    .replace(/MERC[.]?[ .]?W221[ .]*(NEW)?/gi, '')
    .replace(/MERCEDES[ .]?W221[ .]*(NEW)?/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function guessCompatibility(name) {
  if (name.toUpperCase().includes('AUDI A6')) return 'Audi A6';
  if (name.toUpperCase().includes('MERCY') && name.toUpperCase().includes('W221')) return 'Mercedes W221';
  return 'Audi A6 / Mercedes W221';
}

const products = files.map((file, i) => {
  const base = file.replace('.webp', '');
  const name = cleanName(file);
  const img = imageMap[base] || { thumb: '', full: '' };
  const category = guessCategory(file);
  const price = guessPrice(file);
  const brand = guessBrand(file);
  const compat = guessCompatibility(file);
  const id = `P${String(i + 1).padStart(3, '0')}`;

  return {
    id,
    code: id,
    name: name || file.replace('.webp', ''),
    price,
    category,
    image: img.thumb,
    fullImage: img.full,
    stock: Math.floor(Math.random() * 15) + 2,
    brand,
    compatibility: compat,
  };
});

// Filter out any products with empty names
const valid = products.filter(p => p.name.length > 2);

// Generate TypeScript file
const ts = `export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  category: ProductCategory;
  image: string;
  fullImage?: string;
  stock: number;
  brand: string;
  compatibility: string;
}

export type ProductCategory =
  | 'Semua'
  | 'Body & Eksterior'
  | 'Interior'
  | 'Mesin'
  | 'Kaki-Kaki'
  | 'Rem'
  | 'Kelistrikan'
  | 'Lampu & Penerangan'
  | 'Filter & AC'
  | 'Oli & Cairan';

export const CATEGORIES: ProductCategory[] = [
  'Body & Eksterior', 'Interior', 'Mesin', 'Kaki-Kaki', 'Rem', 'Kelistrikan', 'Lampu & Penerangan', 'Filter & AC', 'Oli & Cairan',
];

export const PRODUCTS: Product[] = ${JSON.stringify(valid, null, 2)};
`;

writeFileSync('src/data/products.ts', ts);
console.log(`Done — ${valid.length} products generated`);
