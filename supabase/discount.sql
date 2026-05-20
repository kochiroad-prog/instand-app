-- ============================================
-- Tambah kolom diskon ke tabel quotations
-- Jalankan di SQL Editor Supabase
-- ============================================

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Update data lama agar tidak NULL
UPDATE quotations SET discount_amount = 0 WHERE discount_amount IS NULL;
