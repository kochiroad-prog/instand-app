'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/calculator', icon: '🧮', label: 'Kalkulator' },
  { href: '/pricelist',  icon: '📦', label: 'Pricelist'  },
  { href: '/quotations', icon: '📄', label: 'Penawaran'  },
  { href: '/dashboard',  icon: '📊', label: 'Dashboard'  },
  { href: '/settings',   icon: '⚙️', label: 'Kelola'     },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {navItems.map(({ href, icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
