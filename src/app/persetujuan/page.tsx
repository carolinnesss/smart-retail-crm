'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserX,
  Clock,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Link as LinkIcon,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface PendingAccount {
  id: string;
  name: string;
  whatsapp_number: string;
  status: 'PENDING';
  created_at: string;
}

interface ExistingCustomer {
  id: string;
  name: string;
  whatsapp_number: string;
  customer_type: string;
  total_debt: number;
}

export default function OwnerApprovalsPage() {
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Approval modal state
  const [selectedAccountForApprove, setSelectedAccountForApprove] = useState<PendingAccount | null>(null);
  const [approvalMode, setApprovalMode] = useState<'CREATE_NEW' | 'LINK_EXISTING'>('CREATE_NEW');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // Rejection modal state
  const [selectedAccountForReject, setSelectedAccountForReject] = useState<PendingAccount | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/approvals');
      const data = await res.json();
      if (data.success) {
        setPendingAccounts(data.pending_accounts || []);
        setExistingCustomers(data.existing_customers || []);
      } else {
        setError(data.error || 'Gagal memuat antrean persetujuan.');
      }
    } catch {
      setError('Gagal memuat antrean persetujuan dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async () => {
    if (!selectedAccountForApprove) return;

    if (approvalMode === 'LINK_EXISTING' && !selectedCustomerId) {
      alert('Pilih pelanggan yang akan dihubungkan terlebih dahulu.');
      return;
    }

    setSubmittingApprove(true);
    setError(null);

    try {
      const res = await fetch('/api/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountForApprove.id,
          mode: approvalMode,
          existing_customer_id: approvalMode === 'LINK_EXISTING' ? selectedCustomerId : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menyetujui akun pelanggan.');
        setSubmittingApprove(false);
        return;
      }

      setSuccessMessage(
        `Akun ${selectedAccountForApprove.name} berhasil disetujui (${
          approvalMode === 'CREATE_NEW' ? 'Dibuat Pelanggan Baru Eceran' : 'Dihubungkan ke CRM'
        }).`
      );
      setSelectedAccountForApprove(null);
      setSelectedCustomerId('');
      fetchApprovals();
    } catch {
      setError('Terjadi kesalahan saat memproses persetujuan.');
    } finally {
      setSubmittingApprove(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAccountForReject) return;

    if (!rejectionReason.trim()) {
      alert('Alasan penolakan wajib diisi untuk transparansi kepada pelanggan.');
      return;
    }

    setSubmittingReject(true);
    setError(null);

    try {
      const res = await fetch('/api/approvals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountForReject.id,
          rejection_reason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menolak akun pelanggan.');
        setSubmittingReject(false);
        return;
      }

      setSuccessMessage(`Pendaftaran akun ${selectedAccountForReject.name} telah ditolak.`);
      setSelectedAccountForReject(null);
      setRejectionReason('');
      fetchApprovals();
    } catch {
      setError('Terjadi kesalahan saat memproses penolakan.');
    } finally {
      setSubmittingReject(false);
    }
  };

  const filteredCustomers = existingCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.whatsapp_number.includes(customerSearch)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verifikasi Akun Pelanggan</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Antrean Persetujuan Pelanggan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Khusus Pemilik Toko (Owner) untuk menyetujui akun pelanggan mandiri atau menghubungkannya ke profil toko.
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Antrean</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Pending List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Menunggu Persetujuan</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold">
              {pendingAccounts.length}
            </span>
          </h2>
          <span className="text-xs text-slate-400">
            Pendaftaran baru otomatis berstatus PENDING
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
            <span>Memeriksa antrean pendaftaran...</span>
          </div>
        ) : pendingAccounts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada antrean tertunda</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Semua pendaftaran pelanggan mandiri telah diverifikasi atau belum ada pendaftaran baru.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingAccounts.map((account) => (
              <div
                key={account.id}
                className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{account.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {account.whatsapp_number}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(account.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center">
                  <button
                    onClick={() => {
                      setSelectedAccountForReject(account);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAccountForApprove(account);
                      setApprovalMode('CREATE_NEW');
                      setSelectedCustomerId('');
                      setCustomerSearch('');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Setujui Akun</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {selectedAccountForApprove && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">
                  Setujui Pendaftaran Pelanggan
                </h3>
                <button
                  onClick={() => setSelectedAccountForApprove(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold"
                >
                  &times;
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pendaftar: <strong>{selectedAccountForApprove.name}</strong> ({selectedAccountForApprove.whatsapp_number})
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs font-semibold text-slate-700">
                Wajib Memilih Opsi Integrasi Profil CRM:
              </p>

              {/* Radio 1: Create New Customer */}
              <label
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  approvalMode === 'CREATE_NEW'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="approvalMode"
                  value="CREATE_NEW"
                  checked={approvalMode === 'CREATE_NEW'}
                  onChange={() => setApprovalMode('CREATE_NEW')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-sm text-slate-900">
                      Buat Pelanggan Baru di CRM
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Sistem akan otomatis membuat profil baru bertipe <strong>Eceran</strong> dengan batas plafon kasbon <strong>Rp 0</strong>. (Hanya Owner yang dapat mengubah plafon).
                  </p>
                </div>
              </label>

              {/* Radio 2: Link Existing Customer */}
              <label
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  approvalMode === 'LINK_EXISTING'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="approvalMode"
                  value="LINK_EXISTING"
                  checked={approvalMode === 'LINK_EXISTING'}
                  onChange={() => setApprovalMode('LINK_EXISTING')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-sm text-slate-900">
                      Hubungkan ke Pelanggan yang Sudah Ada
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Hubungkan akun portal mandiri ini ke data pelanggan sembako yang sudah terdaftar di buku pelanggan toko.
                  </p>
                </div>
              </label>

              {/* Dropdown list if LINK_EXISTING */}
              {approvalMode === 'LINK_EXISTING' && (
                <div className="pl-7 space-y-2 pt-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Cari nama atau nomor HP pelanggan..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Tidak ada pelanggan yang cocok.
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => setSelectedCustomerId(cust.id)}
                          className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            selectedCustomerId === cust.id
                              ? 'bg-emerald-100/70 font-bold text-emerald-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <span>{cust.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {cust.whatsapp_number}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {cust.customer_type}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedAccountForApprove(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                disabled={submittingApprove || (approvalMode === 'LINK_EXISTING' && !selectedCustomerId)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {submittingApprove ? 'Memproses...' : 'Konfirmasi Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedAccountForReject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-rose-900">
                  Tolak Pendaftaran Pelanggan
                </h3>
                <button
                  onClick={() => setSelectedAccountForReject(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold"
                >
                  &times;
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pendaftar: <strong>{selectedAccountForReject.name}</strong> ({selectedAccountForReject.whatsapp_number})
              </p>
            </div>

            <div className="p-6 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Alasan Penolakan <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Nomor tidak valid, bukan pelanggan toko sembako ini, atau data tidak lengkap."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Alasan ini akan ditampilkan kepada pelanggan saat mencoba masuk dan mereka dapat melakukan pendaftaran ulang dengan data yang benar.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedAccountForReject(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={submittingReject || !rejectionReason.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {submittingReject ? 'Memproses...' : 'Tolak Pendaftaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
