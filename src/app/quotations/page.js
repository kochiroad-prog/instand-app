'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotations, updateQuotationStatus, updateQuotationDiscount, updateQuotation, deleteQuotation, getQuotationImages, saveQuotationImages, deleteQuotationImages } from '@/lib/supabase';
import { generateQuotationPDF } from '@/lib/pdf';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const formatDate = (s) => new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
const finalPrice = (q) => (q.selling_price || 0) - (q.discount_amount || 0);

// ── Status config ──────────────────────────────────────────
const STATUS = {
  draft:    { label:'Draft',    color:'#4a7c59', bg:'#d4edda', icon:'📝', next: ['sent'] },
  sent:     { label:'Terkirim', color:'#1a6ba0', bg:'#dbeafe', icon:'📤', next: ['accepted','rejected'] },
  accepted: { label:'Diterima', color:'#15803d', bg:'#dcfce7', icon:'✅', next: ['sent'] },
  rejected: { label:'Ditolak',  color:'#b91c1c', bg:'#fee2e2', icon:'❌', next: ['sent'] },
};
const STATUS_NEXT_LABELS = {
  sent:     '📤 Tandai Sudah Terkirim',
  accepted: '✅ Klien Setuju (Deal!)',
  rejected: '❌ Klien Menolak',
};

