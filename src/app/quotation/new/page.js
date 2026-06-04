'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createQuotation, saveQuotationImages } from '@/lib/supabase';
import { generateQuotationPDF } from '@/lib/pdf';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function NewQuotationPage() {
  const router = useRouter();
  const [items, setItems]             = useState([]);
  const [totalHPP, setTotalHPP]       = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [clientName, setClientName]   = useState('');
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes]             = useState('');
  const [refImages, setRefImages]     = useState([]); // [{name, data (base64)}]
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState('');
  const fileInputRef                  = useRef(null);

  useEffect(() => {
    const storedItems   = sessionStorage.getItem('calc_items');
    const storedHPP     = sessionStorage.getItem('calc_hpp');
    const storedSelling = sessionStorage.getItem('calc_selling');
    if (storedItems)   setItems(JSON.parse(storedItems));
    if (storedHPP)     setTotalHPP(parseFloat(storedHPP));
    if (storedSelling) setSellingPrice(parseFloat(storedSelling));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRefImages(prev => [...prev, { name: file.name, data: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
    // reset input so same file can be re-added if needed
    e.target.value = '';
  };

  const removeRefImage = (idx) => {
    setRefImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRpInput = (val) => {
    const num = val.replace(/\D/g, '');
    setSellingPrice(parseFloat(num) || 0);
  };

  const laba = sellingPrice - totalHPP;
  const marginPct = sellingPrice > 0 ? ((laba / sellingPrice) * 100).toFixed(1) : 0;

  const handleSave = async () => {
    if (!clientName.trim()) return showToast('⚠️ Isi nama klien terlebih dahulu');
    if (!projectName.trim()) return showToast('⚠️ Isi nama project');
    if (items.length === 0) return showToast('⚠️ Tidak ada item — kembali ke kalkulator');
    setSaving(true);
    try {
      const saved = await createQuotation({ client_name: clientName, project_name: projectName, total_hpp: totalHPP, selling_price: sellingPrice, notes, items });
      // Simpan gambar referensi ke Supabase jika ada
      if (refImages.length > 0 && saved?.id) {
        await saveQuotationImages(saved.id, refImages).catch(() => {});
      }
      sessionStorage.removeItem('calc_items');
      sessionStorage.removeItem('calc_hpp');
      sessionStorage.removeItem('calc_selling');
      showToast('✅ Rincian tersimpan!');
      setTimeout(() => router.push('/quotations'), 1000);
    } catch (e) {
      showToast('❌ Gagal simpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = async () => {
    if (!clientName.trim()) return showToast('⚠️ Isi nama klien terlebih dahulu');
    if (!projectName.trim()) return showToast('⚠️ Isi nama project');
    try {
      showToast('⏳ Membuat PDF...');
      // PDF klien: TIDAK kirim total_hpp & laba — info itu hanya untuk internal app
      await generateQuotationPDF({ client_name: clientName, project_name: projectName, items, selling_price: sellingPrice, notes, refImages });
      showToast('✅ PDF berhasil diunduh!');
    } catch (e) {
      showToast('❌ Gagal buat PDF: ' + e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>📄 Buat Rincian</h1>
            <p>Isi data klien &amp; simpan / export PDF</p>
          </div>
          <button onClick={() => router.back()} style={{ color:'rgba(255,255,255,0.7)', fontSize:'1.5rem', background:'none', border:'none', cursor:'pointer' }}>←</button>
        </div>
      </div>

      <div className="page-body">
        {/* Data Klien */}
        <div className="card" style={{ marginBottom:14 }}>
          <div className="card-title">📋 Data Klien</div>
          <div className="form-group">
            <label className="form-label">Nama Klien / Perusahaan</label>
            <input className="form-input" placeholder="contoh: Joy Cinnamon" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Nama Project / Booth</label>
            <input className="form-input" placeholder="contoh: Booth Portable Joy Cinnamon 120cm" value={projectName} onChange={e => setProjectName(e.target.value)} />
          </div>
        </div>

        {/* Item List */}
        <div className="card" style={{ marginBottom:14 }}>
          <div className="card-title">🔩 Daftar Item ({items.length})</div>
          {items.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'0.9rem' }}>
              Tidak ada item.<br />Kembali ke kalkulator untuk memilih produk.
            </div>
          ) : items.map((item, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border-light)', fontSize:'0.88rem' }}>
              <div>
                <div style={{ fontWeight:500 }}>{item.item_name}</div>
                <div style={{ color:'var(--text-secondary)', fontSize:'0.78rem' }}>
                  {formatRp(item.unit_price)} × {item.qty}
                </div>
              </div>
              <div style={{ fontWeight:700, color:'var(--accent)' }}>{formatRp(item.unit_price * item.qty)}</div>
            </div>
          ))}
        </div>

        {/* Harga */}
        <div className="card" style={{ marginBottom:14 }}>
          <div className="card-title">💰 Harga</div>
          <div className="form-group">
            <label className="form-label">Harga Jual ke Klien</label>
            <input
              className="form-input"
              placeholder={formatRp(totalHPP)}
              defaultValue={sellingPrice ? formatRp(sellingPrice) : ''}
              onChange={e => handleRpInput(e.target.value)}
            />
          </div>
          <div className="price-breakdown">
            <div className="price-row"><span>Total HPP</span><span>{formatRp(totalHPP)}</span></div>
            <div className="price-row total"><span>Harga Jual</span><span>{formatRp(sellingPrice || totalHPP)}</span></div>
            <div className="price-row laba"><span>💰 Potensi Laba</span><span>{formatRp(laba)} ({marginPct}%)</span></div>
          </div>
        </div>

        {/* Catatan */}
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-title">📝 Catatan (opsional)</div>
          <textarea
            className="form-input"
            placeholder="Catatan untuk klien, syarat khusus, dll..."
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize:'none' }}
          />
        </div>

        {/* Referensi Gambar */}
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-title">🖼️ Referensi Desain (opsional)</div>
          <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:10 }}>
            Upload gambar referensi desain klien. Akan muncul di halaman terakhir PDF rincian.
          </p>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display:'none' }}
            onChange={handleImageUpload}
          />

          {/* Upload button */}
          <button
            className="btn btn-ghost btn-full"
            style={{ borderStyle:'dashed', marginBottom: refImages.length > 0 ? 12 : 0 }}
            onClick={() => fileInputRef.current?.click()}
          >
            + Upload Gambar Referensi
          </button>

          {/* Preview grid */}
          {refImages.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
              {refImages.map((img, i) => (
                <div key={i} style={{ position:'relative', borderRadius:6, overflow:'hidden', border:'1px solid var(--border)', aspectRatio:'1' }}>
                  <img
                    src={img.data}
                    alt={img.name}
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  />
                  {/* Remove button */}
                  <button
                    onClick={() => removeRefImage(i)}
                    style={{
                      position:'absolute', top:3, right:3,
                      background:'rgba(0,0,0,0.55)', color:'white',
                      border:'none', borderRadius:'50%',
                      width:20, height:20, fontSize:'0.7rem',
                      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      lineHeight:1,
                    }}
                  >✕</button>
                  <div style={{
                    position:'absolute', bottom:0, left:0, right:0,
                    background:'rgba(0,0,0,0.45)', color:'white',
                    fontSize:'0.62rem', padding:'2px 4px',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>{img.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button className="btn btn-primary btn-lg btn-full" onClick={handlePDF}>
            📄 Preview &amp; Export PDF
          </button>
          <button className="btn btn-secondary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Menyimpan...' : '💾 Simpan ke Riwayat'}
          </button>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
