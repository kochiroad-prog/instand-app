-- ============================================
-- Jalankan di SQL Editor Supabase (tambahan)
-- Tabel riwayat perubahan harga produk
-- ============================================

CREATE TABLE IF NOT EXISTS price_history (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  old_price  NUMERIC NOT NULL,
  new_price  NUMERIC NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;

-- Index untuk query cepat per produk
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, changed_at DESC);
