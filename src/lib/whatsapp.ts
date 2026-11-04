import { formatIDR, formatDate } from './formatters';
import { ITransaction } from './types';

/**
 * Normalizes Indonesian phone numbers into the standard WhatsApp E.164-compatible format: 628xxxxxxxxxx.
 * Handles inputs like:
 * - '0812-3456-7890' -> '6281234567890'
 * - '+62 812 3456 7890' -> '6281234567890'
 * - '6281234567890' -> '6281234567890'
 * - '8123456789' -> '628123456789'
 * - '08... ' with parenthesis, dots, or spaces
 */
export function normalizeIndonesianPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Extract all digit characters
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 8) return '';

  if (digits.startsWith('62')) {
    // If someone entered '6208...', normalize to '628...'
    if (digits.startsWith('620') && digits.length > 10) {
      return '62' + digits.slice(3);
    }
    return digits;
  }

  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }

  // E.g. starts with '812...'
  if (digits.startsWith('8')) {
    return '62' + digits;
  }

  return '62' + digits;
}

/**
 * Sanitizes text for WhatsApp URLs:
 * - Strips dangerous HTML / script injection tokens
 * - Strips control characters
 * - Cleans repetitive newlines
 */
export function sanitizeWhatsAppText(text: string): string {
  if (!text) return '';

  return text
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove ASCII control characters
    .replace(/\n{3,}/g, '\n\n') // Limit max 2 consecutive linebreaks
    .trim();
}

/**
 * Generates an encoded, sanitized WhatsApp Click-to-Chat URL.
 */
export function buildWhatsAppLink(phone: string, rawMessage: string): string {
  const normPhone = normalizeIndonesianPhone(phone);
  if (!normPhone) return '';

  const cleanMessage = sanitizeWhatsAppText(rawMessage);
  return `https://wa.me/${normPhone}?text=${encodeURIComponent(cleanMessage)}`;
}

/**
 * Builds WhatsApp restock outreach message template.
 */
export function buildWhatsAppRestockLink(params: {
  phone: string;
  customerName: string;
  storeName: string;
  commodityName: string;
  daysRemaining: number;
  price: number;
  priceType: 'wholesale' | 'retail';
  suggestedQty: number;
  unit: string;
  ratio?: number;
}): string {
  let urgencyPhrase = '';
  if (params.ratio !== undefined) {
    if (params.ratio >= 1.3) {
      urgencyPhrase = 'diperkirakan sudah habis dan memerlukan pasokan segera';
    } else if (params.ratio >= 1.0) {
      urgencyPhrase = 'diperkirakan sudah menipis dan mendekati habis';
    } else if (params.ratio >= 0.7) {
      urgencyPhrase = 'diperkirakan akan habis dalam beberapa hari ke depan';
    } else {
      urgencyPhrase = 'terpantau masih dalam siklus belanja rutin';
    }
  } else {
    if (params.daysRemaining <= 0) {
      urgencyPhrase = 'diperkirakan sudah habis';
    } else {
      urgencyPhrase = `diperkirakan akan habis dalam ${params.daysRemaining} hari`;
    }
  }

  const priceTypeStr = params.priceType === 'wholesale' ? 'grosir warung' : 'eceran';
  const priceFormatted = formatIDR(params.price);

  const message = `Halo ${params.customerName}, kami dari *${params.storeName}*.\n\nBerdasarkan pantauan siklus belanja sembako Anda, persediaan *${params.commodityName}* ${urgencyPhrase}.\n\nApakah Anda berkenan kami siapkan dan antarkan pesanan restok *${params.suggestedQty} ${params.unit}* dengan penawaran harga ${priceTypeStr} *${priceFormatted}*?\n\nSilakan balas pesan ini untuk konfirmasi pesanan antar. Terima kasih! 🙏`;

  return buildWhatsAppLink(params.phone, message);
}

/**
 * Builds WhatsApp receipt message template.
 */
export function buildReceiptWhatsAppMessage(
  transaction: ITransaction,
  storeName: string = 'Toko Sembako Berkah Mandiri'
): string {
  const itemsText = (transaction.items || [])
    .map(
      (it) =>
        `• ${it.product_name || 'Produk'} (${it.quantity} x ${formatIDR(it.unit_price)}) = ${formatIDR(
          it.subtotal
        )}`
    )
    .join('\n');

  let paymentBreakdown = `• Metode Bayar: ${transaction.payment_method}`;
  if (transaction.payment_method === 'TUNAI') {
    paymentBreakdown += ` (${formatIDR(transaction.final_amount)})`;
    if (transaction.cash_tendered !== undefined) {
      paymentBreakdown += `\n• Uang Diterima: ${formatIDR(transaction.cash_tendered)}\n• Kembalian: ${formatIDR(transaction.change_amount || 0)}`;
    }
  } else if (transaction.payment_method === 'KASBON') {
    paymentBreakdown += ` (${formatIDR(transaction.final_amount)})`;
    if (transaction.due_date) {
      paymentBreakdown += `\n• Jatuh Tempo: ${formatDate(transaction.due_date)}`;
    }
  }

  const discountLine =
    transaction.discount_amount > 0
      ? `\nDiskon Toko: -${formatIDR(transaction.discount_amount)}`
      : '';

  const cashierLine = transaction.cashier_name ? `\nKasir: ${transaction.cashier_name}` : '';

  return `*${storeName.toUpperCase()}*\nNota Pembelian: *${
    transaction.invoice_number
  }*\nTanggal: ${formatDate(transaction.created_at)}\nPelanggan: ${
    transaction.customer_name || 'Pelanggan Umum'
  }${cashierLine}\n\n*Rincian Barang:*\n${itemsText}\n\nSubtotal: ${formatIDR(
    transaction.total_amount
  )}${discountLine}\n*TOTAL AKHIR: ${formatIDR(transaction.final_amount)}*\n\n*Pembayaran:*\n${paymentBreakdown}\n\nTerima kasih atas kunjungan dan kepercayaan Anda berbelanja di warung kami! 🙏`;
}
