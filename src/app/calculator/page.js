'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getProductsByCategory, addProduct } from '@/lib/supabase';

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const calcJual = (hpp, marginPct) =>
  marginPct >= 100 ? hpp : Math.round(hpp / (1 - marginPct / 100));

const calcMarginFromJual = (hpp, jual) =>
  jual > 0 ? +((1 - hpp / jual) * 100).toFixed(1) : 0;

function MarginSlider({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <label className="form-label" style={{ marginBottom:0, fontSize:'0.82rem' }}>{label}</label>
        <span style={{
          fontWeight:800, fontSize:'1rem', color:'var(--accent)',
          background:'var(--accent-light)', padding:'2px 10px', borderRadius:20, minWidth:48, textAlign:'center',
        }}>{value}%</span>
      </div>
      <input
        type="range" min={0} max={80} step={0.5}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:'var(--accent)', cursor:'pointer' }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'var(--text-muted)', marginTop:2 }}>
        <span>0% (BEP)</span><span>20%</span><span>40%</span><span>80%</span>
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  const router = useRouter();
  const [boothBases, setBoothBases] = useState([]);
  const [addons, setAddons]         = useState([]);
  const [ongkirs, setOngkirs]       = useState([]);
  const [loading, setLoading]       = useState(true);

  const [selectedBase, setSelectedBase]       = useState(null);
  const [cartItems, setCartItems]             = useState([]);
  const [marginPct, setMarginPct]             = useState(35);
  const [addonMarginPct, setAddonMarginPct]   = useState(35);
  const [ongkirMarginPct, setOngkirMarginPct] = useState(15);
  const [customJual, setCustomJual]           = useState('');
  const [activeTab, setActiveTab]             = useState('addon');
  const [toast, setToast]                     = useState('');

  // Quick-add produk baru langsung dari kalkulator
  const [showQuickAdd, setShowQuickAdd]       = useState(false);
  const [quickItem, setQuickItem]             = useState({ name:'', category:'addon', unit_price:'', unit:'pcs', keterangan:'' });
  const [quickSaving, setQuickSaving]         = useState(false);

  const DRAFT_KEY = 'calc_draft';

  // ── Load produk ──────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const [b, a, o] = await Promise.all([
        getProductsByCategory('booth_base'),
        getProductsByCategory('addon'),
        getProductsByCategory('ongkir'),
      ]);
      setBoothBases(b); setAddons(a); setOngkirs(o);
    } catch(e) { showToast('❌ Gagal load: ' + e.message); }
    finally { setLoading(false); }
  }, []);

  // ── Restore draft dari sessionStorage saat mount ─────────
  useEffect(() => {
    loadProducts().then(() => {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (draft.selectedBase) setSelectedBase(draft.selectedBase);
        if (draft.cartItems)    setCartItems(draft.cartItems);
        if (draft.marginPct !== undefined)       setMarginPct(draft.marginPct);
        if (draft.addonMarginPct !== undefined)  setAddonMarginPct(draft.addonMarginPct);
        if (draft.ongkirMarginPct !== undefined) setOngkirMarginPct(draft.ongkirMarginPct);
        if (draft.customJual)   setCustomJual(draft.customJual);
      } catch {}
    });
  }, []);

  // ── Simpan draft ke sessionStorage setiap ada perubahan ──
  useEffect(() => {
    if (loading) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      selectedBase, cartItems, marginPct, addonMarginPct, ongkirMarginPct, customJual,
    }));
  }, [selectedBase, cartItems, marginPct, addonMarginPct, ongkirMarginPct, customJual, loading]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // ── Kalkulasi per kategori ──────────────────────────────────
  const baseHPP   = selectedBase?.unit_price || 0;
  const addonsHPP = cartItems.filter(i => i.category === 'addon')
                             .reduce((s, i) => s + i.unit_price * i.qty, 0);
  const ongkirHPP = cartItems.filter(i => i.category === 'ongkir')
                             .reduce((s, i) => s + i.unit_price * i.qty, 0);
  const totalHPP  = baseHPP + addonsHPP + ongkirHPP;

  const hargaJualBase   = calcJual(baseHPP,   marginPct);
  const hargaJualAddon  = calcJual(addonsHPP, addonMarginPct);
  const hargaJualOngkir = calcJual(ongkirHPP, ongkirMarginPct);
  const hargaJualAuto   = hargaJualBase + hargaJualAddon + hargaJualOngkir;

  const hargaJual    = customJual !== '' ? parseFloat(customJual) || 0 : hargaJualAuto;
  const labaRp       = hargaJual - totalHPP;
  const marginAktual = calcMarginFromJual(totalHPP, hargaJual);

  // Margin per item berdasarkan category-nya
  const getItemMargin = (item) => {
    if (item.category === 'ongkir') return ongkirMarginPct;
    if (item.category === 'addon')  return addonMarginPct;
    return marginPct;
  };

  const handleJualInput = (val) => {
    const num = val.replace(/\D/g, '');
    setCustomJual(num);
  };

  const addToCart = (product) => {
    setCartItems(prev => {
      const exist = prev.find(i => i.id === product.id);
      if (exist) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`✅ ${product.name} ditambahkan`);
  };

  const changeQty = (id, delta) => {
    setCartItems(prev =>
      prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
          .filter(i => i.qty > 0)
    );
  };

  const removeItem = (id) => setCartItems(prev => prev.filter(i => i.id !== id));

  // ── Quick-add produk baru ────────────────────────────────
  const handleQuickAdd = async () => {
    if (!quickItem.name.trim()) return showToast('⚠️ Isi nama item');
    const price = parseFloat(quickItem.unit_price);
    if (isNaN(price) || price < 0) return showToast('⚠️ Harga tidak valid');
    setQuickSaving(true);
    try {
      const added = await addProduct({ ...quickItem, unit_price: price });
      // Tambah ke daftar yang relevan tanpa reload
      if (added.category === 'addon')  setAddons(prev => [...prev, added].sort((a,b) => a.unit_price - b.unit_price));
      if (added.category === 'ongkir') setOngkirs(prev => [...prev, added].sort((a,b) => a.unit_price - b.unit_price));
      if (added.category === 'booth_base') setBoothBases(prev => [...prev, added]);
      setShowQuickAdd(false);
      setQuickItem({ name:'', category:'addon', unit_price:'', unit:'pcs', keterangan:'' });
      setActiveTab(added.category === 'ongkir' ? 'ongkir' : 'addon');
      showToast(`✅ "${added.name}" ditambahkan ke daftar`);
    } catch(e) { showToast('❌ ' + e.message); }
    finally { setQuickSaving(false); }
  };

  const reset = () => {
    setSelectedBase(null); setCartItems([]);
    setMarginPct(35); setAddonMarginPct(35); setOngkirMarginPct(15);
    setCustomJual('');
    sessionStorage.removeItem(DRAFT_KEY);
  };

  const goToQuotation = () => {
    if (!selectedBase) return showToast('⚠️ Pilih booth base terlebih dahulu');
    const items = [
      {
        item_name:  selectedBase.name,
        unit_price: calcJual(selectedBase.unit_price, marginPct),
        qty:        1,
        unit:       'set',
      },
      ...cartItems.map(i => ({
        item_name:  i.name,
        unit_price: calcJual(i.unit_price, getItemMargin(i)),
        qty:        i.qty,
        unit:       i.unit || 'pcs',
      })),
    ];
    sessionStorage.setItem('calc_items',   JSON.stringify(items));
    sessionStorage.setItem('calc_hpp',     String(totalHPP));
    sessionStorage.setItem('calc_selling', String(hargaJualAuto));
    router.push('/quotation/new');
  };

  if (loading) return (
    <div>
      <div className="page-header"><h1>🧮 Kalkulator Harga</h1><p>Memuat data produk...</p></div>
      <div className="loading"><div className="spinner" /><span>Memuat...</span></div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>🧮 Kalkulator Harga</h1>
        <p>HPP → Margin per Kategori → Harga Jual · Info hanya untuk sales</p>
      </div>

      <div className="page-body">

        {/* ── Step 1: Booth Base ─────────────────────────── */}
        <div className="section-label">1. Pilih Booth Base</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {boothBases.map(b => {
            const sel = selectedBase?.id === b.id;
            return (
              <button key={b.id} onClick={() => setSelectedBase(b)} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 14px', textAlign:'left', cursor:'pointer',
                background: sel ? 'var(--primary)' : 'var(--surface)',
                color: sel ? 'white' : 'var(--text-primary)',
                border: `2px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius:'var(--radius-sm)', transition:'all 0.15s',
              }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{b.name}</div>
                  {b.size_cm && <div style={{ fontSize:'0.73rem', opacity:0.65 }}>Ukuran {b.size_cm}cm</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:'0.92rem', color: sel ? 'var(--accent-light)' : 'var(--accent)' }}>
                    {fmt(b.unit_price)}
                  </div>
                  <div style={{ fontSize:'0.7rem', opacity:0.6 }}>HPP</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Step 2: Add-ons ────────────────────────────── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <div className="section-label" style={{ marginBottom:0 }}>2. Tambah Komponen</div>
          <button
            className="btn btn-sm"
            style={{ fontSize:'0.72rem', color:'var(--accent)', background:'var(--accent-light)', border:'none' }}
            onClick={() => setShowQuickAdd(!showQuickAdd)}
          >{showQuickAdd ? '✕ Batal' : '+ Produk Baru'}</button>
        </div>

        {/* Quick-add produk baru dari kalkulator — state kalkulator tidak hilang */}
        {showQuickAdd && (
          <div className="card" style={{ marginBottom:10, borderColor:'var(--accent)', borderWidth:2 }}>
            <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--accent)', marginBottom:10 }}>
              ➕ Tambah Produk Baru ke Daftar
            </div>
            <div className="form-group">
              <label className="form-label">Nama</label>
              <input className="form-input" placeholder="Nama produk/add-on" autoFocus
                value={quickItem.name} onChange={e => setQuickItem(p => ({...p, name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-select" value={quickItem.category}
                onChange={e => setQuickItem(p => ({...p, category:e.target.value}))}>
                <option value="addon">🔩 Add-on</option>
                <option value="ongkir">🚚 Ongkir</option>
                <option value="booth_base">🏪 Booth Base</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Keterangan (opsional)</label>
              <input className="form-input" placeholder="Spesifikasi, ukuran, dll"
                value={quickItem.keterangan} onChange={e => setQuickItem(p => ({...p, keterangan:e.target.value}))} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <div className="form-group" style={{ flex:2, marginBottom:0 }}>
                <label className="form-label">Harga HPP (Rp)</label>
                <input className="form-input" type="number" placeholder="0"
                  value={quickItem.unit_price} onChange={e => setQuickItem(p => ({...p, unit_price:e.target.value}))} />
              </div>
              <div className="form-group" style={{ flex:1, marginBottom:0 }}>
                <label className="form-label">Satuan</label>
                <input className="form-input" placeholder="pcs"
                  value={quickItem.unit} onChange={e => setQuickItem(p => ({...p, unit:e.target.value}))} />
              </div>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop:12 }}
              onClick={handleQuickAdd} disabled={quickSaving}>
              {quickSaving ? '⏳ Menyimpan...' : '💾 Simpan & Langsung Pakai'}
            </button>
          </div>
        )}

        <div className="tab-bar" style={{ marginBottom:8 }}>
          {[['addon','🔩 Add-on'],['ongkir','🚚 Ongkir']].map(([k,l]) => (
            <button key={k} className={`tab-btn${activeTab===k?' active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:16 }}>
          {(activeTab==='addon' ? addons : ongkirs).map(p => (
            <div key={p.id} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'9px 12px', background:'var(--surface)',
              border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
            }}>
              <div>
                <div style={{ fontSize:'0.87rem', fontWeight:500 }}>{p.name}</div>
                {p.keterangan && <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>{p.keterangan}</div>}
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>HPP: {fmt(p.unit_price)} / {p.unit}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => addToCart(p)}>+ Tambah</button>
            </div>
          ))}
        </div>

        {/* ── Cart ───────────────────────────────────────── */}
        {cartItems.length > 0 && (
          <>
            <div className="section-label">Item Dipilih ({cartItems.length})</div>
            {cartItems.map(item => {
              const hppTotal  = item.unit_price * item.qty;
              const margin    = getItemMargin(item);
              const jualItem  = calcJual(hppTotal, margin);
              const labaItem  = jualItem - hppTotal;
              const isOngkir  = item.category === 'ongkir';
              return (
                <div key={item.id} className="calc-item">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="calc-item-name">{item.name}</div>
                    <div className="calc-item-price">
                      HPP {fmt(item.unit_price)} × {item.qty} = <strong>{fmt(hppTotal)}</strong>
                    </div>
                    <div style={{ fontSize:'0.73rem', marginTop:2, display:'flex', gap:6 }}>
                      <span style={{ color:'var(--accent)', fontWeight:600 }}>Jual ~{fmt(jualItem)}</span>
                      <span style={{ color: labaItem >= 0 ? '#15803d' : '#b91c1c' }}>
                        (laba {fmt(labaItem)})
                      </span>
                      <span style={{ color:'var(--text-muted)', fontSize:'0.68rem' }}>
                        [{isOngkir ? 'ongkir' : 'add-on'} {margin}%]
                      </span>
                    </div>
                  </div>
                  <div className="calc-item-controls">
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                    <span className="qty-value">{item.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(item.id, +1)}>+</button>
                    <button className="remove-btn" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Step 3: Margin per Kategori ─────────────────── */}
        <div className="section-label" style={{ marginTop:8 }}>3. Set Margin Keuntungan per Kategori</div>
        <div className="card" style={{ marginBottom:14 }}>

          <MarginSlider
            label="🏪 Booth Base"
            value={marginPct}
            onChange={(v) => { setMarginPct(v); setCustomJual(''); }}
          />

          <MarginSlider
            label="🔩 Add-on / Komponen"
            value={addonMarginPct}
            onChange={(v) => { setAddonMarginPct(v); setCustomJual(''); }}
          />

          <MarginSlider
            label="🚚 Ongkos Kirim"
            value={ongkirMarginPct}
            onChange={(v) => { setOngkirMarginPct(v); setCustomJual(''); }}
          />

          {/* Override manual harga jual */}
          <div className="form-group" style={{ marginBottom:0, paddingTop:14, borderTop:'1px solid var(--border-light)' }}>
            <label className="form-label">Override Total Harga Jual (opsional)</label>
            <input
              type="text"
              className="form-input"
              placeholder={`Auto: ${fmt(hargaJualAuto)}`}
              value={customJual ? fmt(parseFloat(customJual)) : ''}
              onChange={e => handleJualInput(e.target.value)}
            />
            {customJual && (
              <button onClick={() => setCustomJual('')} style={{ fontSize:'0.75rem', color:'var(--accent)', marginTop:4, background:'none', border:'none', cursor:'pointer' }}>
                ↩ Kembali ke kalkulasi otomatis
              </button>
            )}
          </div>
        </div>

        {/* ── Ringkasan Internal (Sales Only) ─────────────── */}
        <div className="section-label">📊 Ringkasan Internal — Hanya Terlihat Sales</div>
        <div style={{
          background:'var(--primary)', borderRadius:'var(--radius)',
          overflow:'hidden', marginBottom:16,
          border:'2px solid var(--primary-light)',
        }}>
          {/* Label internal */}
          <div style={{ background:'var(--primary-light)', padding:'6px 14px' }}>
            <span style={{ fontSize:'0.7rem', fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              🔒 Info Internal · Tidak tampil di PDF klien
            </span>
          </div>

          {/* Breakdown per kategori (jika ada >1 kategori) */}
          {(addonsHPP > 0 || ongkirHPP > 0) && (
            <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', fontSize:'0.78rem' }}>
              {baseHPP > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,0.55)', marginBottom:3 }}>
                  <span>Booth Base ({marginPct}%)</span>
                  <span style={{ color:'rgba(255,255,255,0.8)' }}>{fmt(hargaJualBase)}</span>
                </div>
              )}
              {addonsHPP > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,0.55)', marginBottom:3 }}>
                  <span>Add-on ({addonMarginPct}%)</span>
                  <span style={{ color:'rgba(255,255,255,0.8)' }}>{fmt(hargaJualAddon)}</span>
                </div>
              )}
              {ongkirHPP > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,0.55)' }}>
                  <span>Ongkir ({ongkirMarginPct}%)</span>
                  <span style={{ color:'rgba(255,255,255,0.8)' }}>{fmt(hargaJualOngkir)}</span>
                </div>
              )}
            </div>
          )}

          {/* Total HPP */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.88rem' }}>Total HPP (Modal)</span>
            <span style={{ color:'white', fontWeight:700 }}>{fmt(totalHPP)}</span>
          </div>

          {/* Margin aktual */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.88rem' }}>Margin Aktual (blended)</span>
            <span style={{ color:'var(--accent-light)', fontWeight:700 }}>{marginAktual}%</span>
          </div>

          {/* Harga Jual */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'13px 16px', background:'var(--accent)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color:'white', fontWeight:700, fontSize:'0.95rem' }}>💰 Harga Jual ke Klien</span>
            <span style={{ color:'white', fontWeight:800, fontSize:'1.05rem' }}>{fmt(hargaJual)}</span>
          </div>

          {/* Laba */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px' }}>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.88rem' }}>Potensi Laba</span>
            <span style={{ color: labaRp >= 0 ? '#86efac' : '#fca5a5', fontWeight:700 }}>
              {fmt(labaRp)} {labaRp < 0 ? '⚠️ RUGI' : ''}
            </span>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────── */}
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={reset}>🔄 Reset</button>
          <button
            className="btn btn-primary" style={{ flex:2 }}
            onClick={goToQuotation}
            disabled={!selectedBase || hargaJual <= 0}
          >
            📄 Buat Rincian →
          </button>
        </div>

      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
