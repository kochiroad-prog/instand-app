'use client';
import { useState, useEffect } from 'react';
import { getProducts, updateProductPrice, addProduct, deleteProduct, getPriceHistory, supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const rp    = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tglFmt = (s) => new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

const CATEGORY_LABELS = {
  booth_base: '🏪 Booth Base',
  addon:      '🔩 Add-on',
  ongkir:     '🚚 Ongkir',
  material:   '🧱 Bahan',
};

export default function SettingsPage() {
  const { user }               = useAuth() || {};
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editId, setEditId]       = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [activeTab, setActiveTab] = useState('booth_base');
  const [showAdd, setShowAdd]     = useState(false);
  const [newItem, setNewItem]     = useState({ name:'', category:'addon', unit_price:'', unit:'pcs' });
  const [saving, setSaving]       = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [history, setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [toast, setToast]         = useState('');

  const handleLogout = async () => {
    if (!confirm('Yakin mau keluar?')) return;
    await supabase.auth.signOut();
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = async () => {
    try { setProducts(await getProducts()); }
    catch(e) { showToast('❌ ' + e.message); }
    finally  { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => p.category === activeTab);

  const startEdit = (p) => {
    setEditId(p.id);
    setEditPrice(String(p.unit_price));
    setHistoryId(null);
  };

  const saveEdit = async (id) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) return showToast('⚠️ Harga tidak valid');
    setSaving(true);
    try {
      await updateProductPrice(id, price);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, unit_price: price } : p));
      setEditId(null);
      showToast('✅ Harga diperbarui & dicatat di riwayat');
    } catch(e) { showToast('❌ ' + e.message); }
    finally    { setSaving(false); }
  };

  const toggleHistory = async (id) => {
    if (historyId === id) { setHistoryId(null); return; }
    setHistoryId(id);
    setHistLoading(true);
    try { setHistory(await getPriceHistory(id)); }
    catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Nonaktifkan "${name}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('🗑️ Item dinonaktifkan');
    } catch(e) { showToast('❌ ' + e.message); }
  };

  const handleAdd = async () => {
    if (!newItem.name.trim()) return showToast('⚠️ Isi nama item');
    const price = parseFloat(newItem.unit_price);
    if (isNaN(price) || price < 0) return showToast('⚠️ Harga tidak valid');
    setSaving(true);
    try {
      const added = await addProduct({ ...newItem, unit_price: price });
      setProducts(prev => [...prev, added]);
      setShowAdd(false);
      setNewItem({ name:'', category:'addon', unit_price:'', unit:'pcs' });
      showToast('✅ Item ditambahkan');
    } catch(e) { showToast('❌ ' + e.message); }
    finally    { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>⚙️ Kelola Harga</h1>
            <p>Update harga &amp; lihat riwayat perubahan</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '✕ Batal' : '+ Tambah'}
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* ── Form tambah item baru ─────────────────── */}
        {showAdd && (
          <div className="card" style={{ marginBottom:14, borderColor:'var(--accent)', borderWidth:2 }}>
            <div className="card-title">➕ Tambah Item Baru</div>
            <div className="form-group">
              <label className="form-label">Nama Item</label>
              <input className="form-input" placeholder="Nama produk/komponen"
                value={newItem.name} onChange={e => setNewItem(p => ({...p, name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-select" value={newItem.category}
                onChange={e => setNewItem(p => ({...p, category:e.target.value}))}>
                {Object.entries(CATEGORY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <div className="form-group" style={{ flex:2, marginBottom:0 }}>
                <label className="form-label">Harga HPP (Rp)</label>
                <input className="form-input" type="number" placeholder="0"
                  value={newItem.unit_price} onChange={e => setNewItem(p => ({...p, unit_price:e.target.value}))} />
              </div>
              <div className="form-group" style={{ flex:1, marginBottom:0 }}>
                <label className="form-label">Satuan</label>
                <input className="form-input" placeholder="pcs"
                  value={newItem.unit} onChange={e => setNewItem(p => ({...p, unit:e.target.value}))} />
              </div>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop:12 }}
              onClick={handleAdd} disabled={saving}>
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Item'}
            </button>
          </div>
        )}

        {/* ── Category tabs ─────────────────────────── */}
        <div className="tab-bar">
          {Object.entries(CATEGORY_LABELS).map(([key, lbl]) => (
            <button key={key}
              className={`tab-btn${activeTab===key?' active':''}`}
              style={{ fontSize:'0.7rem' }}
              onClick={() => { setActiveTab(key); setEditId(null); setHistoryId(null); }}>
              {lbl}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">Tidak ada item di kategori ini</div>
          </div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="card" style={{ marginBottom:8 }}>

              {/* Row utama */}
              <div className="flex-between">
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }} className="truncate">{p.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>per {p.unit}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:10 }}>
                  {editId !== p.id && (
                    <span style={{ fontWeight:700, color:'var(--accent)', fontSize:'0.95rem', whiteSpace:'nowrap' }}>
                      {rp(p.unit_price)}
                    </span>
                  )}
                  {/* Edit */}
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => editId===p.id ? setEditId(null) : startEdit(p)}>
                    {editId===p.id ? '✕' : '✏️'}
                  </button>
                  {/* Riwayat */}
                  <button
                    className="btn btn-sm"
                    style={{ background: historyId===p.id ? 'var(--accent-light)' : 'var(--border-light)', color:'var(--accent)', fontSize:'0.8rem' }}
                    onClick={() => toggleHistory(p.id)}
                    title="Lihat riwayat harga">
                    📋
                  </button>
                  {/* Hapus */}
                  <button className="btn btn-sm"
                    style={{ color:'var(--danger)', background:'var(--danger-light)' }}
                    onClick={() => handleDelete(p.id, p.name)}>
                    🗑️
                  </button>
                </div>
              </div>

              {/* Input edit harga */}
              {editId === p.id && (
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <input
                    className="form-input" type="number" value={editPrice} autoFocus
                    onChange={e => setEditPrice(e.target.value)} style={{ flex:1 }}
                  />
                  <button className="btn btn-primary" onClick={() => saveEdit(p.id)} disabled={saving}>
                    {saving ? '⏳' : '💾 Simpan'}
                  </button>
                </div>
              )}

              {/* Riwayat harga */}
              {historyId === p.id && (
                <div style={{ marginTop:12, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
                    📋 Riwayat Perubahan Harga
                  </div>
                  {histLoading ? (
                    <div className="loading" style={{ padding:'12px 0' }}><div className="spinner" /></div>
                  ) : history.length === 0 ? (
                    <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>
                      Belum ada riwayat perubahan harga.
                    </div>
                  ) : (
                    history.map((h) => {
                      const naik = h.new_price > h.old_price;
                      return (
                        <div key={h.id} style={{
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'7px 10px', borderRadius:6, marginBottom:4,
                          background: naik ? '#fef2f2' : '#f0fdf4',
                          border: `1px solid ${naik ? '#fecaca' : '#bbf7d0'}`,
                          fontSize:'0.82rem',
                        }}>
                          <div>
                            <div style={{ fontWeight:600, color: naik ? '#b91c1c' : '#15803d' }}>
                              {naik ? '📈 Naik' : '📉 Turun'}&nbsp;
                              {rp(h.old_price)} → {rp(h.new_price)}
                            </div>
                            <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:2 }}>
                              {tglFmt(h.changed_at)}
                            </div>
                          </div>
                          <div style={{ fontWeight:700, color: naik ? '#b91c1c' : '#15803d', whiteSpace:'nowrap' }}>
                            {naik ? '+' : ''}{rp(h.new_price - h.old_price)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Info: jalankan SQL riwayat */}
        <div style={{ marginTop:16, padding:'10px 12px', background:'var(--accent-light)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', fontSize:'0.78rem', color:'var(--text-secondary)' }}>
          💡 Fitur riwayat harga membutuhkan tabel <code style={{ background:'rgba(0,0,0,0.06)', padding:'1px 4px', borderRadius:3 }}>price_history</code>.
          Jalankan <strong>supabase/price_history.sql</strong> di SQL Editor Supabase jika belum.
        </div>

        {/* Akun & Logout */}
        <div className="card" style={{ marginTop:20, borderColor:'var(--border)' }}>
          <div className="card-title" style={{ marginBottom:10 }}>👤 Akun</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:2 }}>Login sebagai</div>
              <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text-primary)' }}>
                {user?.email || '—'}
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{ color:'var(--danger)', background:'var(--danger-light)', border:'none', fontWeight:600 }}
              onClick={handleLogout}
            >
              🚪 Keluar
            </button>
          </div>
        </div>

      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
