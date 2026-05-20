'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPw, setShowPw]     = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Isi email dan password.');
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(
        err.message.includes('Invalid login') ? 'Email atau password salah.' :
        err.message.includes('Email not confirmed') ? 'Email belum dikonfirmasi. Cek inbox kamu.' :
        err.message
      );
      setLoading(false);
    }
    // Kalau sukses, AuthProvider otomatis redirect ke /calculator
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #1a2e1a 0%, #2d5a2d 60%, #4a7c59 100%)',
      padding: '24px 20px',
    }}>
      {/* Logo & Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img
          src="/logo-instand.png"
          alt="INSTAND"
          style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 14, display: 'block', margin: '0 auto 14px' }}
          onError={e => e.target.style.display = 'none'}
        />
        <div style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, letterSpacing: 2 }}>INSTAND</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', marginTop: 4 }}>
          Booth Portable Profesional
        </div>
      </div>

      {/* Card login */}
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: '28px 24px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: 6 }}>
          Masuk ke Aplikasi
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 22 }}>
          Khusus tim sales INSTAND
        </div>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '0.85rem',
                }}
              >{showPw ? '🙈' : '👁️'}</button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fee2e2', color: '#b91c1c', borderRadius: 8,
              padding: '10px 12px', fontSize: '0.82rem', marginBottom: 14,
              border: '1px solid #fecaca',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop: 8, padding: '13px', fontSize: '0.95rem', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? '⏳ Masuk...' : '🔐 Masuk'}
          </button>
        </form>

        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
          fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6,
        }}>
          Belum punya akun? Minta admin untuk menambahkan akunmu<br />
          di Supabase Dashboard → Authentication → Users.
        </div>
      </div>

      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginTop: 24 }}>
        © 2025 INSTAND · v1.0
      </div>
    </div>
  );
}
