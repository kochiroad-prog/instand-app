-- ============================================
-- Tambah kolom keterangan ke tabel products
-- Jalankan di SQL Editor Supabase
-- ============================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '';

UPDATE products SET keterangan = '' WHERE keterangan IS NULL;
