-- Berlin188 Garage - Supabase Schema
-- Execute this in Supabase SQL Editor

-- 1. PROFILES (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','kasir','advisor','gudang','mekanik','marketing','customer')),
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. ORDERS (with JSONB columns for embedded arrays)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  car_brand TEXT NOT NULL,
  car_model TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  car_vin TEXT,
  car_type TEXT,
  car_year TEXT,
  car_engine_code TEXT,
  complaint TEXT NOT NULL,
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'antre' CHECK (status IN ('antre','dikerjakan','temuan_dilaporkan','menunggu_pembayaran','selesai')),
  created_at TIMESTAMPTZ DEFAULT now(),
  advisor_id UUID REFERENCES profiles(id),
  advisor_name TEXT,
  spk_number TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  service_items JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  payment_status TEXT DEFAULT 'belum_dibayar' CHECK (payment_status IN ('belum_dibayar','dp','lunas')),
  payment_method TEXT,
  payment_destination TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  spk_sent BOOLEAN DEFAULT false,
  assigned_mechanic_id UUID REFERENCES profiles(id),
  assigned_mechanic_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 3. TRANSACTIONS
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('masuk','keluar')),
  method TEXT NOT NULL CHECK (method IN ('tunai','transfer','qris','edc')),
  category TEXT NOT NULL CHECK (category IN ('pendapatan_jasa','pendapatan_part','operasional','pembelian_part','gaji','lainnya')),
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. EXPENSES
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('operasional','pembelian_part','gaji','utilitas','lainnya')),
  method TEXT NOT NULL CHECK (method IN ('tunai','transfer','qris','edc')),
  created_by TEXT NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 5. CLOSINGS
CREATE TABLE closings (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  system_cash NUMERIC NOT NULL,
  physical_cash NUMERIC NOT NULL,
  discrepancy NUMERIC NOT NULL,
  closed_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE closings ENABLE ROW LEVEL SECURITY;

-- 6. WAREHOUSE STOCK
CREATE TABLE warehouse_stock (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  rack_location TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

-- 7. STOCK MUTATIONS (audit trail)
CREATE TABLE stock_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id TEXT REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  qty_change INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('out','in','adjustment')),
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;

-- INDEXES
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_phone ON orders(customer_phone);
CREATE INDEX idx_orders_plate ON orders(plate_number);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_date ON transactions(timestamp);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_closings_date ON closings(timestamp);
CREATE INDEX idx_stock_mutations_item ON stock_mutations(stock_item_id);

-- RLS POLICIES (basic - allow authenticated users full access)
-- In production, refine per role
CREATE POLICY "Allow authenticated full access on profiles"
  ON profiles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on orders"
  ON orders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on transactions"
  ON transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on expenses"
  ON expenses FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on closings"
  ON closings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on warehouse_stock"
  ON warehouse_stock FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on stock_mutations"
  ON stock_mutations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- TRIGGER: update updated_at on orders
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER warehouse_stock_updated_at
  BEFORE UPDATE ON warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
