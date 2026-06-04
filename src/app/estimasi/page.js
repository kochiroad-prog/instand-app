'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts } from '@/lib/supabase';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const MARGIN_DEFAULT = 35;
const SAVED_KEY      = 'est_saved';
const USD_RATE       = 16500; // IDR per USD (approximate)

// Claude 3 Haiku pricing di OpenRouter (per 1M tokens)
const PRICE_INPUT_PER_M  = 0.25;  // $0.25 / 1M input tokens
const PRICE_OUTPUT_PER_M = 1.25;  // $1.25 / 1M output tokens

const toSell = (hpp, margin) =>
  margin >= 100 ? hpp : Math.ceil(hpp / (1 - margin / 100) / 1000) * 1000;

// Estimasi token dari base64 image (rough: 1 token ≈ 3-4 bytes of base64)
const estImageTokens = (b64) => {
  const bytes = (b64?.length || 0) * 0.75; // base64 → bytes
  return Math.round(bytes / 4 / 3);        // bytes → tokens (rough)
};

// Estimasi token dari teks
const estTextTokens = (text) => Math.ceil((text?.length || 0) / 4);

// Hitung estimasi biaya dalam IDR
const estCostIDR = (inputTok, outputTok) => {
  const costUSD = (inputTok * PRICE_INPUT_PER_M + outputTok * PRICE_OUTPUT_PER_M) / 1_000_000;
  return Math.ceil(costUSD * USD_RATE);
};

const STEPS = [
  'Membaca gambar booth...',
  'Mengambil knowledge base INSTAND...',
  'Mengenali komponen & material...',
  'Mencocokkan dengan katalog & database harga...',
  'Memvalidasi estimasi harga...',
];

// Kompres gambar untuk disimpan (max 400px, JPEG 60%)
async function compressImage(base64, maxPx = 400) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

