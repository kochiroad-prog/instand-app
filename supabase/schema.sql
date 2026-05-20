-- ============================================
-- INSTAND APP - Supabase Schema + Seed Data
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('booth_base', 'addon', 'material', 'ongkir')),
  unit_price NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  size_cm INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  total_hpp NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. QUOTATION ITEMS TABLE
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  qty NUMERIC NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- 4. DISABLE RLS (app personal, tidak butuh auth per user)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;

-- 5. SEED: BOOTH BASE UNITS
INSERT INTO products (name, category, unit_price, unit, size_cm) VALUES
  ('Portable Booth 100x50cm - PINK', 'booth_base', 2612000, 'set', 100),
  ('Portable Booth 120x50cm - PINK', 'booth_base', 3400000, 'set', 120),
  ('Portable Booth 150x50cm - PINK', 'booth_base', 4188000, 'set', 150),
  ('Caffe Street Portable Booth 150x40cm', 'booth_base', 4938000, 'set', 150);

-- 6. SEED: ADD-ONS
INSERT INTO products (name, category, unit_price, unit) VALUES
  ('Tiang Single + Logo Bulat', 'addon', 250000, 'pcs'),
  ('Tiang Double', 'addon', 770000, 'pcs'),
  ('Tiang + Atap', 'addon', 1500000, 'set'),
  ('Sticker 120x80cm', 'addon', 175000, 'lbr'),
  ('Wingside', 'addon', 250000, 'pcs'),
  ('Lampu LED', 'addon', 250000, 'pcs'),
  ('Lampu Sorot', 'addon', 87000, 'pcs'),
  ('HPL Dalam', 'addon', 540000, 'set'),
  ('Lapisan HPL Putih Bagian Dalam', 'addon', 500000, 'set'),
  ('Payung Portable Diameter 200cm', 'addon', 900000, 'pcs'),
  ('Tambahan Meja Hidrolik', 'addon', 525000, 'pcs'),
  ('Ambalan Rak Dalam', 'addon', 175000, 'pcs'),
  ('Akrilik Display', 'addon', 250000, 'pcs'),
  ('Branding Plywood Lingkaran', 'addon', 450000, 'pcs'),
  ('Branding Akrilik Clear + Sticker Cutting', 'addon', 480000, 'set'),
  ('Custom Warna Luar Full Kayu', 'addon', 725000, 'set'),
  ('Wood Panel WPC', 'addon', 725000, 'set'),
  ('Neonbox Bulat Acrylic 60cm', 'addon', 1125000, 'pcs'),
  ('Neonflex 15x75cm', 'addon', 890000, 'pcs'),
  ('Kelistrikan (steker + terminal + kabel)', 'addon', 210000, 'set'),
  ('Lis Timbul Meja', 'addon', 375000, 'pcs'),
  ('Display Donat', 'addon', 1100000, 'pcs'),
  ('Sticker Logo Depan (File Siap Cetak)', 'addon', 275000, 'pcs'),
  ('Cutting Logo', 'addon', 350000, 'pcs'),
  ('Papan Penyangga Tambahan', 'addon', 175000, 'pcs'),
  ('Packing Bubblewrap + Kayu', 'addon', 230000, 'set');

-- 7. SEED: ONGKIR REFERENSI
INSERT INTO products (name, category, unit_price, unit) VALUES
  ('Ongkir Jakarta Barat', 'ongkir', 480000, 'pengiriman'),
  ('Ongkir Jakarta Pusat', 'ongkir', 450000, 'pengiriman'),
  ('Ongkir Jakarta Selatan', 'ongkir', 460000, 'pengiriman'),
  ('Ongkir Jakarta Timur', 'ongkir', 470000, 'pengiriman'),
  ('Ongkir Bogor / Depok', 'ongkir', 550000, 'pengiriman'),
  ('Ongkir Tangerang', 'ongkir', 500000, 'pengiriman'),
  ('Ongkir Bekasi', 'ongkir', 500000, 'pengiriman');

-- 8. SEED: BAHAN BAKU
INSERT INTO products (name, category, unit_price, unit) VALUES
  ('Akrilik Bening 2mm (122x244cm)', 'material', 500000, 'lmbr'),
  ('HPL Solid Warna Kode AA', 'material', 144000, 'lmbr'),
  ('HPL TH 001 AA - Porcelain White', 'material', 122000, 'lmbr'),
  ('HPL Warna Kode G', 'material', 187000, 'lmbr'),
  ('Plywood 12mm', 'material', 155000, 'lmbr'),
  ('Plywood 15mm', 'material', 195000, 'lmbr'),
  ('Trimin 12mm', 'material', 245000, 'lmbr'),
  ('Trimin 15mm', 'material', 265000, 'lmbr'),
  ('Stiker Cutting', 'material', 45, 'cm');

-- Selesai! Cek data:
SELECT category, COUNT(*) as jumlah FROM products GROUP BY category ORDER BY category;
