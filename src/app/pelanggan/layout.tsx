import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Pelanggan Toko Sembako',
  description: 'Akses mandiri cek katalog produk, stok terkini, estimasi belanja, kasbon, dan riwayat belanja.',
};

export default function PelangganLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      <div className="w-full max-w-md md:max-w-[1100px] mx-auto min-h-screen bg-white shadow-xl flex flex-col relative pb-8">
        {children}
      </div>
    </div>
  );
}
