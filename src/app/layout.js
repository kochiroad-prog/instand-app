import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import NavigationWrapper from '@/components/NavigationWrapper';

export const metadata = {
  title: 'INSTAND — Kalkulator Booth Portable',
  description: 'Aplikasi sales INSTAND untuk hitung harga & buat rincian PDF',
  manifest: '/manifest.json',
  themeColor: '#1a1a2e',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'INSTAND',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthProvider>
          <div className="page">
            {children}
          </div>
          <NavigationWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
