import { describe, it, expect } from 'vitest';
import {
  normalizeIndonesianPhone,
  sanitizeWhatsAppText,
  buildWhatsAppLink,
  buildWhatsAppRestockLink,
  buildReceiptWhatsAppMessage,
} from '@/lib/whatsapp';
import { ITransaction } from '@/lib/types';

describe('WhatsApp Integration & Phone Normalization', () => {
  describe('1. Indonesian Phone Number Normalization', () => {
    it('normalizes local leading zero format: 081234567890 -> 6281234567890', () => {
      expect(normalizeIndonesianPhone('081234567890')).toBe('6281234567890');
    });

    it('normalizes standard international format with plus: +6281234567890 -> 6281234567890', () => {
      expect(normalizeIndonesianPhone('+6281234567890')).toBe('6281234567890');
    });

    it('preserves clean international format: 6281234567890 -> 6281234567890', () => {
      expect(normalizeIndonesianPhone('6281234567890')).toBe('6281234567890');
    });

    it('handles dashes, spaces, and parenthesis: (0812) 345-678-90 -> 6281234567890', () => {
      expect(normalizeIndonesianPhone('(0812) 345-678-90')).toBe('6281234567890');
    });

    it('handles numbers starting directly with 8: 81234567890 -> 6281234567890', () => {
      expect(normalizeIndonesianPhone('81234567890')).toBe('6281234567890');
    });

    it('fixes typo with redundant zero after 62: +62081234567890 -> 6281234567890', () => {
      expect(normalizeIndonesianPhone('+62081234567890')).toBe('6281234567890');
    });

    it('returns empty string for invalid or short numbers', () => {
      expect(normalizeIndonesianPhone('')).toBe('');
      expect(normalizeIndonesianPhone(null)).toBe('');
      expect(normalizeIndonesianPhone('1234')).toBe('');
      expect(normalizeIndonesianPhone('abc')).toBe('');
    });
  });

  describe('2. Text Sanitization & Link Building', () => {
    it('strips dangerous HTML tags from text', () => {
      const malicious = 'Halo <script>alert("hack")</script><b>Bu Siti</b>';
      const clean = sanitizeWhatsAppText(malicious);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('</script>');
      expect(clean).toBe('Halo alert("hack")Bu Siti');
    });

    it('removes ASCII control characters', () => {
      const textWithControl = 'Pesan\u0000 restok\u0007 sembako';
      const clean = sanitizeWhatsAppText(textWithControl);
      expect(clean).toBe('Pesan restok sembako');
    });

    it('properly URL-encodes messages in WhatsApp click-to-chat links', () => {
      const link = buildWhatsAppLink('0812-3456-7890', 'Halo Warung Bu Siti & Toko!');
      expect(link.startsWith('https://wa.me/6281234567890?text=')).toBe(true);
      expect(link).toContain(encodeURIComponent('Halo Warung Bu Siti & Toko!'));
    });
  });

  describe('3. Restock Outreach Message Template', () => {
    it('generates personalized restock outreach message with wholesale price', () => {
      const link = buildWhatsAppRestockLink({
        phone: '0812-9876-5432',
        customerName: 'Warung Bu Siti',
        storeName: 'Toko Berkah Mandiri',
        commodityName: 'Minyak Goreng Bimoli',
        daysRemaining: 1,
        price: 212000,
        priceType: 'wholesale',
        suggestedQty: 2,
        unit: 'karton',
        ratio: 1.1,
      });

      expect(link).toContain('https://wa.me/6281298765432');
      const decoded = decodeURIComponent(link);
      expect(decoded).toContain('Warung Bu Siti');
      expect(decoded).toContain('Minyak Goreng Bimoli');
      expect(decoded).toContain('grosir warung');
      expect(decoded).toContain('Rp 212.000');
    });
  });

  describe('4. Receipt WhatsApp Message Template', () => {
    it('formats detailed digital receipt with item breakdown and TUNAI payment', () => {
      const tx: ITransaction = {
        id: 'tx-123',
        invoice_number: 'INV-20261101-0099',
        customer_id: 'cust-1',
        customer_name: 'Warung Bu Siti',
        total_amount: 150000,
        discount_amount: 10000,
        final_amount: 140000,
        payment_method: 'TUNAI',
        cash_tendered: 150000,
        change_amount: 10000,
        status: 'completed',
        created_at: '2026-11-01T10:00:00Z',
        items: [
          {
            id: 'it-1',
            transaction_id: 'tx-123',
            product_id: 'p-1',
            product_name: 'Beras Ramos 5kg',
            quantity: 2,
            unit_price: 75000,
            price_type: 'wholesale',
            subtotal: 150000,
          },
        ],
      };

      const msg = buildReceiptWhatsAppMessage(tx, 'Toko Berkah');
      expect(msg).toContain('INV-20261101-0099');
      expect(msg).toContain('Beras Ramos 5kg');
      expect(msg).toContain('Metode Bayar: TUNAI');
      expect(msg).toContain('Uang Diterima: Rp 150.000');
      expect(msg).toContain('Kembalian: Rp 10.000');
      expect(msg).toContain('TOTAL AKHIR: Rp 140.000');
    });

    it('formats detailed digital receipt with item breakdown and KASBON payment', () => {
      const tx: ITransaction = {
        id: 'tx-124',
        invoice_number: 'INV-20261101-0100',
        customer_id: 'cust-1',
        customer_name: 'Warung Bu Siti',
        total_amount: 140000,
        discount_amount: 0,
        final_amount: 140000,
        payment_method: 'KASBON',
        due_date: '2026-11-15T00:00:00Z',
        status: 'completed',
        created_at: '2026-11-01T10:00:00Z',
        items: [
          {
            id: 'it-1',
            transaction_id: 'tx-124',
            product_id: 'p-1',
            product_name: 'Beras Ramos 5kg',
            quantity: 2,
            unit_price: 70000,
            price_type: 'wholesale',
            subtotal: 140000,
          },
        ],
      };

      const msg = buildReceiptWhatsAppMessage(tx, 'Toko Berkah');
      expect(msg).toContain('INV-20261101-0100');
      expect(msg).toContain('Metode Bayar: KASBON');
      expect(msg).toContain('Jatuh Tempo:');
      expect(msg).toContain('TOTAL AKHIR: Rp 140.000');
    });
  });
});
