import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCatalogStockStatus,
  projectProductForCustomer,
  projectCatalogForCustomer,
  extractCatalogCategories,
  filterCatalogProducts,
  upsertEstimationItem,
  setEstimationItemQty,
  reconcileEstimationItems,
  summarizeEstimation,
  buildCustomerEstimateMessage,
  buildCustomerEstimateWhatsAppLink,
} from '@/lib/customer-catalog';
import { IProduct } from '@/lib/types';
import { MockDataRepository } from '@/lib/repository/mock-repo';
import * as sessionModule from '@/lib/auth/session';
import { GET as getCatalogRoute } from '@/app/api/pelanggan/portal/catalog/route';

const sampleProducts: IProduct[] = [
  {
    id: 'prod-1',
    sku: 'SKU-001',
    name: 'Beras Setra Ramos 5kg',
    category: 'Beras',
    unit: 'sak 5kg',
    retail_price: 74000,
    wholesale_price: 69000,
    stock_quantity: 20,
    min_stock_alert: 5,
    is_active: true,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
  {
    id: 'prod-2',
    sku: 'SKU-002',
    name: 'Telur Ayam Negeri',
    category: 'Telur Ayam',
    unit: 'kg',
    retail_price: 29000,
    wholesale_price: 27000,
    stock_quantity: 4,
    min_stock_alert: 5,
    is_active: true,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
  {
    id: 'prod-3',
    sku: 'SKU-003',
    name: 'Minyak Goreng Habis',
    category: 'Minyak Goreng',
    unit: 'pouch 2L',
    retail_price: 38000,
    wholesale_price: 35000,
    stock_quantity: 0,
    min_stock_alert: 5,
    is_active: true,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
  {
    id: 'prod-inactive',
    sku: 'SKU-999',
    name: 'Produk Nonaktif',
    category: 'Lainnya',
    unit: 'pcs',
    retail_price: 10000,
    wholesale_price: 8000,
    stock_quantity: 10,
    min_stock_alert: 2,
    is_active: false,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
];

describe('Customer Portal Catalog, Stock Check & Estimation', () => {
  beforeEach(async () => {
    const repo = MockDataRepository.getInstance();
    if (repo.resetMockData) {
      await repo.resetMockData();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Stock status & Tier Projection', () => {
    it('correctly classifies TERSEDIA, MENIPIS, and HABIS stock states', () => {
      expect(getCatalogStockStatus(20, 5)).toBe('TERSEDIA');
      expect(getCatalogStockStatus(5, 5)).toBe('MENIPIS');
      expect(getCatalogStockStatus(2, 5)).toBe('MENIPIS');
      expect(getCatalogStockStatus(0, 5)).toBe('HABIS');
      expect(getCatalogStockStatus(-1, 5)).toBe('HABIS');
    });

    it('projects retail_price for Eceran customers without leaking wholesale_price', () => {
      const item = projectProductForCustomer(sampleProducts[0], 'Eceran');
      expect(item.applied_price).toBe(74000);
      expect(item.retail_price).toBe(74000);
      expect(item.price_type).toBe('retail');
      expect(item.unit_savings).toBe(0);
      expect('wholesale_price' in item).toBe(false);
    });

    it('projects wholesale_price and savings for Warung / Grosir customers', () => {
      const item = projectProductForCustomer(sampleProducts[0], 'Warung / Grosir');
      expect(item.applied_price).toBe(69000);
      expect(item.retail_price).toBe(74000);
      expect(item.price_type).toBe('wholesale');
      expect(item.unit_savings).toBe(5000);
    });

    it('filters out inactive products when projecting catalog', () => {
      const projected = projectCatalogForCustomer(sampleProducts, 'Eceran');
      expect(projected).toHaveLength(3);
      expect(projected.some((p) => p.id === 'prod-inactive')).toBe(false);
    });
  });

  describe('Catalog Filtering & Categories', () => {
    it('extracts unique categories with Semua first and filters by query/stock', () => {
      const projected = projectCatalogForCustomer(sampleProducts, 'Warung / Grosir');
      const categories = extractCatalogCategories(projected);
      expect(categories).toEqual(['Semua', 'Beras', 'Telur Ayam', 'Minyak Goreng']);

      expect(
        filterCatalogProducts(projected, { search: 'ramos' }).map((p) => p.id)
      ).toEqual(['prod-1']);

      expect(
        filterCatalogProducts(projected, { stockFilter: 'AVAILABLE' }).map((p) => p.id)
      ).toEqual(['prod-1', 'prod-2']);

      expect(
        filterCatalogProducts(projected, { stockFilter: 'LOW_STOCK' }).map((p) => p.id)
      ).toEqual(['prod-2']);
    });
  });

  describe('Estimation Cart & Credit Simulation', () => {
    it('adds, updates decimal quantities, and blocks quantities above store stock', () => {
      const catalog = projectCatalogForCustomer(sampleProducts, 'Warung / Grosir');
      const beras = catalog[0]; // stock 20, wholesale 69.000, savings 5.000
      const telur = catalog[1]; // stock 4, wholesale 27.000, savings 2.000
      const habis = catalog[2]; // stock 0

      // Reject out-of-stock
      const resHabis = upsertEstimationItem([], habis, 1);
      expect(resHabis.success).toBe(false);
      expect(resHabis.items).toHaveLength(0);

      // Add beras x2 and telur x1.5 kg
      const step1 = upsertEstimationItem([], beras, 2);
      expect(step1.success).toBe(true);
      const step2 = upsertEstimationItem(step1.items, telur, 1.5);
      expect(step2.success).toBe(true);
      expect(step2.items[1].line_subtotal).toBe(40500); // 1.5 * 27000
      expect(step2.items[1].line_savings).toBe(3000); // 1.5 * 2000

      // Exceed stock limit on telur (stock 4)
      const overStock = setEstimationItemQty(step2.items, telur.id, 5);
      expect(overStock.success).toBe(false);

      // Summarize with KASBON ceiling check
      const fitSummary = summarizeEstimation(step2.items, 'KASBON', 200000);
      expect(fitSummary.estimatedTotal).toBe(2 * 69000 + 40500); // 178500
      expect(fitSummary.totalWholesaleSavings).toBe(2 * 5000 + 3000); // 13000
      expect(fitSummary.fitsCreditLimit).toBe(true);
      expect(fitSummary.projectedRemainingCredit).toBe(21500);

      const overSummary = summarizeEstimation(step2.items, 'KASBON', 100000);
      expect(overSummary.fitsCreditLimit).toBe(false);
      expect(overSummary.creditShortfall).toBe(78500);
    });

    it('reconciles cached estimation items when stock decreases or item goes out of stock', () => {
      const initialCatalog = projectCatalogForCustomer(sampleProducts, 'Eceran');
      const beras = initialCatalog[0];
      const telur = initialCatalog[1];

      let cart = upsertEstimationItem([], beras, 5).items;
      cart = upsertEstimationItem(cart, telur, 4).items;

      // Simulate stock updates: beras drops to 3, telur becomes 0
      const updatedCatalog = projectCatalogForCustomer(
        [
          { ...sampleProducts[0], stock_quantity: 3 },
          { ...sampleProducts[1], stock_quantity: 0 },
        ],
        'Eceran'
      );

      const reconciled = reconcileEstimationItems(cart, updatedCatalog);
      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].product.id).toBe(beras.id);
      expect(reconciled[0].quantity).toBe(3);
      expect(reconciled[0].line_subtotal).toBe(3 * 74000);
    });
  });

  describe('WhatsApp Estimate Message & Sanitization', () => {
    it('builds sanitized WhatsApp click-to-chat link without using forbidden terminology', () => {
      const catalog = projectCatalogForCustomer(sampleProducts, 'Warung / Grosir');
      const items = upsertEstimationItem([], catalog[0], 2).items;

      const msg = buildCustomerEstimateMessage({
        storeName: 'Toko Sembako Berkah Mandiri',
        ownerName: 'Oline',
        customerName: 'Warung Bu Siti',
        customerWhatsapp: '081298765432',
        customerType: 'Warung / Grosir',
        items,
        paymentPlan: 'KASBON',
        remainingCredit: 2250000,
        notes: 'Mohon dikirim sore <script>alert(1)</script>',
      });

      expect(msg).toContain('Halo Oline (Toko Sembako Berkah Mandiri)');
      expect(msg).toContain('Warung Bu Siti');
      expect(msg).toContain('Warung / Grosir');
      expect(msg).toContain('Total Hemat Grosir');
      expect(msg).toContain('TOTAL ESTIMASI');
      expect(msg.toLowerCase()).not.toContain('kasir');

      const waUrl = buildCustomerEstimateWhatsAppLink({
        storePhone: '0812-3456-7890',
        storeName: 'Toko Sembako Berkah Mandiri',
        ownerName: 'Oline',
        customerName: 'Warung Bu Siti',
        customerWhatsapp: '081298765432',
        customerType: 'Warung / Grosir',
        items,
        paymentPlan: 'TUNAI',
        notes: '<b>Ambil jam 4</b>',
      });

      expect(waUrl.startsWith('https://wa.me/6281234567890?text=')).toBe(true);
      expect(decodeURIComponent(waUrl)).not.toContain('<script>');
      expect(decodeURIComponent(waUrl)).not.toContain('<b>');
    });
  });

  describe('API Route /api/pelanggan/portal/catalog RBAC & Projection', () => {
    it('returns 401 when customer session is missing', async () => {
      vi.spyOn(sessionModule, 'getCustomerServerSession').mockResolvedValue(null);

      const res = await getCatalogRoute();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('returns wholesale catalog and store phone for authenticated Warung / Grosir customer', async () => {
      vi.spyOn(sessionModule, 'getCustomerServerSession').mockResolvedValue({
        accountId: 'cust-acc-002',
        customerId: '10000000-0000-0000-0000-000000000002', // Warung Bu Siti
        role: 'CUSTOMER',
        name: 'Warung Bu Siti',
        whatsapp_number: '081298765432',
        createdAt: Date.now(),
      });

      const res = await getCatalogRoute();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.customer_type).toBe('Warung / Grosir');
      expect(body.data.store.whatsapp_phone).toBe('6281234567890');
      expect(body.data.products.length).toBeGreaterThan(0);

      const beras = body.data.products.find(
        (p: { id: string }) => p.id === '20000000-0000-0000-0000-000000000001'
      );
      expect(beras.price_type).toBe('wholesale');
      expect(beras.applied_price).toBe(69000);
      expect(beras.unit_savings).toBe(5000);
    });

    it('returns retail catalog and omits wholesale pricing for Eceran customer', async () => {
      vi.spyOn(sessionModule, 'getCustomerServerSession').mockResolvedValue({
        accountId: 'cust-acc-eceran',
        customerId: '10000000-0000-0000-0000-000000000005', // Ibu Rini Eceran
        role: 'CUSTOMER',
        name: 'Ibu Rini Eceran',
        whatsapp_number: '087888990011',
        createdAt: Date.now(),
      });

      const res = await getCatalogRoute();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.customer_type).toBe('Eceran');

      const beras = body.data.products.find(
        (p: { id: string }) => p.id === '20000000-0000-0000-0000-000000000001'
      );
      expect(beras.price_type).toBe('retail');
      expect(beras.applied_price).toBe(74000);
      expect(beras.unit_savings).toBe(0);
      expect('wholesale_price' in beras).toBe(false);
    });
  });
});