const fmtDate = (ts) => new Date(ts).toLocaleDateString('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

export default function EstimasiPage() {
  const router = useRouter();

  const [imgPreview,   setImgPreview]   = useState(null);
  const [imgBase64,    setImgBase64]    = useState(null);
  const [description,  setDescription] = useState('');
  const [analyzing,    setAnalyzing]   = useState(false);
  const [stepIdx,      setStepIdx]     = useState(0);
  const [result,       setResult]      = useState(null);
  const [items,        setItems]       = useState([]);
  const [margin,       setMargin]      = useState(MARGIN_DEFAULT);
  const [actualCost,   setActualCost]  = useState(null);  // biaya aktual setelah API call
  const [error,        setError]       = useState('');
  const [errType,      setErrType]     = useState('');
  const [toast,        setToast]       = useState('');
  const [savedList,    setSavedList]   = useState([]);
  const [showSaved,    setShowSaved]   = useState(false);
  const fileRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Load saved estimations dari localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSavedList(JSON.parse(raw));
    } catch {}
  }, []);

  // ── Estimasi biaya SEBELUM kirim ──────────────────────────
  const promptText   = `KATALOG PRODUK + SISTEM PROMPT (estimasi)`;
  const estInputTok  = estImageTokens(imgBase64) + estTextTokens(promptText) + estTextTokens(description) + 800;
  const estOutputTok = 600;
  const estCost      = imgBase64 ? estCostIDR(estInputTok, estOutputTok) : 0;

  // ── Handle upload ─────────────────────────────────────────
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgPreview(e.target.result);
      setImgBase64(e.target.result);
      setResult(null); setItems([]); setError(''); setErrType(''); setActualCost(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  // ── Analisa ───────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!imgBase64) return showToast('Upload gambar dulu');
    setAnalyzing(true); setStepIdx(0); setError(''); setErrType(''); setResult(null); setActualCost(null);

    let idx = 0;
    const stepTimer = setInterval(() => {
      idx++;
      if (idx < STEPS.length) setStepIdx(idx);
    }, 1200);

    try {
      const products = await getProducts();
      const res = await fetch('/api/estimate-booth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imgBase64, products, description }),
      });
      const data = await res.json();
      clearInterval(stepTimer);

      if (!res.ok || data.error) {
        setError(data.error || 'Gagal menganalisa');
        setErrType(data.errType || '');
        return;
      }

      // Hitung biaya aktual dari usage data OpenRouter
      if (data.usage) {
        const inTok  = data.usage.prompt_tokens    || data.usage.input_tokens  || 0;
        const outTok = data.usage.completion_tokens || data.usage.output_tokens || 0;
        setActualCost({ inTok, outTok, idr: estCostIDR(inTok, outTok) });
      }

      setResult(data);
      setItems((data.items || []).map(i => ({
        ...i, qty: Number(i.qty) || 1, unit_price: Number(i.unit_price) || 0,
      })));
    } catch (err) {
      clearInterval(stepTimer);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Edit items ────────────────────────────────────────────
  const editItem = (idx, field, val) =>
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, [field]: field === 'qty' || field === 'unit_price' ? (parseFloat(val) || 0) : val } : it
    ));
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const addItem    = ()    => setItems(prev => [...prev, { product_name:'Item Baru', qty:1, unit_price:0, unit:'pcs', alasan:'' }]);

  const totalHPP  = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const hargaJual = toSell(totalHPP, margin);

  // ── Simpan estimasi ke localStorage (dengan thumbnail gambar) ──
  const saveEstimation = async () => {
    if (!result || !items.length) return showToast('Tidak ada hasil untuk disimpan');
    // Kompres gambar sebelum simpan (hemat localStorage)
    let thumbnail = null;
    if (imgBase64) {
      thumbnail = await compressImage(imgBase64, 350).catch(() => null);
    }
    const entry = {
      id:        Date.now(),
      date:      Date.now(),
      analisis:  result.analisis,
      items,
      totalHPP,
      hargaJual,
      margin,
      catatan:   result.catatan || '',
      biaya:     actualCost?.idr || estCost,
      thumbnail,               // gambar terkompresi untuk preview
      description,             // keterangan yang dipakai
    };
    const updated = [entry, ...savedList].slice(0, 15); // max 15 (hemat storage)
    setSavedList(updated);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
      showToast('✅ Estimasi + gambar disimpan!');
    } catch (e) {
      // localStorage penuh → simpan tanpa gambar
      const entryNoImg = { ...entry, thumbnail: null };
      const updatedNoImg = [entryNoImg, ...savedList].slice(0, 15);
      setSavedList(updatedNoImg);
      localStorage.setItem(SAVED_KEY, JSON.stringify(updatedNoImg));
      showToast('✅ Estimasi disimpan (gambar terlalu besar, tidak ikut tersimpan)');
    }
  };

  // ── Hapus estimasi tersimpan ──────────────────────────────
  const deleteEstimation = (id) => {
    const updated = savedList.filter(e => e.id !== id);
    setSavedList(updated);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(updated)); } catch {}
  };

  // ── Buat rincian dari estimasi (gambar ikut diteruskan) ────
  const goToQuotation = async (overrideItems, overrideHPP, overrideSell, overrideImg) => {
    const useItems = overrideItems || items;
    const useHPP   = overrideHPP   ?? totalHPP;
    const useSell  = overrideSell  ?? hargaJual;
    const useImg   = overrideImg   ?? imgBase64;
    if (!useItems.length) return showToast('Tidak ada item');
    const cartItems = useItems.map(i => ({
      item_name: i.product_name, unit_price: i.unit_price, qty: i.qty, unit: i.unit || 'pcs',
    }));
    sessionStorage.setItem('calc_items',   JSON.stringify(cartItems));
    sessionStorage.setItem('calc_hpp',     String(useHPP));
    sessionStorage.setItem('calc_selling', String(useSell));
    // Simpan gambar untuk ditampilkan di form rincian
    if (useImg) {
      try {
        const thumb = await compressImage(useImg, 800);
        if (thumb) sessionStorage.setItem('est_image', JSON.stringify([{ name: 'Referensi AI Estimasi', data: thumb }]));
      } catch {}
    }
    router.push('/quotation/new');
  };

  const confidenceColor = { tinggi:'#15803d', sedang:'#b45309', rendah:'#b91c1c' };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>🤖 AI Estimasi Harga Booth</h1>
            <p>Upload foto → AI deteksi komponen → estimasi harga otomatis</p>
          </div>
          {savedList.length > 0 && (
            <button className="btn btn-sm"
              style={{ background:'rgba(255,255,255,0.15)', color:'white', fontSize:'0.72rem' }}
              onClick={() => setShowSaved(!showSaved)}>
              {showSaved ? '✕ Tutup' : `📂 Tersimpan (${savedList.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="page-body">

        {/* ── Estimasi tersimpan ─────────────────────────── */}
        {showSaved && savedList.length > 0 && (
          <div className="card" style={{ marginBottom:14, borderColor:'var(--accent)', borderWidth:2 }}>
            <div className="card-title" style={{ marginBottom:10 }}>📂 Estimasi Tersimpan</div>
            {savedList.map(e => (
              <div key={e.id} style={{ padding:'10px 12px', marginBottom:6, background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  {/* Thumbnail gambar jika ada */}
                  {e.thumbnail && (
                    <img src={e.thumbnail} alt="ref"
                      style={{ width:52, height:52, objectFit:'cover', borderRadius:6, border:'1px solid var(--border)', flexShrink:0, marginRight:8 }} />
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.analisis?.slice(0,55)}...</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>
                      {fmtDate(e.date)} · {e.items.length} item · {rp(e.hargaJual)}
                    </div>
                    {e.description && (
                      <div style={{ fontSize:'0.7rem', color:'var(--accent)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        📝 {e.description.slice(0,40)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteEstimation(e.id)}
                    style={{ color:'var(--danger)', background:'none', border:'none', cursor:'pointer', fontSize:'0.9rem', flexShrink:0, marginLeft:4 }}>
                    🗑️
                  </button>
                </div>
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex:2, fontSize:'0.75rem' }}
                    onClick={() => goToQuotation(e.items, e.totalHPP, e.hargaJual, e.thumbnail)}>
                    📄 Buat Rincian
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex:1, fontSize:'0.75rem' }}
                    onClick={() => {
                      setItems(e.items); setMargin(e.margin);
                      setResult({ analisis: e.analisis, catatan: e.catatan, confidence:'sedang' });
                      // Restore gambar jika ada thumbnail
                      if (e.thumbnail) { setImgPreview(e.thumbnail); setImgBase64(e.thumbnail); }
                      setDescription(e.description || '');
                      setShowSaved(false); showToast('Estimasi dimuat');
                    }}>
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Warning kredit habis ───────────────────────── */}
        {errType === 'insufficient_credits' && (
          <div style={{ marginBottom:14, padding:'14px', background:'#fff3e0', border:'1px solid #f59e0b', borderRadius:10 }}>
            <div style={{ fontWeight:700, color:'#92400e', marginBottom:6, fontSize:'0.95rem' }}>
              ⚠️ Kredit OpenRouter Habis
            </div>
            <div style={{ fontSize:'0.82rem', color:'#78350f', marginBottom:10 }}>
              Saldo kredit OpenRouter kamu tidak mencukupi untuk menjalankan analisa ini.
            </div>
            <a href="https://openrouter.ai/credits" target="_blank" rel="noopener noreferrer"
              className="btn btn-sm"
              style={{ display:'inline-block', background:'#f59e0b', color:'white', border:'none', fontWeight:700, textDecoration:'none' }}>
              💳 Top Up Kredit di OpenRouter
            </a>
            <div style={{ fontSize:'0.72rem', color:'#92400e', marginTop:8 }}>
              Min. $5 (~Rp 82.000) cukup untuk ~500-1000 analisa gambar.
            </div>
          </div>
        )}

        {/* ── Upload area ─────────────────────────────────── */}
        <div className="card" style={{
            marginBottom:12, cursor:'pointer', overflow:'hidden',
            border: imgPreview ? '2px solid var(--accent)' : '2px dashed var(--border)',
            padding: imgPreview ? 0 : '24px 16px',
          }}
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => !imgPreview && fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => handleFile(e.target.files?.[0])} />
          {imgPreview ? (
            <div style={{ position:'relative' }}>
              <img src={imgPreview} alt="booth"
                style={{ width:'100%', display:'block', maxHeight:260, objectFit:'contain', background:'#f8fdf9' }} />
              <button onClick={e => { e.stopPropagation(); setImgPreview(null); setImgBase64(null); setResult(null); setItems([]); setError(''); setActualCost(null); }}
                style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.55)', color:'white', border:'none', borderRadius:'50%', width:28, height:28, fontSize:'0.85rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                ✕
              </button>
              <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                style={{ position:'absolute', bottom:8, right:8, background:'rgba(255,255,255,0.85)', color:'var(--accent)', border:'1px solid var(--accent)', borderRadius:8, padding:'4px 10px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}>
                Ganti Foto
              </button>
            </div>
          ) : (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🏪</div>
              <div style={{ fontWeight:700, color:'var(--accent)', marginBottom:4 }}>Upload Foto Booth</div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Tap untuk pilih foto, atau drag & drop</div>
            </div>
          )}
        </div>

        {/* ── Keterangan tambahan (opsional) ────────────────── */}
        {imgPreview && (
          <div className="form-group" style={{ marginBottom:10 }}>
            <label className="form-label">
              📝 Keterangan Tambahan <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(opsional)</span>
            </label>
            <textarea className="form-input" rows={3}
              style={{ resize:'vertical', fontSize:'0.85rem' }}
              placeholder="Contoh: Booth ukuran 2x1m, bahan HPL putih, ada laci bawah, roda 4, untuk jualan kopi..."
              value={description}
              onChange={e => setDescription(e.target.value)} />
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4 }}>
              Semakin detail keterangan, semakin akurat estimasi AI
            </div>
          </div>
        )}

        {/* ── Perkiraan biaya sebelum analisa ───────────────── */}
        {imgBase64 && !analyzing && !result && (
          <div style={{ marginBottom:12, padding:'8px 12px', background:'var(--accent-light)', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.8rem' }}>
            <span style={{ color:'var(--text-secondary)' }}>
              💰 Perkiraan biaya API
            </span>
            <span style={{ fontWeight:700, color:'var(--accent)' }}>
              ~{rp(estCost)}
              <span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:4, fontSize:'0.72rem' }}>
                (~{estInputTok + estOutputTok} token)
              </span>
            </span>
          </div>
        )}

        {/* ── Tombol Analisa ────────────────────────────────── */}
        {imgPreview && !analyzing && !result && (
          <button className="btn btn-primary btn-full"
            style={{ marginBottom:14, padding:'14px', fontSize:'1rem' }}
            onClick={handleAnalyze}>
            🤖 Analisa & Estimasi Harga
          </button>
        )}

        {/* ── Loading ────────────────────────────────────────── */}
        {analyzing && (
          <div className="card" style={{ marginBottom:14, textAlign:'center', padding:'24px 16px' }}>
            <div className="spinner" style={{ margin:'0 auto 12px', width:32, height:32, borderWidth:3 }} />
            <div style={{ fontWeight:700, color:'var(--accent)', fontSize:'0.95rem', marginBottom:12 }}>
              AI sedang menganalisa booth...
            </div>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:8, padding:'5px 0', fontSize:'0.82rem',
                color: i < stepIdx ? 'var(--accent)' : i === stepIdx ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: i === stepIdx ? 700 : 400,
              }}>
                <span>{i < stepIdx ? '✅' : i === stepIdx ? '⏳' : '○'}</span>
                {step}
              </div>
            ))}
          </div>
        )}

        {/* ── Error biasa ──────────────────────────────────────── */}
        {error && errType !== 'insufficient_credits' && (
          <div style={{ marginBottom:14, padding:'12px 14px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem' }}>
            ❌ {error}
          </div>
        )}

        {/* ── Hasil analisa ─────────────────────────────────── */}
        {result && !analyzing && (
          <>
            <div className="card" style={{ marginBottom:10, borderLeft:'3px solid var(--accent)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--accent)' }}>🔍 Hasil Analisa AI</div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {result.confidence && (
                    <span style={{ background:`${confidenceColor[result.confidence]}22`, color:confidenceColor[result.confidence], fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:12 }}>
                      Keyakinan: {result.confidence}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom: result.catatan ? 8 : 0 }}>
                {result.analisis}
              </div>
              {result.catatan && (
                <div style={{ marginTop:8, padding:'8px 10px', background:'var(--accent-light)', borderRadius:6, fontSize:'0.78rem', color:'var(--text-secondary)' }}>
                  💡 {result.catatan}
                </div>
              )}

              {/* Biaya aktual */}
              {actualCost && (
                <div style={{ marginTop:10, padding:'6px 10px', background:'#f0fdf4', borderRadius:6, display:'flex', justifyContent:'space-between', fontSize:'0.78rem' }}>
                  <span style={{ color:'var(--text-muted)' }}>💰 Biaya aktual API call ini</span>
                  <span style={{ fontWeight:700, color:'#15803d' }}>
                    {rp(actualCost.idr)}
                    <span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:4 }}>
                      ({actualCost.inTok + actualCost.outTok} token)
                    </span>
                  </span>
                </div>
              )}
            </div>

            <button className="btn btn-ghost btn-sm btn-full" style={{ marginBottom:12 }} onClick={handleAnalyze}>
              🔄 Analisa Ulang
            </button>

            {/* Items editable */}
            <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
              Item Estimasi ({items.length}) — bisa diedit
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="card" style={{ marginBottom:6, padding:'10px 12px' }}>
                <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                  <input className="form-input" style={{ flex:1, fontSize:'0.82rem' }}
                    value={item.product_name}
                    onChange={e => editItem(idx, 'product_name', e.target.value)} />
                  <button onClick={() => removeItem(idx)}
                    style={{ color:'var(--danger)', background:'var(--danger-light)', border:'none', borderRadius:6, padding:'0 10px', cursor:'pointer', fontSize:'0.8rem' }}>✕</button>
                </div>
                {item.alasan && (
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:6, fontStyle:'italic' }}>AI: {item.alasan}</div>
                )}
                <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                  <div style={{ flex:2 }}>
                    <label style={{ fontSize:'0.7rem', color:'var(--text-muted)', display:'block', marginBottom:3 }}>Harga HPP</label>
                    <input className="form-input" type="number" style={{ fontSize:'0.82rem' }}
                      value={item.unit_price} onChange={e => editItem(idx, 'unit_price', e.target.value)} />
                  </div>
                  <div style={{ width:80 }}>
                    <label style={{ fontSize:'0.7rem', color:'var(--text-muted)', display:'block', marginBottom:3 }}>Qty</label>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <button className="qty-btn" onClick={() => editItem(idx, 'qty', Math.max(1, item.qty - 1))}>−</button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn" onClick={() => editItem(idx, 'qty', item.qty + 1)}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', fontWeight:700, color:'var(--accent)', fontSize:'0.88rem', minWidth:80 }}>
                    {rp(item.unit_price * item.qty)}
                  </div>
                </div>
              </div>
            ))}

            <button className="btn btn-ghost btn-sm btn-full" style={{ marginBottom:14, borderStyle:'dashed' }} onClick={addItem}>
              + Tambah Item Manual
            </button>

            {/* Summary & Margin */}
            <div className="card" style={{ marginBottom:14 }}>
              <div className="price-breakdown">
                <div className="price-row"><span>Total HPP (Modal)</span><span style={{ fontWeight:700 }}>{rp(totalHPP)}</span></div>
                <div className="price-row"><span>Margin ({margin}%)</span><span>{rp(hargaJual - totalHPP)}</span></div>
                <div className="price-row total"><span>Harga Jual ke Klien</span><span>{rp(hargaJual)}</span></div>
              </div>
              <div style={{ marginTop:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:4 }}>
                  <span>Margin / Keuntungan</span>
                  <span style={{ fontWeight:700, color:'var(--accent)' }}>{margin}%</span>
                </div>
                <input type="range" min={5} max={70} step={1} value={margin}
                  onChange={e => setMargin(Number(e.target.value))} style={{ width:'100%' }} />
              </div>
            </div>

            {/* Tombol aksi */}
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              <button className="btn btn-primary" style={{ flex:3, padding:'13px', fontSize:'0.88rem' }}
                onClick={() => goToQuotation()}>
                📄 Buat Rincian
              </button>
              <button className="btn btn-ghost" style={{ flex:2, padding:'13px', fontSize:'0.88rem', border:'1.5px solid var(--accent)', color:'var(--accent)' }}
                onClick={saveEstimation}>
                💾 Simpan Estimasi
              </button>
            </div>
          </>
        )}

        {/* ── Tips ─────────────────────────────────────────── */}
        {!result && !analyzing && (
          <div className="card" style={{ background:'var(--accent-light)', border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--accent)', marginBottom:8 }}>💡 Tips Foto Terbaik</div>
            {[
              'Foto booth dari depan, tampak keseluruhan',
              'Foto referensi desain klien atau inspirasi Pinterest',
              'Bisa juga foto booth kompetitor yang ingin ditiru',
              'Tambahkan keterangan untuk hasil lebih akurat',
            ].map((tip, i) => (
              <div key={i} style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:4, paddingLeft:8 }}>• {tip}</div>
            ))}
          </div>
        )}

      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
