import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'E-Izin Santri: SMAIT Ihsanul Fikri',
  description: 'Sistem Perizinan Santri Terpadu SMAIT Ihsanul Fikri Mungkid, Magelang',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'E-Izin IF',
  },
  icons: {
    icon: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#047857',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-zinc-100 text-zinc-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
