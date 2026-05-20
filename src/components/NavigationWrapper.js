'use client';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

// Sembunyikan BottomNav di halaman login
export default function NavigationWrapper() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <BottomNav />;
}
