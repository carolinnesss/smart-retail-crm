import { CustomerType, IProduct } from './types';
import { calculateItemPrice, roundQuantity } from './pricing';
import { formatDecimalQty, formatIDR } from './formatters';
import { buildWhatsAppLink } from './whatsapp';

export type CatalogStockStatus = 'TERSEDIA' | 'MENIPIS' | 'HABIS';

export interface ICustomerCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock_quantity: number;
  min_stock_alert: number;
  stock_status: CatalogStockStatus;
  applied_price: number;
  retail_price: number;
  price_type: 'retail' | 'wholesale';
  unit_savings: number;
}

export interface ICustomerStoreContact {
  store_name: string;
  owner_name: string;
  phone: string;
  whatsapp_phone: string;
  address: string;
}

export interface IEstimationItem {
  product: ICustomerCatalogItem;
  quantity: number;
  line_subtotal: number;
  line_savings: number;
}

export type EstimationPaymentPlan = 'TUNAI' | 'KASBON';

export interface IEstimationSummary {
  itemCount: number;
  totalQuantity: number;
  estimatedTotal: number;
  totalWholesaleSavings: number;
  fitsCreditLimit: boolean;
  creditShortfall: number;
  projectedRemainingCredit: number;
}

/**
 * Determines customer-facing stock availability status.
 */
export function getCatalogStockStatus(
  stockQuantity: number,
  minStockAlert: number
): CatalogStockStatus {
  if (stockQuantity <= 0) {
    return 'HABIS';
  }
  if (stockQuantity <= minStockAlert) {
    return 'MENIPIS';
  }
  return 'TERSEDIA';
}

/**
 * Projects an internal product into a customer-safe catalog item with
 * automatic Eceran vs Warung/Grosir tier pricing.
 * For Eceran customers, wholesale pricing is never included in the projection.
 */
export function projectProductForCustomer(
  product: IProduct,
  customerType?: CustomerType | null
): ICustomerCatalogItem {
  const effectiveTier: CustomerType =
    customerType === 'Warung / Grosir' ? 'Warung / Grosir' : 'Eceran';

  const { unitPrice, priceType } = calculateItemPrice(product, effectiveTier);
  const safeAppliedPrice =
    unitPrice > 0 ? unitPrice : product.retail_price;
  const effectivePriceType =
    effectiveTier === 'Warung / Grosir' &&
    product.wholesale_price > 0 &&
    product.wholesale_price <= product.retail_price
      ? priceType
      : 'retail';

  const unitSavings =
    effectivePriceType === 'wholesale'
      ? Math.max(0, product.retail_price - safeAppliedPrice)
      : 0;

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    stock_quantity: roundQuantity(product.stock_quantity),
    min_stock_alert: roundQuantity(product.min_stock_alert),
    stock_status: getCatalogStockStatus(
      product.stock_quantity,
      product.min_stock_alert
    ),
    applied_price: safeAppliedPrice,
    retail_price: product.retail_price,
    price_type: effectivePriceType,
    unit_savings: unitSavings,
  };
}

/**
 * Projects a list of products for a customer tier, excluding inactive products.
 */
export function projectCatalogForCustomer(
  products: IProduct[],
  customerType?: CustomerType | null
): ICustomerCatalogItem[] {
  return products
    .filter((p) => p.is_active)
    .map((p) => projectProductForCustomer(p, customerType));
}

/**
 * Extracts ordered unique categories with 'Semua' prepended.
 */
export function extractCatalogCategories(
  products: ICustomerCatalogItem[]
): string[] {
  const seen = new Set<string>();
  for (const prod of products) {
    if (prod.category && prod.category.trim()) {
      seen.add(prod.category.trim());
    }
  }
  return ['Semua', ...Array.from(seen)];
}

/**
 * Filters projected customer catalog items by search text, category, and stock status.
 */
