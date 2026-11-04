import { IProduct, CustomerType } from './types';

/**
 * Automatically determines unit price and price type based on customer tier.
 * Warung / Grosir customer -> wholesale_price
 * Eceran or Walk-in (null) -> retail_price
 * No manual discount input needed.
 */
export function calculateItemPrice(
  product: IProduct,
  customerType?: CustomerType | null
): { unitPrice: number; priceType: 'retail' | 'wholesale' } {
  if (customerType === 'Warung / Grosir') {
    return {
      unitPrice: product.wholesale_price,
      priceType: 'wholesale',
    };
  }

  return {
    unitPrice: product.retail_price,
    priceType: 'retail',
  };
}

/**
 * Rounds decimal quantity to 3 decimal places (e.g. 1.500 kg, 0.750 kg).
 */
export function roundQuantity(qty: number): number {
  if (isNaN(qty) || qty <= 0) return 0;
  return Number(qty.toFixed(3));
}

/**
 * Calculates line-item subtotal with discount clamping.
 * Ensures discount does not exceed gross amount and subtotal never drops below 0.
 */
export function calculateItemSubtotal(
  quantity: number,
  unitPrice: number,
  discountAmount: number = 0
): {
  grossSubtotal: number;
  clampedDiscount: number;
  netSubtotal: number;
} {
  const roundedQty = roundQuantity(quantity);
  const grossSubtotal = Number((roundedQty * unitPrice).toFixed(2));
  const rawDiscount = Math.max(0, discountAmount || 0);
  const clampedDiscount = Math.min(grossSubtotal, rawDiscount);
  const netSubtotal = Math.max(0, Number((grossSubtotal - clampedDiscount).toFixed(2)));

  return {
    grossSubtotal,
    clampedDiscount,
    netSubtotal,
  };
}

/**
 * Calculates cart totals with item aggregation and order-level discount clamping.
 */
export function calculateCartTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  orderDiscount: number = 0
): {
  totalGross: number;
  clampedDiscount: number;
  finalAmount: number;
} {
  let totalGross = 0;
  for (const item of items) {
    const qty = roundQuantity(item.quantity);
    totalGross += Number((qty * item.unitPrice).toFixed(2));
  }
  totalGross = Number(totalGross.toFixed(2));

  const rawDiscount = Math.max(0, orderDiscount || 0);
  const clampedDiscount = Math.min(totalGross, rawDiscount);
  const finalAmount = Math.max(0, Number((totalGross - clampedDiscount).toFixed(2)));

  return {
    totalGross,
    clampedDiscount,
    finalAmount,
  };
}
