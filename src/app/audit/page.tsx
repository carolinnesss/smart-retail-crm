'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  Search,
  Clock,
  User,
  Activity,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface AuditLogItem {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const url = actionFilter
          ? `/api/audit-log?action=${encodeURIComponent(actionFilter)}`
          : '/api/audit-log';
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.success) {
          setLogs(data.data || []);
        } else {
          setError(data.error || 'Gagal memuat rekam jejak audit.');
        }
      } catch {
        setError('Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'UPDATE_CREDIT_LIMIT':
        return { label: 'Limit Kasbon', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'UPDATE_PRODUCT_PRICE':
        return { label: 'Harga Produk', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'SAVINGS_WITHDRAWAL':
        return { label: 'Tarik Tabungan', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'USER_CREATE':
        return { label: 'Buat Kasir', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'USER_ROLE_CHANGE':
        return { label: 'Ubah Peran', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'USER_STATUS_CHANGE':
        return { label: 'Status Akun', color: 'bg-slate-100 text-slate-800 border-slate-200' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.actor_name || '').toLowerCase().includes(q) ||
      JSON.stringify(log.new_value || {}).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-600" />
            <span>Audit Log & Jejak Aktivitas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekam jejak tidak dapat diubah (append-only) untuk perubahan harga, plafon kredit, dan penarikan tabungan (Khusus OWNER)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktor, perubahan harga, atau nama pelanggan..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Aksi</option>
            <option value="UPDATE_CREDIT_LIMIT">Limit Kasbon</option>
            <option value="UPDATE_PRODUCT_PRICE">Harga Produk</option>
            <option value="SAVINGS_WITHDRAWAL">Tarik Tabungan</option>
            <option value="USER_CREATE">Buat Kasir</option>
            <option value="USER_STATUS_CHANGE">Status Akun</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 sm:px-6">Waktu & Aktor</th>
                <th className="py-3 px-4">Jenis Aksi</th>
                <th className="py-3 px-4 sm:px-6">Rincian Perubahan (Sebelum vs Sesudah)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    Memuat audit log...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    Tidak ada catatan audit yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-4 sm:px-6 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mt-1">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{log.actor_name || 'Oline (Pemilik)'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-4 px-4 sm:px-6 align-top">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs font-mono space-y-1">
                          {log.old_value && (
                            <div className="text-rose-700 flex items-start gap-1">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-rose-500">
                                Sebelum:
                              </span>
                              <span className="break-all">
                                {JSON.stringify(log.old_value)}
                              </span>
                            </div>
                          )}
                          {log.new_value && (
                            <div className="text-emerald-800 flex items-start gap-1">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600">
                                Sesudah:
                              </span>
                              <span className="break-all font-semibold">
                                {JSON.stringify(log.new_value)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
