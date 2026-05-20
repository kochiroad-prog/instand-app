'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Cek sesi yang sudah ada
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session && pathname !== '/login') {
        router.replace('/login');
      }
    });

    // Dengarkan perubahan auth (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session && pathname !== '/login') {
        router.replace('/login');
      }
      if (session && pathname === '/login') {
        router.replace('/calculator');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  // Saat loading awal, tampilkan spinner
  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Memeriksa sesi...</div>
        </div>
      </div>
    );
  }

  // Halaman login tidak butuh proteksi
  if (pathname === '/login') return <>{children}</>;

  // Kalau belum login, jangan render apapun (router.replace sudah dipanggil)
  if (!user) return null;

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
