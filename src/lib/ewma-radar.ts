import {
  ICustomer,
  IProduct,
  ITransaction,
  IRestockPrediction,
  RestockUrgencyStatus,
  SembakoCategory,
} from './types';
import { buildWhatsAppRestockLink } from './whatsapp';

export const MONITORED_COMMODITIES: SembakoCategory[] = [
  'Beras',
  'Minyak Goreng',
  'Gula Pasir',
  'Telur Ayam',
  'Tepung Terigu',
];

export function isMonitoredCommodity(category: string): boolean {
  return MONITORED_COMMODITIES.some(
    (c) => c.toLowerCase() === (category || '').toLowerCase()
  );
}

/**
 * Calculates EWMA (Exponentially Weighted Moving Average) of purchase intervals.
 * S_1 = Delta_1
 * S_t = alpha * Delta_t + (1 - alpha) * S_{t-1}
 *
 * @param intervals Array of elapsed days between consecutive purchases (must have at least 1 interval)
 * @param alpha Smoothing factor (default 0.3)
 */
export function calculateEWMA(intervals: number[], alpha: number = 0.3): number {
  if (intervals.length === 0) return 0;
  if (alpha <= 0 || alpha > 1) alpha = 0.3;

  let s = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    s = alpha * intervals[i] + (1 - alpha) * s;
  }

  return Number(s.toFixed(2));
}

/**
 * Determines urgency status based on ratio = (days_since_last_purchase / avg_cycle_days).
 * - ratio >= 1.3 -> CRITICAL
 * - ratio >= 1.0 -> URGENT
 * - ratio >= 0.7 -> SOON
 * - ratio < 0.7  -> NORMAL
 */
export function getUrgencyStatus(ratio: number): {
  status: RestockUrgencyStatus;
  statusLabel: string;
  recommendedAction: string;
} {
  if (ratio >= 1.3) {
    return {
      status: 'CRITICAL',
      statusLabel: '🚨 Kritis (Stok Diperkirakan Habis)',
      recommendedAction: 'Hubungi via WhatsApp segera untuk penawaran antar restok.',
    };
  }

  if (ratio >= 1.0) {
    return {
      status: 'URGENT',
      statusLabel: '⚠️ Mendesak (Perlu Restok Segera)',
      recommendedAction: 'Tawarkan restok sembako sebelum beralih ke toko kompetitor.',
    };
  }

  if (ratio >= 0.7) {
    return {
      status: 'SOON',
      statusLabel: '🟡 Mendekati Habis (Siapkan Stok)',
      recommendedAction: 'Persiapkan ketersediaan stok di gudang warung.',
    };
  }

  return {
    status: 'NORMAL',
    statusLabel: '🟢 Normal (Stok Pelanggan Aman)',
    recommendedAction: 'Stok kebutuhan pokok terpantau mencukupi.',
  };
}

/**
 * Calculates restock predictions for customers across the 5 monitored staple commodities.
 * MINIMUM 3 PURCHASES RULE: requires at least 3 historical purchases before displaying prediction.
 */
export function calculateRestockPredictions(
  customers: ICustomer[],
  products: IProduct[],
  transactions: ITransaction[],
  options?: {
    alpha?: number;
    storeName?: string;
    now?: Date;
  }
): IRestockPrediction[] {
  const alpha = options?.alpha ?? 0.3;
  const storeName = options?.storeName ?? 'Toko Sembako Berkah Mandiri';
  const now = options?.now ?? new Date();

  const productMap = new Map<string, IProduct>();
  products.forEach((p) => productMap.set(p.id, p));

  const predictions: IRestockPrediction[] = [];

  // Filter only active customers with registered valid contact
  const activeCustomers = customers.filter(
    (c) => c.is_active && c.phone && c.phone !== '0000-0000-0000'
  );

  for (const customer of activeCustomers) {
    const custTxs = transactions
      .filter((t) => t.customer_id === customer.id && t.status === 'completed')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (custTxs.length === 0) continue;

    // Group purchases by monitored commodity
    const commodityPurchases = new Map<
      string,
      Array<{
        date: Date;
        quantity: number;
        product: IProduct;
        priceType: 'retail' | 'wholesale';
      }>
    >();

    for (const tx of custTxs) {
      if (!tx.items) continue;
      for (const item of tx.items) {
        const prod = productMap.get(item.product_id);
        if (!prod || !isMonitoredCommodity(prod.category)) continue;

        const list = commodityPurchases.get(prod.category) || [];
        list.push({
          date: new Date(tx.created_at),
          quantity: item.quantity,
          product: prod,
          priceType: item.price_type,
        });
        commodityPurchases.set(prod.category, list);
      }
    }

    // Evaluate each monitored commodity for this customer
    commodityPurchases.forEach((purchases, category) => {
      // MINIMUM 3 PURCHASES RULE:
      // Proposal & user requirements explicitly dictate: minimal 3 data pembelian sebelum prediksi ditampilkan
      if (purchases.length < 3) {
        return;
      }

      // Calculate intervals between consecutive purchases
      const intervals: number[] = [];
      for (let i = 1; i < purchases.length; i++) {
        const diffMs = purchases[i].date.getTime() - purchases[i - 1].date.getTime();
        const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        intervals.push(diffDays);
      }

      // Compute average cycle using EWMA
      const avgIntervalDays = Math.max(1, Math.round(calculateEWMA(intervals, alpha)));

      const lastPurchase = purchases[purchases.length - 1];
      const lastProduct = lastPurchase.product;
      const isWholesale = customer.customer_type === 'Warung / Grosir';

      const daysSinceLast = Math.max(
        0,
        Math.floor((now.getTime() - lastPurchase.date.getTime()) / (1000 * 60 * 60 * 24))
      );

      const ratio = Number((daysSinceLast / avgIntervalDays).toFixed(2));
      const daysRemaining = avgIntervalDays - daysSinceLast;

      const { status, statusLabel, recommendedAction } = getUrgencyStatus(ratio);

      const suggestedPriceType: 'wholesale' | 'retail' = isWholesale ? 'wholesale' : 'retail';
      const estimatedPrice = isWholesale
        ? lastProduct.wholesale_price
        : lastProduct.retail_price;
      const suggestedQuantity = lastPurchase.quantity || 1;

      const waLink = buildWhatsAppRestockLink({
        phone: customer.phone,
        customerName: customer.name,
        storeName,
        commodityName: lastProduct.name,
        daysRemaining,
        price: estimatedPrice,
        priceType: suggestedPriceType,
        suggestedQty: suggestedQuantity,
        unit: lastProduct.unit,
        ratio,
      });

      predictions.push({
        customer_id: customer.id,
        customer_name: customer.name,
        phone: customer.phone,
        commodity: lastProduct.name,
        category,
        last_purchased_date: lastPurchase.date.toISOString(),
        last_quantity: lastPurchase.quantity,
        unit: lastProduct.unit,
        purchase_count: purchases.length,
        avg_interval_days: avgIntervalDays,
        days_since_last: daysSinceLast,
        ratio,
        days_remaining: daysRemaining,
        status,
        status_label: statusLabel,
        recommended_action: recommendedAction,
        suggested_quantity: suggestedQuantity,
        suggested_price_type: suggestedPriceType,
        estimated_price: estimatedPrice,
        wa_link: waLink,
      });
    });
  }

  // Sort by urgency ratio descending (most critical first)
  return predictions.sort((a, b) => b.ratio - a.ratio);
}
