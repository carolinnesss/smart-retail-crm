'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Store,
  Layers,
  Activity,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole>('CASHIER');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile?.role) {
          setUserRole(data.profile.role);
        }
      })
      .catch(() => {});
  }, []);

  const allNavItems = [
    {
      name: 'Smart Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'KPI Finansial & Omzet',
      ownerOnly: true,
    },
    {
      name: 'Kasir POS Pintar',
      href: '/pos',
      icon: ShoppingCart,
      description: 'Grosir/Eceran & Split Payment',
      ownerOnly: false,
    },
    {
      name: 'CRM & Buku Kasbon',
      href: '/crm',
      icon: Users,
      description: 'Pelanggan, Tabungan & Utang',
      ownerOnly: false,
    },
    {
      name: 'Persetujuan Pelanggan',
      href: '/persetujuan',
      icon: UserCheck,
      description: 'Verifikasi Akun Mandiri',
      ownerOnly: true,
    },
    {
      name: 'Radar Restok EWMA',
      href: '/radar',
      icon: Activity,
      description: '5 Komoditas & Outreach WA',
      ownerOnly: true,
    },
    {
      name: 'Inventaris Sembako',
      href: '/inventory',
      icon: Package,
      description: 'Katalog 30 SKU & Stok Gudang',
      ownerOnly: true,
    },
    {
      name: 'Audit Log',
      href: '/audit',
      icon: FileText,
      description: 'Jejak Perubahan Sensitif',
      ownerOnly: true,
    },
  ];

  const visibleNavItems = allNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold shadow-md">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wide text-white block">
                SMART POS & CRM
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                Warung Sembako Modern
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Menu Operasional</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              PEMILIK (OWNER)
            </span>
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mt-0.5 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold">{item.name}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Store Metadata Card */}
        <div className="p-3 border-t border-slate-800">
          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 mb-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Sistem Terlindungi
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Autentikasi Sesi, Pembagian Peran RBAC & Double-Entry Ledger.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
