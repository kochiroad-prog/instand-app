import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Products ──────────────────────────────────────────────
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');
  if (error) throw error;
  return data;
}

export async function getProductsByCategory(category) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('unit_price');
  if (error) throw error;
  return data;
}

export async function updateProductPrice(id, unit_price) {
  // 1. Ambil harga lama dulu untuk dicatat di riwayat
  const { data: existing } = await supabase
    .from('products').select('unit_price').eq('id', id).single();

  // 2. Update harga baru
  const { data, error } = await supabase
    .from('products')
    .update({ unit_price })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // 3. Catat ke riwayat (jika harga berbeda)
  if (existing && existing.unit_price !== unit_price) {
    await supabase.from('price_history').insert({
      product_id: id,
      old_price:  existing.unit_price,
      new_price:  unit_price,
    }).then(() => {}).catch(() => {}); // silent fail jika tabel belum dibuat
  }

  return data;
}

// ── Price History ─────────────────────────────────────────
export async function getPriceHistory(product_id) {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('product_id', product_id)
    .order('changed_at', { ascending: false })
    .limit(10);
  if (error) return [];   // tabel mungkin belum dibuat — return kosong
  return data;
}

export async function addProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, { name, unit_price, keterangan, unit }) {
  // Cek harga lama untuk price history
  const { data: existing } = await supabase
    .from('products').select('unit_price').eq('id', id).single();

  const { data, error } = await supabase
    .from('products')
    .update({ name, unit_price, keterangan, unit })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // Catat ke price history jika harga berubah
  if (existing && existing.unit_price !== unit_price) {
    await supabase.from('price_history').insert({
      product_id: id,
      old_price:  existing.unit_price,
      new_price:  unit_price,
    }).then(() => {}).catch(() => {});
  }

  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Quotations ────────────────────────────────────────────
export async function getQuotations() {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getQuotationById(id) {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createQuotation({ client_name, project_name, total_hpp, selling_price, notes, items }) {
  // Insert quotation
  const { data: quotation, error: qError } = await supabase
    .from('quotations')
    .insert({ client_name, project_name, total_hpp, selling_price, notes })
    .select()
    .single();
  if (qError) throw qError;

  // Insert items
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item, idx) => ({
      quotation_id: quotation.id,
      item_name: item.item_name,
      unit_price: item.unit_price,
      qty: item.qty,
      subtotal: item.unit_price * item.qty,
      sort_order: idx,
    }));
    const { error: iError } = await supabase.from('quotation_items').insert(itemsToInsert);
    if (iError) throw iError;
  }

  return quotation;
}

export async function updateQuotation(id, { client_name, project_name, notes, selling_price, items }) {
  // Update header
  const { data, error } = await supabase
    .from('quotations')
    .update({ client_name, project_name, notes, selling_price, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // Replace semua items
  if (items) {
    await supabase.from('quotation_items').delete().eq('quotation_id', id);
    if (items.length > 0) {
      const rows = items.map((item, idx) => ({
        quotation_id: id,
        item_name:   item.item_name,
        unit_price:  item.unit_price,
        qty:         item.qty,
        subtotal:    item.unit_price * item.qty,
        sort_order:  idx,
      }));
      const { error: ie } = await supabase.from('quotation_items').insert(rows);
      if (ie) throw ie;
    }
  }

  return data;
}

export async function updateQuotationSellingPrice(id, selling_price) {
  const { data, error } = await supabase
    .from('quotations')
    .update({ selling_price, status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuotationDiscount(id, discount_amount) {
  const { data, error } = await supabase
    .from('quotations')
    .update({ discount_amount, status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuotationStatus(id, status) {
  const { data, error } = await supabase
    .from('quotations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuotation(id) {
  const { error } = await supabase.from('quotations').delete().eq('id', id);
  if (error) throw error;
}

// ── Quotation Images ──────────────────────────────────────
export async function saveQuotationImages(quotation_id, images) {
  // images = [{ name, data (base64) }]
  if (!images || images.length === 0) return;
  const rows = images.map((img, i) => ({
    quotation_id,
    image_data: img.data,
    file_name:  img.name || '',
    sort_order: i,
  }));
  const { error } = await supabase.from('quotation_images').insert(rows);
  if (error) throw error;
}

export async function getQuotationImages(quotation_id) {
  const { data, error } = await supabase
    .from('quotation_images')
    .select('*')
    .eq('quotation_id', quotation_id)
    .order('sort_order');
  if (error) return [];
  return data;
}

export async function deleteQuotationImages(quotation_id) {
  await supabase.from('quotation_images').delete().eq('quotation_id', quotation_id);
}

// ── AI Knowledge Base ─────────────────────────────────────
export async function getAIKnowledge() {
  const { data, error } = await supabase
    .from('ai_knowledge_base')
    .select('*')
    .eq('is_active', true)
    .order('category');
  if (error) return [];
  return data;
}

export async function updateAIKnowledge(id, { title, content, category }) {
  const { data, error } = await supabase
    .from('ai_knowledge_base')
    .update({ title, content, category, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single();
  if (error) throw error;
  return data;
}

export async function addAIKnowledge({ title, content, category }) {
  const { data, error } = await supabase
    .from('ai_knowledge_base')
    .insert({ title, content, category })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteAIKnowledge(id) {
  const { error } = await supabase
    .from('ai_knowledge_base')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Dashboard analytics ───────────────────────────────────
export async function getDashboardStats() {
  const { data, error } = await supabase
    .from('quotations')
    .select('selling_price, discount_amount, total_hpp, status, created_at');
  if (error) throw error;

  // finalPrice = harga jual setelah diskon (yang benar-benar diterima)
  const finalPrice = (q) => (q.selling_price || 0) - (q.discount_amount || 0);

  const total = data.length;
  const totalRevenue = data.reduce((s, q) => s + finalPrice(q), 0);
  const totalHPP = data.reduce((s, q) => s + (q.total_hpp || 0), 0);
  const totalLaba = totalRevenue - totalHPP;
  const accepted = data.filter(q => q.status === 'accepted').length;

  // Monthly breakdown (last 6 months)
  const monthly = {};
  data.forEach(q => {
    const month = q.created_at?.slice(0, 7);
    if (!monthly[month]) monthly[month] = { month, rincian: 0, revenue: 0, laba: 0 };
    monthly[month].rincian++;
    monthly[month].revenue += finalPrice(q);
    monthly[month].laba += finalPrice(q) - (q.total_hpp || 0);
  });

  return {
    total,
    totalRevenue,
    totalHPP,
    totalLaba,
    accepted,
    monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
  };
}
