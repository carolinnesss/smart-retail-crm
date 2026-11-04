'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Sliders,
  Store,
  ArrowRight,
  Info,
} from 'lucide-react';
import { IRestockPrediction, RestockUrgencyStatus } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

export default function RestockRadarPage() {
  const [predictions, setPredictions] = useState<IRestockPrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alpha, setAlpha] = useState<number>(0.3);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const loadPredictions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/radar?alpha=${alpha}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPredictions(data.data);
      }
    } catch (err) {
      console.error('Error loading restock predictions', err);
    } finally {
      setIsLoading(false);
    }
  }, [alpha]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  // Filtered Predictions
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.customer_name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.commodity.toLowerCase().includes(q);

      // Category
      const matchCategory =
        selectedCategory === 'all' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();

      // Status
      const matchStatus =
        selectedStatus === 'all' || p.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [predictions, searchQuery, selectedCategory, selectedStatus]);

  // Counts by status
  const counts = useMemo(() => {
    return {
      critical: predictions.filter((p) => p.status === 'CRITICAL').length,
      urgent: predictions.filter((p) => p.status === 'URGENT').length,
      soon: predictions.filter((p) => p.status === 'SOON').length,
      normal: predictions.filter((p) => p.status === 'NORMAL').length,
      total: predictions.length,
    };
  }, [predictions]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 -skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-400/30">
            <Activity className="w-3.5 h-3.5" />
            <span>Radar Konsumsi Sembako Rutin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Radar Prediksi Restok Pelanggan
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-100 leading-relaxed">
            Memantau 5 komoditas pokok (Beras, Minyak Goreng, Gula Pasir, Telur Ayam, Tepung Terigu)
            berdasarkan analisis interval antar pembelian menggunakan metode Exponentially Weighted Moving Average (EWMA).
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
            <div className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-700/50">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Syarat Prediksi: Minimal 3 Riwayat Pembelian</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-700/50">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Parameter Smoothing α: {alpha}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'CRITICAL' ? 'all' : 'CRITICAL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'CRITICAL'
              ? 'bg-rose-50 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Kritis (≥ 1,3)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-900 mt-2">{counts.critical}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Stok diperkirakan habis</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'URGENT' ? 'all' : 'URGENT')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'URGENT'
              ? 'bg-amber-50 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Mendesak (≥ 1,0)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{counts.urgent}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Mendekati habis (1-2 hari)</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'SOON' ? 'all' : 'SOON')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'SOON'
              ? 'bg-yellow-50 border-yellow-500 shadow-sm ring-2 ring-yellow-500/20'
              : 'bg-white border-slate-200 hover:border-yellow-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wider">
              Waspada (≥ 0,7)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          </div>
          <div className="text-2xl font-black text-yellow-900 mt-2">{counts.soon}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Siapkan stok gudang</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'NORMAL' ? 'all' : 'NORMAL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'NORMAL'
              ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Normal (&lt; 0,7)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">{counts.normal}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Stok pelanggan aman</p>
        </button>
      </div>

      {/* Control Bar: Search, Category, Alpha Slider, Refresh */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama warung, pelanggan, atau komoditas..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Commodity Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {['all', 'Beras', 'Minyak Goreng', 'Gula Pasir', 'Telur Ayam', 'Tepung Terigu'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Semua Komoditas' : cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Alpha Slider & Refresh Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Sensitivitas EWMA (α):</span>
            </span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="w-32 accent-emerald-600 cursor-pointer"
            />
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              α = {alpha}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Default: 0.3)
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={loadPredictions}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Predictions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Komoditas Pokok</th>
                <th className="py-3 px-4 text-center">Data Beli</th>
                <th className="py-3 px-4 text-center">Siklus EWMA</th>
                <th className="py-3 px-4">Pembelian Terakhir</th>
                <th className="py-3 px-4 text-center">Rasio / Status</th>
                <th className="py-3 px-4">Aksi WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Menganalisis siklus belanja sembako EWMA...</span>
                  </td>
                </tr>
              ) : filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">
                      Tidak ada prediksi restok yang cocok dengan filter.
                    </p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Catatan: Sesuai aturan, pelanggan memerlukan minimal 3 kali riwayat pembelian untuk suatu komoditas agar prediksi dapat ditampilkan.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((p, idx) => (
                  <tr
                    key={`${p.customer_id}-${p.category}-${idx}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      p.status === 'CRITICAL'
                        ? 'bg-rose-50/20'
                        : p.status === 'URGENT'
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/crm/${p.customer_id}`}
                        className="font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {p.customer_name}
                      </Link>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {p.phone}
                      </div>
                    </td>

                    {/* Commodity */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{p.commodity}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        {p.category}
                      </span>
                    </td>

                    {/* Purchase Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {p.purchase_count}x
                      </span>
                    </td>

                    {/* EWMA Cycle */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-mono font-bold text-slate-900">
                        {p.avg_interval_days} hari
                      </div>
                      <div className="text-[10px] text-slate-400">interval rerata</div>
                    </td>

                    {/* Last Purchase */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 font-medium">
                        {formatDate(p.last_purchased_date)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {p.days_since_last} hari lalu ({p.last_quantity} {p.unit})
                      </div>
                    </td>

                    {/* Ratio & Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'CRITICAL'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : p.status === 'URGENT'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : p.status === 'SOON'
                            ? 'bg-yellow-400 text-slate-900 shadow-sm'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.status} ({p.ratio.toFixed(2)})
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {p.days_remaining <= 0
                          ? 'Habis!'
                          : `Sisa ${p.days_remaining} hari`}
                      </div>
                    </td>

                    {/* WhatsApp Action */}
                    <td className="py-3.5 px-4">
                      {p.wa_link ? (
                        <a
                          href={p.wa_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Tawarkan Restok</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Tanpa No. WA
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
