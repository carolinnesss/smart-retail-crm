'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Calendar, LogOut, KeyRound, User, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { ModeBadge } from './ModeBadge';
import { IUserProfile } from '@/lib/types';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [userProfile, setUserProfile] = useState<IUserProfile | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        new Intl.DateTimeFormat('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(now)
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000 * 30);

    // Fetch user profile
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setUserProfile(data.profile);
          // If staff/owner, check for pending customer approvals
          if (data.profile.role === 'CASHIER' || data.profile.role === 'OWNER') {
            fetch('/api/approvals')
              .then((r) => r.json())
              .then((apprData) => {
                if (apprData.success && Array.isArray(apprData.pending_accounts)) {
                  setPendingApprovalsCount(apprData.pending_accounts.length);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-600 rounded-lg lg:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Toggle Navigation Sidebar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              Toko Sembako Oline
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Pusat Grosir & Eceran Sembako Digital
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {pendingApprovalsCount > 0 && (
          <Link
            href="/persetujuan"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold shadow-sm shadow-amber-500/20 hover:bg-amber-600 transition animate-pulse"
            title="Ada pendaftaran akun pelanggan yang butuh persetujuan"
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Persetujuan Akun</span>
            <span className="px-1.5 py-0.2 bg-white text-amber-800 text-[11px] font-black rounded-full">
              {pendingApprovalsCount}
            </span>
          </Link>
        )}

        {currentDateTime && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateTime}</span>
          </div>
        )}

        <ModeBadge />

        {/* User Profile Badge & Actions */}
        {userProfile && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-800 leading-none">
                {userProfile.full_name}
              </span>
              <span className="text-[10px] font-extrabold uppercase mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                PEMILIK (OWNER)
              </span>
            </div>

            <Link
              href="/change-password"
              title="Ganti Kata Sandi"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <KeyRound className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Keluar (Logout)"
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
