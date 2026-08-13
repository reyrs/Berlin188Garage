import type { DiagnosticFinding } from '@shared/types';

export const CAR_BRAND_LOGOS: Record<string, string> = {
  'Mercedes-Benz': 'https://img.icons8.com/ios-filled/100/ffffff/mercedes.png',
  'BMW': 'https://img.icons8.com/ios-filled/100/ffffff/bmw.png',
  'Audi': 'https://img.icons8.com/ios-filled/100/ffffff/audi.png',
  'VW': 'https://img.icons8.com/ios-filled/100/ffffff/volkswagen.png',
  'MINI': 'https://img.icons8.com/ios-filled/100/ffffff/mini.png',
  'Land Rover': 'https://img.icons8.com/ios-filled/100/ffffff/land-rover.png',
  'Lainnya': '🔧',
};

export const COMMON_JASA_NAMES = [
  'Ganti Oli Mesin', 'Ganti Filter Oli', 'Ganti Filter Udara', 'Ganti Filter Kabin (AC)',
  'Paket Tune Up', 'Servis Rem (Kampas + Cakram)', 'Ganti Kampas Rem Depan', 'Ganti Kampas Rem Belakang',
  'Spooring & Balancing', 'Ganti Timing Belt', 'Ganti Timing Chain', 'Servis AC (Isi Freon)',
  'Ganti Aki', 'Servis Kelistrikan', 'Ganti Busi', 'Servis / Ganti Oli Transmisi',
  'Ganti Shockbreaker', 'Servis Kaki-Kaki', 'Coding & Computer (ECU)', 'Cuci Throttle Body',
  'Ganti Radiator Coolant', 'Balancing Roda',
];

export const MOCK_FINDINGS_SUGGESTIONS: DiagnosticFinding[] = [
  {
    id: 'sug-1', description: 'Kampas rem depan tipis (sisa 2mm), perlu penggantian segera demi keselamatan.',
    estimatedCost: 850000, status: 'pending', timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sug-2', description: 'Selang radiator atas mengalami getas dan retak halus, berpotensi bocor di jalan.',
    estimatedCost: 450000, status: 'pending', timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sug-3', description: 'Sensor ABS roda kanan belakang tidak merespon/mati, perlu ganti sensor baru.',
    estimatedCost: 1200000, status: 'pending', timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sug-4', description: 'Busi iridium bermasalah, menyebabkan pembakaran pincang pada silinder 3.',
    estimatedCost: 950000, status: 'pending', timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80',
  },
];