const FLOW_GUIDE = [
  { step:'1',  icon:'📝', status:'Draft',    color:'#4a7c59', desc:'Rincian baru dibuat, belum dikirim ke klien.',        action:'→ Export PDF → kirim via WA/Email ke klien.' },
  { step:'2',  icon:'📤', status:'Terkirim', color:'#1a6ba0', desc:'PDF sudah dikirim, menunggu balasan klien.',            action:'→ Tandai "Terkirim" agar tercatat kapan dikirim.' },
  { step:'3a', icon:'✅', status:'Diterima', color:'#15803d', desc:'Klien setuju! Rincian deal.',                         action:'→ Tandai "Diterima". Data masuk laporan penjualan.' },
  { step:'3b', icon:'❌', status:'Ditolak',  color:'#b91c1c', desc:'Klien minta harga lebih rendah atau tidak jadi.',      action:'→ Klik "Beri Diskon", set diskon, kirim PDF baru.' },
];

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [selected, setSelected]         = useState(null);
  const [showGuide, setShowGuide]       = useState(false);
  const [discountId, setDiscountId]     = useState(null);
  const [discType, setDiscType]         = useState('pct');
  const [discValue, setDiscValue]       = useState('');
  const [editingId, setEditingId]       = useState(null);   // id rincian yg sedang diedit
  const [editDraft, setEditDraft]       = useState({});     // data edit sementara
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState('');
  // Gambar referensi per quotation (key = quotation id, value = [{name, data}])
  const [qImages, setQImages]           = useState({});
  const fileRefs                        = useRef({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    try   { setQuotations(await getQuotations()); }
    catch (e) { showToast('❌ Gagal load: ' + e.message); }
    finally   { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? quotations : quotations.filter(q => q.status === filter);

  // ── Kalkulasi diskon dari input user ────────────────────
  const calcDiscRp = (q) => {
    const val = parseFloat(discValue) || 0;
    if (discType === 'pct') return Math.round((q.selling_price || 0) * val / 100);
    return val;
  };

  // ── Handlers ────────────────────────────────────────────
  const handleStatus = async (id, status, e) => {
    e?.stopPropagation();
    try {
      await updateQuotationStatus(id, status);
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
      showToast(`✅ Status → ${STATUS[status].label}`);
    } catch(err) { showToast('❌ ' + err.message); }
  };

  const handleDelete = async (id, name, e) => {
    e?.stopPropagation();
    if (!confirm(`Hapus rincian untuk "${name}"?`)) return;
    try {
      await deleteQuotation(id);
      setQuotations(prev => prev.filter(q => q.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast('🗑️ Rincian dihapus');
    } catch(err) { showToast('❌ ' + err.message); }
  };

  const handlePDF = async (q, e) => {
    e?.stopPropagation();
    try {
      showToast('⏳ Membuat PDF...');
      const items = (q.quotation_items || []).map(i => ({
        item_name: i.item_name, unit_price: i.unit_price, qty: i.qty, unit: i.unit,
      }));
      await generateQuotationPDF({
        client_name:     q.client_name,
        project_name:    q.project_name,
        items,
        selling_price:   q.selling_price,
        discount_amount: q.discount_amount || 0,
        notes:           q.notes,
        refImages:       qImages[q.id] || [],
      });
      showToast('✅ PDF berhasil diunduh!');
    } catch(err) { showToast('❌ Gagal buat PDF: ' + err.message); }
  };

  const startDiskon = (q, e) => {
    e?.stopPropagation();
    setDiscountId(q.id);
    // Isi default dari diskon yg sudah ada (jika ada)
    if (q.discount_amount > 0) {
      setDiscType('rp');
      setDiscValue(String(q.discount_amount));
    } else {
      setDiscType('pct');
      setDiscValue('');
    }
  };

  const saveDiskon = async (q, e) => {
    e?.stopPropagation();
    const discRp = calcDiscRp(q);
    if (discRp < 0) return showToast('⚠️ Diskon tidak boleh negatif');
    if (discRp >= (q.selling_price || 0)) return showToast('⚠️ Diskon melebihi harga rincian');
    setSaving(true);
    try {
      await updateQuotationDiscount(q.id, discRp);
      setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, discount_amount: discRp, status:'draft' } : x));
      setSelected(prev => prev?.id === q.id ? { ...prev, discount_amount: discRp, status:'draft' } : prev);
      setDiscountId(null);
      showToast('✅ Diskon disimpan → status kembali ke Draft, export PDF baru & kirim ulang');
    } catch(err) { showToast('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  const hapusDiskon = async (q, e) => {
    e?.stopPropagation();
    setSaving(true);
    try {
      await updateQuotationDiscount(q.id, 0);
      setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, discount_amount: 0 } : x));
      setSelected(prev => prev?.id === q.id ? { ...prev, discount_amount: 0 } : prev);
      showToast('✅ Diskon dihapus');
    } catch(err) { showToast('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  // ── Edit penawaran (draft only) ─────────────────────────
  const startEdit = (q, e) => {
    e?.stopPropagation();
    setEditingId(q.id);
    setEditDraft({
      client_name:  q.client_name,
      project_name: q.project_name,
      notes:        q.notes || '',
      selling_price: String(q.selling_price || ''),
      items: (q.quotation_items || []).map(i => ({
        item_name:  i.item_name,
        unit_price: i.unit_price,
        qty:        i.qty,
        unit:       i.unit || 'pcs',
      })),
    });
  };

  const saveEdit = async (q, e) => {
    e?.stopPropagation();
    if (!editDraft.client_name?.trim()) return showToast('⚠️ Nama klien tidak boleh kosong');
    setSaving(true);
    try {
      const sp = parseFloat(editDraft.selling_price) || 0;
      const updated = await updateQuotation(q.id, {
        client_name:  editDraft.client_name.trim(),
        project_name: editDraft.project_name.trim(),
        notes:        editDraft.notes,
        selling_price: sp,
        items:        editDraft.items,
      });
      // Hitung ulang total_hpp dari items
      const newHPP = editDraft.items.reduce((s, i) => s + i.unit_price * i.qty, 0);
      const merged = {
        ...q,
        ...updated,
        total_hpp: newHPP,
        quotation_items: editDraft.items.map((i, idx) => ({
          ...i, id: `tmp-${idx}`, subtotal: i.unit_price * i.qty, quotation_id: q.id,
        })),
      };
      setQuotations(prev => prev.map(x => x.id === q.id ? merged : x));
      setSelected(merged);
      setEditingId(null);
      showToast('✅ Rincian diperbarui');
    } catch(err) { showToast('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  const editItem = (idx, field, value) => {
    setEditDraft(d => ({
      ...d,
      items: d.items.map((it, i) => i === idx ? { ...it, [field]: field === 'qty' || field === 'unit_price' ? parseFloat(value) || 0 : value } : it),
    }));
  };

  const removeEditItem = (idx) => {
    setEditDraft(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  };

  const addEditItem = () => {
    setEditDraft(d => ({
      ...d,
      items: [...d.items, { item_name: 'Item baru', unit_price: 0, qty: 1, unit: 'pcs' }],
    }));
  };

  // Load gambar dari Supabase saat card dibuka — cache di sessionStorage
  const loadQImages = async (qId) => {
    if (qImages[qId] !== undefined) return; // sudah dimuat di sesi ini

    // Cek cache sessionStorage dulu
    try {
      const cached = sessionStorage.getItem('qimg_' + qId);
      if (cached) {
        setQImages(prev => ({ ...prev, [qId]: JSON.parse(cached) }));
        return;
      }
    } catch {}

    // Load dari Supabase
    const imgs = await getQuotationImages(qId);
    const mapped = imgs.map(i => ({ name: i.file_name || '', data: i.image_data, id: i.id }));
    setQImages(prev => ({ ...prev, [qId]: mapped }));

    // Cache di sessionStorage (skip jika terlalu besar)
    try {
      const str = JSON.stringify(mapped);
      if (str.length < 500_000) sessionStorage.setItem('qimg_' + qId, str);
    } catch {}
  };

  const handleImageUpload = (qId, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const newImg = { name: file.name, data: ev.target.result };
        setQImages(prev => ({
          ...prev,
          [qId]: [...(prev[qId] || []), newImg],
        }));
        // Simpan langsung ke Supabase
        await saveQuotationImages(qId, [newImg]).catch(() => {});
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeQImage = async (qId, idx, e) => {
    e?.stopPropagation();
    setQImages(prev => ({
      ...prev,
      [qId]: (prev[qId] || []).filter((_, i) => i !== idx),
    }));
  };

  const laba = (q) => finalPrice(q) - (q.total_hpp || 0);
  const marginPct = (q) => finalPrice(q) > 0 ? ((laba(q) / finalPrice(q)) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>📄 Riwayat Rincian</h1>
            <p>{quotations.length} rincian tersimpan</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button
              className="btn btn-sm"
              style={{ background:'rgba(255,255,255,0.15)', color:'white', fontSize:'0.75rem' }}
              onClick={() => setShowGuide(!showGuide)}
            >{showGuide ? '✕ Tutup' : '❓ Alur Status'}</button>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/calculator')}>+ Baru</button>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* ── Panduan Alur Status ──────────────────────── */}
        {showGuide && (
          <div className="card" style={{ marginBottom:14, borderColor:'var(--accent)', borderWidth:2 }}>
            <div className="card-title" style={{ marginBottom:12 }}>📖 Cara Kerja Status Rincian</div>
            <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:14, flexWrap:'wrap' }}>
              {['draft','sent','accepted'].map((s, i) => (
                <span key={s} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ background: STATUS[s].bg, color: STATUS[s].color, fontWeight:700, fontSize:'0.75rem', padding:'3px 10px', borderRadius:20 }}>
                    {STATUS[s].icon} {STATUS[s].label}
                  </span>
                  {i < 2 && <span style={{ color:'var(--text-muted)' }}>→</span>}
                </span>
              ))}
              <span style={{ color:'var(--text-muted)', fontSize:'0.8rem', marginLeft:4 }}>atau</span>
              <span style={{ background: STATUS.rejected.bg, color: STATUS.rejected.color, fontWeight:700, fontSize:'0.75rem', padding:'3px 10px', borderRadius:20 }}>
                {STATUS.rejected.icon} {STATUS.rejected.label}
              </span>
            </div>
            {FLOW_GUIDE.map(g => (
              <div key={g.step} style={{
                display:'flex', gap:10, marginBottom:8, padding:'10px 12px', borderRadius:8,
                background: g.step.includes('b') ? '#fff5f5' : '#f8fdf9',
                border:`1px solid ${g.step.includes('b') ? '#fecaca' : '#c6e9d0'}`,
              }}>
                <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background: g.color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}>{g.icon}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.88rem', color: g.color, marginBottom:2 }}>{g.status}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:2 }}>{g.desc}</div>
                  <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontStyle:'italic' }}>{g.action}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:4, padding:'8px', background:'var(--accent-light)', borderRadius:6 }}>
              💡 Diskon muncul di PDF sebagai baris terpisah — klien lihat harga asal, diskon, dan total bayar.
            </div>
          </div>
        )}

        {/* ── Filter tabs ──────────────────────────────── */}
        <div className="tab-bar">
          {[['all','Semua'],['draft','📝 Draft'],['sent','📤 Terkirim'],['accepted','✅ Diterima'],['rejected','❌ Ditolak']].map(([key,lbl]) => (
            <button key={key} className={`tab-btn${filter===key?' active':''}`}
              style={{ fontSize:'0.68rem' }} onClick={() => setFilter(key)}>{lbl}</button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Memuat...</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">Belum ada rincian</div>
            <div className="empty-state-sub">Buat rincian baru dari kalkulator</div>
          </div>
        ) : (
          filtered.map(q => {
            const st    = STATUS[q.status] || STATUS.draft;
            const isOpen = selected?.id === q.id;
            const fp    = finalPrice(q);
            const disc  = q.discount_amount || 0;
            return (
              <div key={q.id} className="card" style={{ marginBottom:10, cursor:'pointer', borderLeft:`3px solid ${st.color}` }}
                onClick={() => { if (!isOpen) loadQImages(q.id); setSelected(isOpen ? null : q); }}>

                {/* ── Card collapsed ───────────────────── */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:'1rem' }}>{q.client_name}</span>
                      <span style={{ background: st.bg, color: st.color, fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>
                        {st.icon} {st.label}
                      </span>
                      {disc > 0 && (
                        <span style={{ background:'#fff3e0', color:'#b45309', fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                          🏷️ Diskon {formatRp(disc)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>{q.project_name}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:2 }}>{formatDate(q.created_at)}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {disc > 0 && (
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textDecoration:'line-through' }}>{formatRp(q.selling_price)}</div>
                    )}
                    <div style={{ fontWeight:700, color:'var(--accent)', fontSize:'1rem' }}>{formatRp(fp)}</div>
                    <div style={{ display:'flex', gap:4, marginTop:4 }}>
                      {q.status === 'draft' && (
                        <button className="btn btn-sm"
                          style={{ padding:'2px 8px', color:'var(--accent)', background:'var(--accent-light)', border:'none', fontSize:'0.8rem' }}
                          onClick={e => { e.stopPropagation(); isOpen ? startEdit(q, e) : (setSelected(q), setTimeout(() => startEdit(q), 50)); }}>
                          ✏️
                        </button>
                      )}
                      <button className="btn btn-sm"
                        style={{ padding:'2px 8px', color:'var(--danger)', background:'var(--danger-light)', border:'none', fontSize:'0.8rem' }}
                        onClick={e => handleDelete(q.id, q.client_name, e)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Card expanded ────────────────────── */}
                {isOpen && (
                  <div style={{ marginTop:14, borderTop:'1px solid var(--border)', paddingTop:14 }}
                    onClick={e => e.stopPropagation()}>

                    {/* ── MODE EDIT (draft only) ───────────── */}
                    {editingId === q.id ? (
                      <div onClick={e => e.stopPropagation()}>
                        <div style={{ fontWeight:700, color:'var(--accent)', fontSize:'0.88rem', marginBottom:12 }}>
                          ✏️ Edit Rincian
                        </div>

                        {/* Nama klien & project */}
                        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                          <div className="form-group" style={{ flex:1, marginBottom:0 }}>
                            <label className="form-label">Nama Klien</label>
                            <input className="form-input" value={editDraft.client_name}
                              onChange={e => setEditDraft(d => ({...d, client_name:e.target.value}))} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom:10 }}>
                          <label className="form-label">Nama Project / Booth</label>
                          <input className="form-input" value={editDraft.project_name}
                            onChange={e => setEditDraft(d => ({...d, project_name:e.target.value}))} />
                        </div>

                        {/* Items */}
                        <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                          Item Rincian
                        </div>
                        {editDraft.items?.map((item, idx) => (
                          <div key={idx} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'10px', marginBottom:6 }}>
                            <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                              <input className="form-input" style={{ flex:1, fontSize:'0.82rem' }}
                                value={item.item_name}
                                onChange={e => editItem(idx, 'item_name', e.target.value)} />
                              <button style={{ color:'var(--danger)', background:'var(--danger-light)', border:'none', borderRadius:6, padding:'0 10px', cursor:'pointer', fontSize:'0.8rem' }}
                                onClick={() => removeEditItem(idx)}>✕</button>
                            </div>
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <div style={{ flex:1 }}>
                                <label className="form-label" style={{ fontSize:'0.7rem' }}>Harga Satuan</label>
                                <input className="form-input" type="number" style={{ fontSize:'0.82rem' }}
                                  value={item.unit_price}
                                  onChange={e => editItem(idx, 'unit_price', e.target.value)} />
                              </div>
                              <div style={{ width:80 }}>
                                <label className="form-label" style={{ fontSize:'0.7rem' }}>Qty</label>
                                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <button className="qty-btn" onClick={() => editItem(idx, 'qty', Math.max(1, item.qty - 1))}>−</button>
                                  <span className="qty-value">{item.qty}</span>
                                  <button className="qty-btn" onClick={() => editItem(idx, 'qty', item.qty + 1)}>+</button>
                                </div>
                              </div>
                              <div style={{ textAlign:'right', fontSize:'0.8rem', fontWeight:700, color:'var(--accent)', minWidth:80, paddingTop:18 }}>
                                {formatRp(item.unit_price * item.qty)}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-ghost btn-sm btn-full" style={{ marginBottom:12, borderStyle:'dashed' }}
                          onClick={addEditItem}>
                          + Tambah Item
                        </button>

                        {/* Harga jual */}
                        <div className="form-group" style={{ marginBottom:8 }}>
                          <label className="form-label">Harga Jual ke Klien (Rp)</label>
                          <input className="form-input" type="number"
                            value={editDraft.selling_price}
                            onChange={e => setEditDraft(d => ({...d, selling_price:e.target.value}))} />
                        </div>

                        {/* Catatan khusus */}
                        <div className="form-group" style={{ marginBottom:12 }}>
                          <label className="form-label">📝 Catatan Khusus (muncul di PDF)</label>
                          <textarea className="form-input" rows={4}
                            style={{ resize:'vertical', fontSize:'0.85rem' }}
                            placeholder="Logo Depan File siap Cetak&#10;Bagian dalam ORI plywood&#10;Dll..."
                            value={editDraft.notes}
                            onChange={e => setEditDraft(d => ({...d, notes:e.target.value}))} />
                        </div>

                        {/* Simpan / Batal */}
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="btn btn-primary" style={{ flex:2 }}
                            disabled={saving} onClick={e => saveEdit(q, e)}>
                            {saving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
                          </button>
                          <button className="btn btn-ghost" style={{ flex:1 }}
                            onClick={e => { e.stopPropagation(); setEditingId(null); }}>
                            Batal
                          </button>
                        </div>
                        <div style={{ marginTop:12, borderBottom:'1px solid var(--border)', marginBottom:12 }} />
                      </div>
                    ) : null}

                    {/* Price breakdown internal */}
                    <div className="price-breakdown" style={{ marginBottom:12 }}>
                      <div className="price-row"><span>Total HPP (Modal)</span><span>{formatRp(q.total_hpp)}</span></div>
                      <div className="price-row"><span>Harga Rincian Asal</span><span>{formatRp(q.selling_price)}</span></div>
                      {disc > 0 && (
                        <div className="price-row" style={{ color:'#b45309' }}>
                          <span>🏷️ Diskon Diberikan</span><span>- {formatRp(disc)}</span>
                        </div>
                      )}
                      <div className="price-row total"><span>Total Bayar Klien</span><span>{formatRp(fp)}</span></div>
                      <div className="price-row laba">
                        <span>💰 Potensi Laba</span>
                        <span>{formatRp(laba(q))} ({marginPct(q)}%)</span>
                      </div>
                    </div>

                    {/* Item list */}
                    {q.quotation_items?.length > 0 && (
                      <div style={{ marginBottom:14 }}>
                        <div className="section-label">Item ({q.quotation_items.length})</div>
                        {q.quotation_items.map(i => (
                          <div key={i.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', padding:'5px 0', borderBottom:'1px solid var(--border-light)' }}>
                            <span>{i.item_name} ×{i.qty}</span>
                            <span style={{ fontWeight:600 }}>{formatRp(i.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Form Beri Diskon ─────────────────── */}
                    {discountId === q.id ? (
                      <div style={{ marginBottom:14, padding:'14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10 }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ fontWeight:700, color:'#92400e', marginBottom:6, fontSize:'0.88rem' }}>
                          🏷️ Beri Diskon untuk {q.client_name}
                        </div>
                        <div style={{ fontSize:'0.78rem', color:'#78350f', marginBottom:12 }}>
                          Diskon akan tampil di PDF — klien melihat harga asli, diskon, dan total bayar.
                        </div>

                        {/* Toggle tipe */}
                        <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                          {[['pct','% Persen'],['rp','Rp Nominal']].map(([k,l]) => (
                            <button key={k}
                              style={{
                                flex:1, padding:'6px', borderRadius:6, fontSize:'0.8rem', fontWeight:700, cursor:'pointer',
                                background: discType===k ? '#f59e0b' : 'white',
                                color: discType===k ? 'white' : '#92400e',
                                border: `1.5px solid ${discType===k ? '#f59e0b' : '#fde68a'}`,
                              }}
                              onClick={() => { setDiscType(k); setDiscValue(''); }}
                            >{l}</button>
                          ))}
                        </div>

                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          placeholder={discType === 'pct' ? 'Contoh: 10 (artinya 10%)' : 'Contoh: 500000'}
                          value={discValue}
                          onChange={e => setDiscValue(e.target.value)}
                          style={{ marginBottom:10 }}
                        />

                        {/* Preview kalkulasi */}
                        {discValue && (() => {
                          const discRp   = calcDiscRp(q);
                          const total    = (q.selling_price||0) - discRp;
                          const labaNew  = total - (q.total_hpp||0);
                          const discPct  = q.selling_price > 0 ? ((discRp/q.selling_price)*100).toFixed(1) : 0;
                          return (
                            <div style={{ background:'white', borderRadius:8, padding:'10px 12px', marginBottom:10, border:'1px solid #fde68a', fontSize:'0.82rem' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                <span style={{ color:'var(--text-secondary)' }}>Harga Rincian Asal</span>
                                <span style={{ fontWeight:600 }}>{formatRp(q.selling_price)}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, color:'#b45309' }}>
                                <span>Diskon ({discType==='pct' ? discValue+'%' : discPct+'%'})</span>
                                <span style={{ fontWeight:700 }}>- {formatRp(discRp)}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid #fde68a', marginBottom:4 }}>
                                <span style={{ fontWeight:700 }}>Total Bayar Klien</span>
                                <span style={{ fontWeight:800, color:'var(--accent)', fontSize:'0.95rem' }}>{formatRp(total)}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', color: labaNew >= 0 ? '#15803d' : '#b91c1c' }}>
                                <span>Labamu setelah diskon</span>
                                <span style={{ fontWeight:700 }}>{formatRp(labaNew)}</span>
                              </div>
                            </div>
                          );
                        })()}

                        <div style={{ display:'flex', gap:8 }}>
                          <button className="btn btn-primary btn-sm" style={{ flex:2, background:'#f59e0b', borderColor:'#f59e0b' }}
                            disabled={saving || !discValue}
                            onClick={e => saveDiskon(q, e)}>
                            {saving ? '⏳...' : '💾 Simpan Diskon'}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ flex:1 }}
                            onClick={e => { e.stopPropagation(); setDiscountId(null); }}>
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Status guide */}
                    <div className="section-label">Ubah Status</div>
                    <div style={{ marginBottom:8, fontSize:'0.78rem', color:'var(--text-secondary)' }}>
                      {q.status === 'draft'    && '📝 Draft → Export PDF lalu kirim ke klien, tandai "Terkirim".'}
                      {q.status === 'sent'     && '📤 Terkirim → Tunggu balasan klien, tandai Diterima atau Ditolak.'}
                      {q.status === 'accepted' && '✅ Diterima → Deal sudah terjadi!'}
                      {q.status === 'rejected' && '❌ Ditolak → Beri diskon negosiasi lalu kirim PDF baru.'}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                      {(STATUS[q.status]?.next || []).map(ns => (
                        <button key={ns}
                          style={{ padding:'6px 12px', borderRadius:20, fontSize:'0.8rem', fontWeight:600, cursor:'pointer', background: STATUS[ns].bg, color: STATUS[ns].color, border:`1.5px solid ${STATUS[ns].color}` }}
                          onClick={e => handleStatus(q.id, ns, e)}>
                          {STATUS_NEXT_LABELS[ns]}
                        </button>
                      ))}
                    </div>

                    {/* ── Gambar Referensi ─────────────────── */}
                    <div style={{ marginBottom:14 }}>
                      <div className="section-label" style={{ marginBottom:8 }}>
                        🖼️ Gambar Referensi Desain
                        {(qImages[q.id]?.length > 0) && (
                          <span style={{ fontWeight:400, color:'var(--accent)', marginLeft:6, fontSize:'0.72rem' }}>
                            {qImages[q.id].length} gambar · ikut ke PDF
                          </span>
                        )}
                      </div>

                      {/* Hidden file input */}
                      <input
                        ref={el => fileRefs.current[q.id] = el}
                        type="file" accept="image/*" multiple
                        style={{ display:'none' }}
                        onChange={e => handleImageUpload(q.id, e)}
                      />

                      {/* Upload button */}
                      <button
                        className="btn btn-ghost btn-sm btn-full"
                        style={{ borderStyle:'dashed', marginBottom: qImages[q.id]?.length > 0 ? 10 : 0 }}
                        onClick={e => { e.stopPropagation(); fileRefs.current[q.id]?.click(); }}
                      >
                        {qImages[q.id]?.length > 0 ? '+ Tambah Gambar Lagi' : '+ Upload Gambar Referensi'}
                      </button>

                      {/* Preview grid */}
                      {qImages[q.id]?.length > 0 && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                          {qImages[q.id].map((img, i) => (
                            <div key={i} style={{ position:'relative', borderRadius:6, overflow:'hidden', border:'1px solid var(--border)', aspectRatio:'1' }}>
                              <img src={img.data} alt={img.name}
                                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                              <button
                                onClick={e => removeQImage(q.id, i, e)}
                                style={{
                                  position:'absolute', top:3, right:3,
                                  background:'rgba(0,0,0,0.55)', color:'white',
                                  border:'none', borderRadius:'50%',
                                  width:20, height:20, fontSize:'0.7rem',
                                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                                }}>✕</button>
                              <div style={{
                                position:'absolute', bottom:0, left:0, right:0,
                                background:'rgba(0,0,0,0.45)', color:'white',
                                fontSize:'0.6rem', padding:'2px 4px',
                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                              }}>{img.name}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {qImages[q.id]?.length > 0 && (
                        <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:6, fontStyle:'italic' }}>
                          💡 Gambar di atas akan muncul di halaman terakhir PDF saat Export.
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-outline btn-sm" style={{ flex:2 }}
                        onClick={e => handlePDF(q, e)}>
                        📄 Export PDF
                      </button>
                      {discountId !== q.id && (
                        <button className="btn btn-sm" style={{ flex:2, background:'#fffbeb', color:'#92400e', border:'1px solid #fde68a', fontWeight:600 }}
                          onClick={e => startDiskon(q, e)}>
                          🏷️ {disc > 0 ? 'Ubah Diskon' : 'Beri Diskon'}
                        </button>
                      )}
                      {disc > 0 && discountId !== q.id && (
                        <button className="btn btn-sm" style={{ color:'var(--text-muted)', background:'var(--border-light)', border:'none', fontSize:'0.75rem' }}
                          onClick={e => hapusDiskon(q, e)}>
                          Hapus Diskon
                        </button>
                      )}
                      <button className="btn btn-sm"
                        style={{ color:'var(--danger)', background:'var(--danger-light)', border:'none' }}
                        onClick={e => handleDelete(q.id, q.client_name, e)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
