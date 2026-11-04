'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit3, Store, User, Lock } from 'lucide-react';
import { ICustomer, UserRole } from '@/lib/types';
import { formatIDR } from '@/lib/formatters';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: ICustomer | null;
  onSaved: () => void;
}

export function CustomerModal({
  isOpen,
  onClose,
  customer,
  onSaved,
}: CustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<'Warung / Grosir' | 'Eceran'>('Eceran');
  const [maxCreditLimit, setMaxCreditLimit] = useState('1000000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setAddress(customer.address || '');
      setCustomerType(customer.customer_type);
      setMaxCreditLimit(String(customer.max_credit_limit));
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setCustomerType('Eceran');
      setMaxCreditLimit(userRole === 'CASHIER' ? '0' : '1000000');
    }
    setError(null);
  }, [customer, isOpen, userRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Nama dan nomor telepon pelanggan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // If Cashier is editing existing customer, only send non-sensitive fields
    const payload: any = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
    };

    if (userRole === 'OWNER') {
      payload.customer_type = customerType;
      payload.max_credit_limit = parseInt(maxCreditLimit.replace(/\D/g, ''), 10) || 0;
    } else if (!customer) {
      // Cashier registering new customer: fixed to 0 and Eceran
      payload.customer_type = 'Eceran';
      payload.max_credit_limit = 0;
    }

    try {
      const url = customer ? `/api/customers/${customer.id}` : '/api/customers';
      const method = customer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan data pelanggan');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = userRole === 'OWNER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              {customer ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {customer ? 'Edit Data Pelanggan' : 'Daftar Pelanggan Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                {customer
                  ? `Perbarui profil ${customer.name}`
                  : 'Registrasi pelanggan baru toko'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pelanggan / Warung *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Bu Siti (Warung Sejahtera)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor WhatsApp / Telepon *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 0812-3456-7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Domisili / Lokasi Warung
            </label>
            <input
              type="text"
              placeholder="Contoh: Jl. Melati No. 12, RT 03/05"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Customer Type / Pricing Tier */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Klasifikasi / Tipe Pelanggan (Penentuan Harga POS)
              </label>
              {!isOwner && (
                <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" />
                  Khusus Pemilik
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!isOwner}
                onClick={() => setCustomerType('Warung / Grosir')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  customerType === 'Warung / Grosir'
                    ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/30'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                } ${!isOwner ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs">
                  <Store className="w-4 h-4" />
                  <span>Warung / Grosir</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Mendapatkan harga grosir otomatis di kasir.
                </span>
              </button>

              <button
                type="button"
                disabled={!isOwner}
                onClick={() => setCustomerType('Eceran')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  customerType === 'Eceran'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                } ${!isOwner ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <User className="w-4 h-4" />
                  <span>Eceran / Harian</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Mendapatkan harga eceran standar toko.
                </span>
              </button>
            </div>
          </div>

          {/* Credit Limit Setting */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Batas Limit Kredit Kasbon (Max Credit Limit)
              </label>
              <span className="text-xs font-bold text-indigo-700">
                {formatIDR(parseInt(maxCreditLimit.replace(/\D/g, ''), 10) || 0)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                disabled={!isOwner}
                placeholder="1.000.000"
                value={maxCreditLimit}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setMaxCreditLimit(raw);
                }}
                className={`w-full pl-9 pr-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  !isOwner ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {!isOwner
                ? 'Hanya Pemilik Toko (OWNER) yang dapat mengubah plafon limit kredit kasbon.'
                : 'Kasir otomatis menolak transaksi jika total kasbon melebihi nominal ini.'}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Menyimpan...' : customer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
