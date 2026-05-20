'use client';
import { useState, useEffect } from 'react';
import { getDashboardStats } from '@/lib/supabase';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const formatRp = (n) => {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'jt';
  if (n >= 1_000)     return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.name.includes('Revenue') || p.name.includes('Laba') ? formatRp(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="page-header"><h1>📊 Dashboard</h1><p>Analitik penjualan</p></div>
      <div className="loading"><div className="spinner" /><span>Memuat data...</span></div>
    </div>
  );

  const { total, totalRevenue, totalHPP, totalLaba, accepted, monthly } = stats || {};
  const marginPct = totalRevenue > 0 ? ((totalLaba / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>📊 Dashboard</h1>
        <p>Analitik penawaran &amp; penjualan</p>
      </div>

      <div className="page-body">

        {/* Stat cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{total || 0}</div>
            <div className="stat-label">Total Penawaran</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-value">{formatRp(totalRevenue || 0)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{formatRp(totalLaba || 0)}</div>
            <div className="stat-label">Total Laba</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{marginPct}%</div>
            <div className="stat-label">Avg Margin</div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card" style={{ gridColumn:'span 1' }}>
            <div className="stat-value">{accepted || 0}</div>
            <div className="stat-label">✅ Diterima</div>
          </div>
          <div className="stat-card" style={{ gridColumn:'span 1' }}>
            <div className="stat-value">{total - accepted || 0}</div>
            <div className="stat-label">🔄 Proses</div>
          </div>
        </div>

        {/* Revenue & Laba chart */}
        {monthly?.length > 0 ? (
          <>
            <div className="card" style={{ marginBottom:14 }}>
              <div className="card-title">📈 Revenue vs Laba (6 Bulan)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly} margin={{ top:5, right:10, left:0, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize:10 }} />
                  <YAxis tickFormatter={v => formatRp(v)} tick={{ fontSize:9 }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#1a1a2e" radius={[4,4,0,0]} />
                  <Bar dataKey="laba"    name="Laba"    fill="#f97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title">📊 Jumlah Penawaran per Bulan</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={monthly} margin={{ top:5, right:10, left:0, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize:10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize:10 }} width={25} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="penawaran" name="Penawaran" stroke="#f97316" strokeWidth={2.5} dot={{ r:4, fill:'#f97316' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Belum ada data untuk ditampilkan</div>
            <div className="empty-state-sub">Buat penawaran pertama Anda untuk melihat grafik</div>
          </div>
        )}
      </div>
    </div>
  );
}
