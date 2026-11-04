import { normalizeIndonesianPhone } from './whatsapp';

/**
 * Format numeric amount into Indonesian Rupiah currency format.
 * Example: 150000 -> "Rp 150.000"
 */
export function formatIDR(amount: number | null | undefined): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(val)
    .replace(/\u00A0/g, ' ');
}

/**
 * Format date string into readable Indonesian standard format.
 * Example: "2026-11-01T10:30:00Z" -> "1 Nov 2026, 17:30"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Format short date (DD/MM/YYYY)
 */
export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Format time (HH:MM)
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Format decimal quantity with up to 3 decimal places.
 * Example: 1.5 -> "1,5", 0.75 -> "0,75", 2 -> "2"
 */
export function formatDecimalQty(qty: number, unit?: string): string {
  if (isNaN(qty)) return '0';
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(qty);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Normalizes an Indonesian phone number for WhatsApp Click-to-Chat API.
 * Delegates to robust normalizeIndonesianPhone.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string {
  return normalizeIndonesianPhone(phone);
}
