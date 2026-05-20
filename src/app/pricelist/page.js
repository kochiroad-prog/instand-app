'use client';
import { useState, useEffect } from 'react';
import { getProductsByCategory } from '@/lib/supabase';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const PACKAGES = [
  {
    name: 'Paket 100cm',
    price: 3537000,
    items: [
      { name: 'Portable Booth 100x50cm - PINK', price: 2612000, qty: 1 },
      { name: 'Tiang Single + Logo Bulat',       price: 250000,  qty: 1 },
      { name: 'Sticker 120x80cm',                price: 175000,  qty: 1 },
      { name: 'Wingside',                        price: 250000,  qty: 2 },
    ],
  },
  {
    name: 'Paket 120cm',
    price: 4325000,
    items: [
      { name: 'Portable Booth 120x50cm - PINK', price: 3400000, qty: 1 },
      { name: 'Tiang Single + Logo Bulat',       price: 250000,  qty: 1 },
      { name: 'Sticker 120x80cm',                price: 175000,  qty: 1 },
      { name: 'Wingside',                        price: 250000,  qty: 2 },
    ],
  },
  {
    name: 'Paket 150cm',
    price: 5113000,
    items: [
      { name: 'Portable Booth 150x50cm - PINK', price: 4188000, qty: 1 },
      { name: 'Tiang Single + Logo Bulat',       price: 250000,  qty: 1 },
      { name: 'Sticker 120x80cm',                price: 175000,  qty: 1 },
      { name: 'Wingside',                        price: 250000,  qty: 2 },
    ],
  },
];

export default function PricelistPage() {
  const [addons, setAddons]       = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('package');

  useEffect(() => {
    Promise.all([
      getProductsByCategory('addon'),
      getProductsByCategory('material'),
    ]).then(([ads, mats]) => {
      setAddons(ads);
      setMaterials(mats);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>📦 Pricelist</h1>
        <p>Paket standar &amp; daftar komponen</p>
      </div>

      <div className="page-body">
        <div className="tab-bar">
          {[['package','📦 Paket'],['addon','🔩 Add-on'],['material','🧱 Bahan']].map(([key,lbl]) => (
            <button key={key} className={`tab-btn${activeTab===key?' active':''}`} onClick={() => setActiveTab(key)}>{lbl}</button>
          ))}
        </div>

        {/* Paket Standar */}
        {activeTab === 'package' && PACKAGES.map((pkg, i) => (
          <div key={i} className="package-card">
            <div className="package-header">
              <div className="package-name">{pkg.name}</div>
              <div className="package-price">{formatRp(pkg.price)}</div>
            </div>
            <div className="package-body">
              {pkg.items.map((item, j) => (
                <div key={j} className="package-item">
                  <span className="package-item-name">{item.name} {item.qty > 1 ? `(×${item.qty})` : ''}</span>
                  <span className="package-item-price">{formatRp(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="package-cta">
              <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:8 }}>
                Harga termasuk booth + tiang + sticker + 2 wingside
              </div>
            </div>
          </div>
        ))}

        {/* Add-ons */}
        {activeTab === 'addon' && (
          loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <>
              <div className="section-label">Komponen Tambahan</div>
              {addons.map(p => (
                <div key={p.id} className="list-item" style={{ cursor:'default' }}>
                  <div className="list-item-left">
                    <div className="list-item-title">{p.name}</div>
                    <div className="list-item-sub">per {p.unit}</div>
                  </div>
                  <div className="list-item-right">
                    <div className="list-item-price">{formatRp(p.unit_price)}</div>
                  </div>
                </div>
              ))}
            </>
          )
        )}

        {/* Bahan Baku */}
        {activeTab === 'material' && (
          loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <>
              <div className="section-label">Bahan Baku</div>
              {materials.map(p => (
                <div key={p.id} className="list-item" style={{ cursor:'default' }}>
                  <div className="list-item-left">
                    <div className="list-item-title">{p.name}</div>
                    <div className="list-item-sub">per {p.unit}</div>
                  </div>
                  <div className="list-item-right">
                    <div className="list-item-price">{formatRp(p.unit_price)}</div>
                  </div>
                </div>
              ))}
            </>
          )
        )}
      </div>
    </div>
  );
}
