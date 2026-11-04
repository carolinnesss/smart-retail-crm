'use client';

import React, { useEffect, useState } from 'react';
import { Database, ShieldCheck, Cpu } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function ModeBadge() {
  const [isSupabase, setIsSupabase] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsSupabase(isSupabaseConfigured());
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span>Memeriksa Mode...</span>
      </div>
    );
  }

  if (isSupabase) {
    return (
      <div
        title="Terhubung langsung ke database PostgreSQL Supabase"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Database className="w-3.5 h-3.5" />
        <span>Supabase Database Terhubung</span>
      </div>
    );
  }

  return (
    <div
      title="Mode Demo Zero-Config: State tersimpan di memori & disimulasikan secara penuh"
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-sm"
    >
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <Cpu className="w-3.5 h-3.5" />
      <span>Mode Demo Mock State (Zero-Config)</span>
    </div>
  );
}
