import { Order, CashTransaction, CashClosing, WarehouseStockItem, Expense } from '../types';

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_TRANSACTIONS: CashTransaction[] = [];

export const INITIAL_CLOSINGS: CashClosing[] = [];

// Helper categories
export const CAR_BRAND_LOGOS = {
  'Mercedes-Benz': 'https://img.icons8.com/ios-filled/100/ffffff/mercedes.png',
  'BMW': 'https://img.icons8.com/ios-filled/100/ffffff/bmw.png',
  'Audi': 'https://img.icons8.com/ios-filled/100/ffffff/audi.png',
  'VW': 'https://img.icons8.com/ios-filled/100/ffffff/volkswagen.png',
  'MINI': 'https://img.icons8.com/ios-filled/100/ffffff/mini.png',
  'Land Rover': 'https://img.icons8.com/ios-filled/100/ffffff/land-rover.png',
  'Lainnya': '🔧'
};

// Quick findings mock options for technicians to select easily!
export const MOCK_FINDINGS_SUGGESTIONS = [
  {
    id: 'sug-1',
    description: 'Kampas rem depan tipis (sisa 2mm), perlu penggantian segera demi keselamatan.',
    estimatedCost: 850000,
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'sug-2',
    description: 'Selang radiator atas mengalami getas dan retak halus, berpotensi bocor di jalan.',
    estimatedCost: 450000,
    imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'sug-3',
    description: 'Sensor ABS roda kanan belakang tidak merespon/mati, perlu ganti sensor baru.',
    estimatedCost: 1200000,
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'sug-4',
    description: 'Busi iridium bermasalah, menyebabkan pembakaran pincang pada silinder 3.',
    estimatedCost: 950000,
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80'
  }
];

export const MOCK_WAREHOUSE_STOCK: WarehouseStockItem[] = [
  { id: 'stock-1', name: 'Kampas Rem Depan Brembo (BMW E90/F30)', code: 'SP-BM-01', price: 850000, stock: 12, rackLocation: 'Rak Roda (A-1)' },
  { id: 'stock-2', name: 'Oli Mesin Shell Helix Ultra 5W-40 (1L)', code: 'SP-OL-02', price: 200000, stock: 48, rackLocation: 'Rak Cairan (B-3)' },
  { id: 'stock-3', name: 'Oli Mesin Mobil1 Gold 0W-40 (1L)', code: 'SP-OL-03', price: 275000, stock: 30, rackLocation: 'Rak Cairan (B-4)' },
  { id: 'stock-4', name: 'Filter Oli BMW TwinPower Turbo', code: 'SP-BM-04', price: 250000, stock: 15, rackLocation: 'Rak Mesin (C-2)' },
  { id: 'stock-5', name: 'Filter Oli Mercedes Benz (M271/M274)', code: 'SP-MB-05', price: 280000, stock: 10, rackLocation: 'Rak Mesin (C-3)' },
  { id: 'stock-6', name: 'Busi Iridium Bosch Double (BMW/Merc)', code: 'SP-EL-06', price: 185000, stock: 24, rackLocation: 'Rak Elektrik (D-1)' },
  { id: 'stock-7', name: 'Sensor ABS Depan ATE (BMW F30)', code: 'SP-EL-07', price: 1100000, stock: 4, rackLocation: 'Rak Elektrik (D-5)' },
  { id: 'stock-8', name: 'Radiator Upper Hose OEM BMW E90', code: 'SP-CO-08', price: 450000, stock: 6, rackLocation: 'Rak Pendingin (E-2)' },
  { id: 'stock-9', name: 'Air Filter K&N Replacement (Merc C-Class)', code: 'SP-AC-09', price: 1250000, stock: 3, rackLocation: 'Rak Mesin (C-5)' },
  { id: 'stock-10', name: 'Cakram Rem Depan Brembo (MINI Cooper)', code: 'SP-MN-10', price: 1350000, stock: 6, rackLocation: 'Rak Roda (A-4)' },
  { id: 'stock-11', name: 'Shockbreaker Sachs Depan L/R (BMW E90)', code: 'SP-KK-11', price: 3400000, stock: 2, rackLocation: 'Rak Kaki-Kaki (F-1)' },
  { id: 'stock-12', name: 'Link Stabilizer Meyle HD (Mercedes W205)', code: 'SP-KK-12', price: 650000, stock: 8, rackLocation: 'Rak Kaki-Kaki (F-3)' },
];

export const INITIAL_EXPENSES: Expense[] = [];