export function filterCatalogProducts(
  products: ICustomerCatalogItem[],
  options: {
    search?: string;
    category?: string;
    stockFilter?: 'ALL' | 'AVAILABLE' | 'LOW_STOCK';
  }
): ICustomerCatalogItem[] {
  const q = (options.search || '').toLowerCase().trim();
  const category = options.category || 'Semua';
  const stockFilter = options.stockFilter || 'ALL';

  return products.filter((item) => {
    if (category !== 'Semua' && item.category !== category) {
      return false;
    }

    if (stockFilter === 'AVAILABLE' && item.stock_status === 'HABIS') {
      return false;
    }
    if (stockFilter === 'LOW_STOCK' && item.stock_status !== 'MENIPIS') {
      return false;
    }

    if (q) {
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCategory) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes line subtotal rounded to integer IDR matching POS precision.
 */
export function computeEstimationLineSubtotal(
  quantity: number,
  unitPrice: number
): number {
  const roundedQty = roundQuantity(quantity);
  if (roundedQty <= 0 || unitPrice <= 0) return 0;
  return Math.round(roundedQty * unitPrice);
}

/**
 * Checks whether a unit typically allows decimal (weighted/volume) quantities like 'kg' or 'liter'.
 */
export function supportsDecimalQuantity(unit: string): boolean {
  const normalized = unit.trim().toLowerCase();
  return (
    normalized === 'kg' ||
    normalized === 'kilogram' ||
    normalized === 'liter' ||
    normalized === 'l' ||
    normalized === 'ons'
  );
}

/**
 * Adds or increments a product in the customer estimation list, respecting stock ceiling.
 */
export function upsertEstimationItem(
  currentItems: IEstimationItem[],
  product: ICustomerCatalogItem,
  qtyToAdd: number = 1
): { success: boolean; message?: string; items: IEstimationItem[] } {
  const cleanAdd = roundQuantity(qtyToAdd);
  if (cleanAdd <= 0) {
    return {
      success: false,
      message: 'Jumlah barang harus lebih besar dari 0.',
      items: currentItems,
    };
  }

  if (product.stock_quantity <= 0) {
    return {
      success: false,
      message: `Stok "${product.name}" sedang habis.`,
      items: currentItems,
    };
  }

  const existingIdx = currentItems.findIndex(
    (it) => it.product.id === product.id
  );

  if (existingIdx > -1) {
    const existing = currentItems[existingIdx];
    const nextQty = roundQuantity(existing.quantity + cleanAdd);

    if (nextQty > product.stock_quantity) {
      return {
        success: false,
        message: `Jumlah "${product.name}" melebihi stok toko yang tersedia (${formatDecimalQty(product.stock_quantity, product.unit)}).`,
        items: currentItems,
      };
    }

    const updated = [...currentItems];
    updated[existingIdx] = {
      product,
      quantity: nextQty,
      line_subtotal: computeEstimationLineSubtotal(nextQty, product.applied_price),
      line_savings: computeEstimationLineSubtotal(nextQty, product.unit_savings),
    };
    return { success: true, items: updated };
  }

  if (cleanAdd > product.stock_quantity) {
    return {
      success: false,
      message: `Jumlah "${product.name}" melebihi stok toko yang tersedia (${formatDecimalQty(product.stock_quantity, product.unit)}).`,
      items: currentItems,
    };
  }

  return {
    success: true,
    items: [
      ...currentItems,
      {
        product,
        quantity: cleanAdd,
        line_subtotal: computeEstimationLineSubtotal(
          cleanAdd,
          product.applied_price
        ),
        line_savings: computeEstimationLineSubtotal(
          cleanAdd,
          product.unit_savings
        ),
      },
    ],
  };
}

/**
 * Directly sets quantity for an item in the customer estimation list.
 * Setting quantity <= 0 removes the item cleanly.
 */
export function setEstimationItemQty(
  currentItems: IEstimationItem[],
  productId: string,
  nextQty: number
): { success: boolean; message?: string; items: IEstimationItem[] } {
  if (isNaN(nextQty) || nextQty <= 0) {
    return {
      success: true,
      items: currentItems.filter((it) => it.product.id !== productId),
    };
  }

  const idx = currentItems.findIndex((it) => it.product.id === productId);
  if (idx === -1) {
    return {
      success: false,
      message: 'Barang tidak ditemukan di daftar estimasi.',
      items: currentItems,
    };
  }

  const target = currentItems[idx];
  const cleanQty = roundQuantity(nextQty);

  if (cleanQty > target.product.stock_quantity) {
    return {
      success: false,
      message: `Maksimal stok tersedia untuk "${target.product.name}" adalah ${formatDecimalQty(target.product.stock_quantity, target.product.unit)}.`,
      items: currentItems,
    };
  }

  const updated = [...currentItems];
  updated[idx] = {
    ...target,
    quantity: cleanQty,
    line_subtotal: computeEstimationLineSubtotal(
      cleanQty,
      target.product.applied_price
    ),
    line_savings: computeEstimationLineSubtotal(
      cleanQty,
      target.product.unit_savings
    ),
  };

  return { success: true, items: updated };
}

/**
 * Re-synchronizes local estimation items against freshly fetched catalog data
 * (updates prices and clamps quantities if store stock decreased).
 */
export function reconcileEstimationItems(
  currentItems: IEstimationItem[],
  latestCatalog: ICustomerCatalogItem[]
): IEstimationItem[] {
  const byId = new Map<string, ICustomerCatalogItem>();
  for (const prod of latestCatalog) {
    byId.set(prod.id, prod);
  }

  const reconciled: IEstimationItem[] = [];
  for (const item of currentItems) {
    const freshProduct = byId.get(item.product.id);
    if (!freshProduct || freshProduct.stock_quantity <= 0) {
      continue;
    }
    const clampedQty = Math.min(item.quantity, freshProduct.stock_quantity);
    if (clampedQty <= 0) continue;

    reconciled.push({
      product: freshProduct,
      quantity: roundQuantity(clampedQty),
      line_subtotal: computeEstimationLineSubtotal(
        clampedQty,
        freshProduct.applied_price
      ),
      line_savings: computeEstimationLineSubtotal(
        clampedQty,
        freshProduct.unit_savings
      ),
    });
  }

  return reconciled;
}

/**
 * Summarizes totals, wholesale savings, and credit limit simulation for the customer's estimation.
 */
export function summarizeEstimation(
  items: IEstimationItem[],
  paymentPlan: EstimationPaymentPlan,
  remainingCredit: number
): IEstimationSummary {
  let totalQuantity = 0;
  let estimatedTotal = 0;
  let totalWholesaleSavings = 0;

  for (const item of items) {
    totalQuantity = roundQuantity(totalQuantity + item.quantity);
    estimatedTotal += item.line_subtotal;
    totalWholesaleSavings += item.line_savings;
  }

  const safeRemainingCredit = Math.max(0, remainingCredit || 0);
  const fitsCreditLimit =
    paymentPlan === 'TUNAI' || estimatedTotal <= safeRemainingCredit;
  const creditShortfall =
    paymentPlan === 'KASBON' && estimatedTotal > safeRemainingCredit
      ? estimatedTotal - safeRemainingCredit
      : 0;
  const projectedRemainingCredit =
    paymentPlan === 'KASBON'
      ? Math.max(0, safeRemainingCredit - estimatedTotal)
      : safeRemainingCredit;

  return {
    itemCount: items.length,
    totalQuantity,
    estimatedTotal,
    totalWholesaleSavings,
    fitsCreditLimit,
    creditShortfall,
    projectedRemainingCredit,
  };
}

/**
 * Builds human-readable WhatsApp order estimation text addressed to the store owner.
 */
export function buildCustomerEstimateMessage(params: {
  storeName: string;
  ownerName?: string;
  customerName: string;
  customerWhatsapp?: string;
  customerType: CustomerType;
  items: IEstimationItem[];
  paymentPlan: EstimationPaymentPlan;
  remainingCredit?: number;
  notes?: string;
}): string {
  const summary = summarizeEstimation(
    params.items,
    params.paymentPlan,
    params.remainingCredit || 0
  );

  const tierLabel =
    params.customerType === 'Warung / Grosir'
      ? 'Warung / Grosir'
      : 'Eceran';

  const linesText = params.items
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.product.name}*\n   ${formatDecimalQty(
          it.quantity,
          it.product.unit
        )} x ${formatIDR(it.product.applied_price)} = *${formatIDR(
          it.line_subtotal
        )}*`
    )
    .join('\n');

  const paymentText =
    params.paymentPlan === 'KASBON'
      ? summary.fitsCreditLimit
        ? 'Rencana Bayar: *Ajukan Kasbon*'
        : `Rencana Bayar: *Ajukan Kasbon* (Melebihi sisa plafon ${formatIDR(
            summary.creditShortfall
          )})`
      : 'Rencana Bayar: *Tunai*';

  const savingsLine =
    summary.totalWholesaleSavings > 0
      ? `\nTotal Hemat Grosir: ${formatIDR(summary.totalWholesaleSavings)}`
      : '';

  const notesText = params.notes?.trim()
    ? `\nCatatan Pelanggan: ${params.notes.trim()}`
    : '';

  const ownerGreeting = params.ownerName
    ? `Halo ${params.ownerName} (${params.storeName}),`
    : `Halo Pemilik ${params.storeName},`;

  return `${ownerGreeting}

Saya ingin mengirimkan *Estimasi Belanja* dari Portal Pelanggan:
• Nama: *${params.customerName}*${
    params.customerWhatsapp ? `\n• WhatsApp: ${params.customerWhatsapp}` : ''
  }
• Kategori Harga: *${tierLabel}*

*Daftar Barang (${summary.itemCount} item):*
${linesText}

*TOTAL ESTIMASI: ${formatIDR(summary.estimatedTotal)}*${savingsLine}
${paymentText}${notesText}

Mohon konfirmasi ketersediaan barang dan waktu pengambilan/pengantaran. Terima kasih!`;
}

/**
 * Generates an encoded, sanitized WhatsApp link to send the customer estimation to the store owner.
 */
export function buildCustomerEstimateWhatsAppLink(params: {
  storePhone: string;
  storeName: string;
  ownerName?: string;
  customerName: string;
  customerWhatsapp?: string;
  customerType: CustomerType;
  items: IEstimationItem[];
  paymentPlan: EstimationPaymentPlan;
  remainingCredit?: number;
  notes?: string;
}): string {
  const message = buildCustomerEstimateMessage(params);
  return buildWhatsAppLink(params.storePhone, message);
}
