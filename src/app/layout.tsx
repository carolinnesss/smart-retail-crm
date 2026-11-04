import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Smart Retail CRM & Kasir POS Sembako',
  description:
    'Sistem kasir pintar toko sembako terintegrasi: harga grosir/eceran otomatis, batas kasbon digital, tabungan pelanggan mandiri, dan prediksi restok EWMA.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
