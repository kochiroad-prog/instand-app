'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts } from '@/lib/supabase';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const MARGIN_DEFAULT = 35; // margin default setelah estimasi

// Hitung harga jual dari HPP + margin
const toSell = (hpp, margin) => Math.ceil(hpp / (1 - margin / 100) / 1000) * 1000;

const STEPS = [
  'Membaca gambar booth...',
  'Mengenali komponen & material...',
  'Mencocokkan dengan katalog produk...',
  'Menghitung estimasi harga...',
];

export default function EstimasiPage() {
  const router = useRouter();

  const [imgPreview, setImgPreview]   = useState(null);
  const [imgBase64,  setImgBase64]    = useState(null);
  const [analyzing,  setAnalyzing]    = useState(false);
  const [stepIdx,    setStepIdx]      = useState(0);
  const [result,     setResult]       = useState(null);
  const [items,      setItems]        = useState([]);   // editable items
  const [margin,     setMargin]       = useState(MARGIN_DEFAULT);
  const [error,      setError]        = useState('');
  const [toast,      setToast]        = useState('');
  const fileRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Handle upload gambar ──────────────────────────────────
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgPreview(e.target.result);
      setImgBase64(e.target.result);
      setResult(null);
      setItems([]);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Analisa gambar via AI ─────────────────────────────────
  const handleAnalyze = async () => {
    if (!imgBase64) return showToast('Upload gambar dulu');
    setAnalyzing(true);
    setStepIdx(0);
    setError('');
    setResult(null);

    // Animasi step loading
    let idx = 0;
    const stepTimer = setInterval(() => {
      idx++;
      if (idx < STEPS.length) setStepIdx(idx);
    }, 1200);

    try {
      // Fetch produk aktif dari Supabase
      const products = await getProducts();

      // Panggil API route
      const res = await fetch('/api/estimate-booth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imgBase64, products }),
      });

      const data = await res.json();
      clearInterval(stepTimer);

      if (!res.ok || data.error) {
        setError((data.error || 'Gagal menganalisa gambar') + (data.detail ? ' — ' + data.detail.slice(0, 200) : ''));
        return;
      }

      setResult(data);
      setItems(
        (data.items || []).map(i => ({
          ...i,
          qty: Number(i.qty) || 1,
          unit_price: Number(i.unit_price) || 0,
        }))
      );
    } catch (err) {
      clearInterval(stepTimer);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Edit item ─────────────────────────────────────────────
  const editItem = (idx, field, val) => {
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, [field]: field === 'qty' || field === 'unit_price' ? (parseFloat(val) || 0) : val } : it
    ));
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const addItem = () => setItems(prev => [...prev, {
    product_id: null, product_name: 'Item Baru', qty: 1, unit_price: 0, unit: 'pcs', alasan: '',
  }]);

  // ── Kalkulasi total ───────────────────────────────────────
  const totalHPP  = items.reduce((s, i) => s + (i.unit_price * i.qty), 0);
  const hargaJual = toSell(totalHPP, margin);

  // ── Kirim ke Kalkulator (isi sessionStorage) ──────────────
  const goToQuotation = () => {
    if (!items.length) return showToast('Tidak ada item untuk dibuatkan penawaran');

    // Format sesuai yang dibaca oleh /quotation/new (field item_name)
    const cartItems = items.map(i => ({
      item_name:  i.product_name,
      unit_price: i.unit_price,
      qty:        i.qty,
      unit:       i.unit || 'pcs',
    }));

    // Simpan ke sessionStorage (sama format dengan kalkulator)
    sessionStorage.setItem('calc_items',   JSON.stringify(cartItems));
    sessionStorage.setItem('calc_hpp',     String(totalHPP));
    sessionStorage.setItem('calc_selling', String(hargaJual));

    router.push('/quotation/new');
  };

  const confidenceColor = {
    tinggi:  '#15803d',
    sedang:  '#b45309',
    rendah:  '#b91c1c',
  };

  return (
    <div>
      <div className="page-header">
        <h1>🤖 AI Estimasi Harga Booth</h1>
        <p>Upload foto booth → AI deteksi komponen → estimasi harga otomatis</p>
      </div>

      <div className="page-body">

        {/* ── Upload area ─────────────────────────────────── */}
        <div
          className="card"
          style={{
            marginBottom: 14,
            border: imgPreview ? '2px solid var(--accent)' : '2px dashed var(--border)',
            cursor: 'pointer',
            padding: imgPreview ? 0 : '24px 16px',
            overflow: 'hidden',
          }}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !imgPreview && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />

          {imgPreview ? (
            <div style={{ position: 'relative' }}>
              <img
                src={imgPreview}
                alt="booth"
                style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'contain', background: '#f8fdf9' }}
              />
              <button
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.55)', color: 'white',
                  border: 'none', borderRadius: '50%',
                  width: 28, height: 28, fontSize: '0.85rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onClick={e => {
                  e.stopPropagation();
                  setImgPreview(null); setImgBase64(null);
                  setResult(null); setItems([]); setError('');
                }}
              >✕</button>
              <button
                style={{
                  position: 'absolute', bottom: 8, right: 8,
                  background: 'rgba(255,255,255,0.85)', color: 'var(--accent)',
                  border: '1px solid var(--accent)', borderRadius: 8,
                  padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              >
                Ganti Foto
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏪</div>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>Upload Foto Booth</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Tap untuk pilih foto, atau drag & drop
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Foto booth klien, referensi desain, atau katalog kompetitor
              </div>
            </div>
          )}
        </div>

        {/* ── Tombol Analisa ───────────────────────────────── */}
        {imgPreview && !analyzing && !result && (
          <button
            className="btn btn-primary btn-full"
            style={{ marginBottom: 14, padding: '14px', fontSize: '1rem' }}
            onClick={handleAnalyze}
          >
            🤖 Analisa & Estimasi Harga
          </button>
        )}

        {/* ── Loading state ─────────────────────────────────── */}
        {analyzing && (
          <div className="card" style={{ marginBottom: 14, textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ marginBottom: 16 }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32, borderWidth: 3 }} />
              <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem', marginBottom: 4 }}>
                AI sedang menganalisa booth...
              </div>
            </div>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 0', fontSize: '0.82rem',
                color: i < stepIdx ? 'var(--accent)' : i === stepIdx ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: i === stepIdx ? 700 : 400,
              }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {i < stepIdx ? '✅' : i === stepIdx ? '⏳' : '○'}
                </span>
                {step}
              </div>
            ))}
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div style={{
            marginBottom: 14, padding: '12px 14px',
            background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
            color: '#b91c1c', fontSize: '0.85rem',
          }}>
            ❌ {error}
            {error.includes('OPENROUTER_API_KEY') && (
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#7f1d1d' }}>
                Tambahkan OPENROUTER_API_KEY di Vercel → Settings → Environment Variables
              </div>
            )}
          </div>
        )}

        {/* ── Hasil Analisa ─────────────────────────────────── */}
        {result && !analyzing && (
          <>
            {/* Info analisa */}
            <div className="card" style={{ marginBottom: 10, borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent)' }}>
                  🔍 Hasil Analisa AI
                </div>
                {result.confidence && (
                  <span style={{
                    background: `${confidenceColor[result.confidence]}22`,
                    color: confidenceColor[result.confidence],
                    fontSize: '0.72rem', fontWeight: 700,
                    padding: '2px 8px', borderRadius: 12,
                  }}>
                    Keyakinan: {result.confidence}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: result.catatan ? 8 : 0 }}>
                {result.analisis}
              </div>
              {result.catatan && (
                <div style={{
                  marginTop: 8, padding: '8px 10px',
                  background: 'var(--accent-light)', borderRadius: 6,
                  fontSize: '0.78rem', color: 'var(--text-secondary)',
                }}>
                  💡 {result.catatan}
                </div>
              )}
            </div>

            {/* Re-analisa */}
            <button
              className="btn btn-ghost btn-sm btn-full"
              style={{ marginBottom: 12 }}
              onClick={handleAnalyze}
            >
              🔄 Analisa Ulang
            </button>

            {/* Items editable */}
            <div style={{
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
            }}>
              Item Estimasi ({items.length}) — bisa diedit
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="card" style={{ marginBottom: 6, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    value={item.product_name}
                    onChange={e => editItem(idx, 'product_name', e.target.value)}
                  />
                  <button
                    style={{
                      color: 'var(--danger)', background: 'var(--danger-light)',
                      border: 'none', borderRadius: 6, padding: '0 10px',
                      cursor: 'pointer', fontSize: '0.8rem',
                    }}
                    onClick={() => removeItem(idx)}
                  >✕</button>
                </div>

                {item.alasan && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>
                    AI: {item.alasan}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Harga HPP</label>
                    <input
                      className="form-input"
                      type="number"
                      style={{ fontSize: '0.82rem' }}
                      value={item.unit_price}
                      onChange={e => editItem(idx, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div style={{ width: 80 }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Qty</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button className="qty-btn" onClick={() => editItem(idx, 'qty', Math.max(1, item.qty - 1))}>−</button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn" onClick={() => editItem(idx, 'qty', item.qty + 1)}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontSize: '0.88rem', minWidth: 80 }}>
                    {rp(item.unit_price * item.qty)}
                  </div>
                </div>
              </div>
            ))}

            <button
              className="btn btn-ghost btn-sm btn-full"
              style={{ marginBottom: 14, borderStyle: 'dashed' }}
              onClick={addItem}
            >
              + Tambah Item Manual
            </button>

            {/* ── Summary & Margin ───────────────────────── */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Total HPP (Modal)</span>
                  <span style={{ fontWeight: 700 }}>{rp(totalHPP)}</span>
                </div>
                <div className="price-row">
                  <span>Margin ({margin}%)</span>
                  <span>{rp(hargaJual - totalHPP)}</span>
                </div>
                <div className="price-row total">
                  <span>Harga Jual ke Klien</span>
                  <span>{rp(hargaJual)}</span>
                </div>
              </div>

              {/* Margin slider */}
              <div style={{ marginTop: 14 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4,
                }}>
                  <span>Margin / Keuntungan</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{margin}%</span>
                </div>
                <input
                  type="range" min={5} max={70} step={1}
                  value={margin}
                  onChange={e => setMargin(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span>5%</span><span>70%</span>
                </div>
              </div>
            </div>

            {/* ── Tombol buat penawaran ─────────────────── */}
            <button
              className="btn btn-primary btn-full"
              style={{ padding: '14px', fontSize: '0.95rem', marginBottom: 20 }}
              onClick={goToQuotation}
            >
              📄 Buat Penawaran dari Estimasi Ini
            </button>
          </>
        )}

        {/* ── Tips ────────────────────────────────────────── */}
        {!result && !analyzing && (
          <div className="card" style={{ background: 'var(--accent-light)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', marginBottom: 8 }}>
              💡 Tips Foto Terbaik
            </div>
            {[
              'Foto booth dari depan, tampak keseluruhan',
              'Foto referensi desain klien atau inspirasi Pinterest',
              'Bisa juga foto booth kompetitor yang ingin ditiru',
              'Semakin jelas detailnya, semakin akurat estimasinya',
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8 }}>
                • {tip}
              </div>
            ))}
          </div>
        )}

      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
