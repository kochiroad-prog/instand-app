'use client';
import { useState, useEffect } from 'react';
import { getProducts, updateProduct, addProduct, deleteProduct, getPriceHistory, getAIKnowledge, addAIKnowledge, updateAIKnowledge, deleteAIKnowledge, supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const rp     = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tglFmt = (s) => new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

const CATEGORY_LABELS = {
  booth_base: '🏪 Booth Base',
  addon:      '🔩 Add-on',
  ongkir:     '🚚 Ongkir',
  material:   '🧱 Bahan',
};

const KB_CAT = { general:'💡 Umum', products:'📦 Produk', tips:'🎯 Tips Estimasi', quotations:'📄 Rincian' };

export default function SettingsPage() {
  const { user }               = useAuth() || {};
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mainTab, setMainTab]     = useState('products'); // 'products' | 'knowledge'
  const [activeTab, setActiveTab] = useState('booth_base');

  // AI Knowledge Base states
  const [knowledge,    setKnowledge]    = useState([]);
  const [kbLoading,    setKbLoading]    = useState(false);
  const [kbEditId,     setKbEditId]     = useState(null);
  const [kbEditData,   setKbEditData]   = useState({});
  const [showAddKb,    setShowAddKb]    = useState(false);
  const [newKb,        setNewKb]        = useState({ title:'', category:'tips', content:'' });
  const [showAdd, setShowAdd]     = useState(false);
  const [newItem, setNewItem]     = useState({ name:'', category:'addon', unit_price:'', unit:'pcs', keterangan:'' });
  const [saving, setSaving]       = useState(false);

  // State untuk edit inline
  const [editId, setEditId]       = useState(null);
  const [editData, setEditData]   = useState({});

  // State untuk riwayat harga
  const [historyId, setHistoryId]     = useState(null);
  const [history, setHistory]         = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [toast, setToast]             = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = async () => {
    try { setProducts(await getProducts()); }
    catch(e) { showToast('❌ ' + e.message); }
    finally  { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const loadKnowledge = async () => {
    setKbLoading(true);
    try { setKnowledge(await getAIKnowledge()); }
    catch(e) { showToast('❌ ' + e.message); }
    finally { setKbLoading(false); }
  };

  const saveKb = async (id) => {
    try {
      const updated = await updateAIKnowledge(id, kbEditData);
      setKnowledge(prev => prev.map(k => k.id === id ? { ...k, ...updated } : k));
      setKbEditId(null);
      showToast('✅ Knowledge diperbarui');
    } catch(e) { showToast('❌ ' + e.message); }
  };

  const addKb = async () => {
    if (!newKb.title.trim() || !newKb.content.trim()) return showToast('⚠️ Isi judul dan konten');
    try {
      const added = await addAIKnowledge(newKb);
      setKnowledge(prev => [...prev, added]);
      setShowAddKb(false);
      setNewKb({ title:'', category:'tips', content:'' });
      showToast('✅ Knowledge ditambahkan');
    } catch(e) { showToast('❌ ' + e.message); }
  };

  const delKb = async (id, title) => {
    if (!confirm(`Hapus "${title}"?`)) return;
    try {
      await deleteAIKnowledge(id);
      setKnowledge(prev => prev.filter(k => k.id !== id));
      showToast('🗑️ Dihapus');
    } catch(e) { showToast('❌ ' + e.message); }
  };

  const filtered = products.filter(p => p.category === activeTab);

  // ── Edit inline ───────────────────────────────────────────
  const startEdit = (p) => {
    setEditId(p.id);
    setEditData({ name: p.name, unit_price: String(p.unit_price), unit: p.unit || 'pcs', keterangan: p.keterangan || '' });
    setHistoryId(null);
  };

  const saveEdit = async (id) => {
    const price = parseFloat(editData.unit_price);
    if (!editData.name.trim()) return showToast('⚠️ Nama tidak boleh kosong');
    if (isNaN(price) || price < 0) return showToast('⚠️ Harga tidak valid');
    setSaving(true);
    try {
      const updated = await updateProduct(id, {
        name:       editData.name.trim(),
        unit_price: price,
        unit:       editData.unit || 'pcs',
        keterangan: editData.keterangan || '',
      });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      setEditId(null);
      showToast('✅ Produk diperbarui');
    } catch(e) { showToast('❌ ' + e.message); }
    finally    { setSaving(false); }
  };

  // ── Riwayat harga ─────────────────────────────────────────
  const toggleHistory = async (id) => {
    if (historyId === id) { setHistoryId(null); return; }
    setHistoryId(id);
    setHistLoading(true);
    try { setHistory(await getPriceHistory(id)); }
    catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  // ── Hapus ─────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!confirm(`Nonaktifkan "${name}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('🗑️ Item dinonaktifkan');
    } catch(e) { showToast('❌ ' + e.message); }
  };

  // ── Tambah item baru ──────────────────────────────────────
  const handleAdd = async () => {
    if (!newItem.name.trim()) return showToast('⚠️ Isi nama item');
    const price = parseFloat(newItem.unit_price);
    if (isNaN(price) || price < 0) return showToast('⚠️ Harga tidak valid');
    setSaving(true);
    try {
      const added = await addProduct({ ...newItem, unit_price: price });
      setProducts(prev => [...prev, added]);
      setShowAdd(false);
      setNewItem({ name:'', category:'addon', unit_price:'', unit:'pcs', keterangan:'' });
      showToast('✅ Item ditambahkan');
    } catch(e) { showToast('❌ ' + e.message); }
    finally    { setSaving(false); }
  };

  const handleLogout = async () => {
    if (!confirm('Yakin mau keluar?')) return;
    await supabase.auth.signOut();
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>⚙️ {mainTab === 'products' ? 'Kelola Harga' : 'AI Knowledge Base'}</h1>
            <p>{mainTab === 'products' ? 'Update harga, nama, keterangan produk' : 'Kelola pengetahuan AI estimator'}</p>
          </div>
          {mainTab === 'products' ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? '✕ Batal' : '+ Tambah'}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddKb(!showAddKb); if (!knowledge.length) loadKnowledge(); }}>
              {showAddKb ? '✕ Batal' : '+ Tambah'}
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* ── Main tab switcher ──────────────────────── */}
        <div className="tab-bar" style={{ marginBottom:14 }}>
          {[['products','⚙️ Produk & Harga'],['knowledge','🧠 AI Knowledge']].map(([key,lbl]) => (
            <button key={key} className={`tab-btn${mainTab===key?' active':''}`}
              onClick={() => { setMainTab(key); if (key==='knowledge' && !knowledge.length) loadKnowledge(); }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ══ PANEL: AI KNOWLEDGE BASE ══════════════════ */}
        {mainTab === 'knowledge' && (
          <div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginBottom:12, padding:'8px 12px', background:'var(--accent-light)', borderRadius:8 }}>
              🤖 Knowledge ini dibaca AI setiap kali estimasi dilakukan. Update rutin (tiap 1-2 minggu) membantu AI makin akurat.
            </div>

            {showAddKb && (
              <div className="card" style={{ marginBottom:12, borderColor:'var(--accent)', borderWidth:2 }}>
                <div className="card-title">➕ Tambah Knowledge Baru</div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-select" value={newKb.category} onChange={e => setNewKb(p => ({...p, category:e.target.value}))}>
                    {Object.entries(KB_CAT).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Judul</label>
                  <input className="form-input" placeholder="Contoh: Harga Material HPL 2026" value={newKb.title} onChange={e => setNewKb(p => ({...p, title:e.target.value}))} />
                </div>
                <div className="form-group" style={{ marginBottom:10 }}>
                  <label className="form-label">Konten (markdown)</label>
                  <textarea className="form-input" rows={6} style={{ resize:'vertical', fontSize:'0.82rem', fontFamily:'monospace' }}
                    placeholder="Tulis pengetahuan yang ingin diketahui AI..."
                    value={newKb.content} onChange={e => setNewKb(p => ({...p, content:e.target.value}))} />
                </div>
                <button className="btn btn-primary btn-full" onClick={addKb}>💾 Simpan Knowledge</button>
              </div>
            )}

            {kbLoading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : knowledge.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧠</div>
                <div className="empty-state-text">Belum ada knowledge base</div>
                <div className="empty-state-sub">Tap "+ Tambah" untuk mulai mengisi</div>
              </div>
            ) : (
              knowledge.map(k => (
                <div key={k.id} className="card" style={{ marginBottom:8 }}>
                  {kbEditId === k.id ? (
                    <div>
                      <div className="form-group">
                        <label className="form-label">Kategori</label>
                        <select className="form-select" value={kbEditData.category} onChange={e => setKbEditData(d => ({...d, category:e.target.value}))}>
                          {Object.entries(KB_CAT).map(([kk,v]) => <option key={kk} value={kk}>{v}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Judul</label>
                        <input className="form-input" value={kbEditData.title} onChange={e => setKbEditData(d => ({...d, title:e.target.value}))} />
                      </div>
                      <div className="form-group" style={{ marginBottom:10 }}>
                        <label className="form-label">Konten</label>
                        <textarea className="form-input" rows={8} style={{ resize:'vertical', fontSize:'0.8rem', fontFamily:'monospace' }}
                          value={kbEditData.content} onChange={e => setKbEditData(d => ({...d, content:e.target.value}))} />
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-primary" style={{ flex:2 }} onClick={() => saveKb(k.id)}>💾 Simpan</button>
                        <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setKbEditId(null)}>Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                        <div>
                          <span style={{ fontSize:'0.68rem', fontWeight:700, background:'var(--accent-light)', color:'var(--accent)', padding:'2px 8px', borderRadius:12, marginBottom:4, display:'inline-block' }}>
                            {KB_CAT[k.category] || k.category}
                          </span>
                          <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{k.title}</div>
                          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>
                            Diperbarui: {new Date(k.updated_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setKbEditId(k.id); setKbEditData({ title:k.title, content:k.content, category:k.category }); }}>✏️</button>
                          <button className="btn btn-sm" style={{ color:'var(--danger)', background:'var(--danger-light)', border:'none' }} onClick={() => delKb(k.id, k.title)}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', whiteSpace:'pre-wrap', maxHeight:80, overflow:'hidden', WebkitMaskImage:'linear-gradient(180deg,#000 60%,transparent)' }}>
                        {k.content}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ══ PANEL: PRODUK ════════════════════════════ */}
        {mainTab !== 'knowledge' && (
        <div>

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
            <div className="form-group">
              <label className="form-label">Keterangan (opsional)</label>
              <input className="form-input" placeholder="Contoh: ukuran 120cm, bahan aluminium, dll"
                value={newItem.keterangan} onChange={e => setNewItem(p => ({...p, keterangan:e.target.value}))} />
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
              {editId !== p.id ? (
                <>
                  <div className="flex-between">
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:'0.9rem' }} className="truncate">{p.name}</div>
                      {p.keterangan && (
                        <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:2 }}>{p.keterangan}</div>
                      )}
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>per {p.unit}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:10 }}>
                      <span style={{ fontWeight:700, color:'var(--accent)', fontSize:'0.95rem', whiteSpace:'nowrap' }}>
                        {rp(p.unit_price)}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>✏️</button>
                      <button className="btn btn-sm"
                        style={{ background: historyId===p.id ? 'var(--accent-light)' : 'var(--border-light)', color:'var(--accent)', fontSize:'0.8rem' }}
                        onClick={() => toggleHistory(p.id)}>📋</button>
                      <button className="btn btn-sm"
                        style={{ color:'var(--danger)', background:'var(--danger-light)' }}
                        onClick={() => handleDelete(p.id, p.name)}>🗑️</button>
                    </div>
                  </div>

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
                </>
              ) : (
                <div>
                  <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--accent)', marginBottom:10 }}>
                    ✏️ Edit Produk
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama</label>
                    <input className="form-input" value={editData.name} autoFocus
                      onChange={e => setEditData(d => ({...d, name:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keterangan</label>
                    <input className="form-input" placeholder="Ukuran, spesifikasi, catatan..."
                      value={editData.keterangan}
                      onChange={e => setEditData(d => ({...d, keterangan:e.target.value}))} />
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <div className="form-group" style={{ flex:2, marginBottom:0 }}>
                      <label className="form-label">Harga HPP (Rp)</label>
                      <input className="form-input" type="number" value={editData.unit_price}
                        onChange={e => setEditData(d => ({...d, unit_price:e.target.value}))} />
                    </div>
                    <div className="form-group" style={{ flex:1, marginBottom:0 }}>
                      <label className="form-label">Satuan</label>
                      <input className="form-input" value={editData.unit}
                        onChange={e => setEditData(d => ({...d, unit:e.target.value}))} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:12 }}>
                    <button className="btn btn-primary" style={{ flex:2 }}
                      onClick={() => saveEdit(p.id)} disabled={saving}>
                      {saving ? '⏳' : '💾 Simpan'}
                    </button>
                    <button className="btn btn-ghost" style={{ flex:1 }}
                      onClick={() => setEditId(null)}>
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        </div>)}
        {/* end mainTab !== 'knowledge' */}

        {/* Akun & Logout */}
        <div className="card" style={{ marginTop:20 }}>
          <div className="card-title" style={{ marginBottom:10 }}>👤 Akun</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:2 }}>Login sebagai</div>
              <div style={{ fontSize:'0.9rem', fontWeight:600 }}>{user?.email || '—'}</div>
            </div>
            <button className="btn btn-sm"
              style={{ color:'var(--danger)', background:'var(--danger-light)', border:'none', fontWeight:600 }}
              onClick={handleLogout}>
              🚪 Keluar
            </button>
          </div>
        </div>

      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
