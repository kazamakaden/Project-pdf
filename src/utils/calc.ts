import type { BasketItem } from '@/types/basket';
import type { QuotationTotals } from '@/types/quotation';

export const VAT_RATE = 0.07;

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function computeTotals(items: BasketItem[], includeVat: boolean): QuotationTotals {
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  );
  const vat = includeVat ? round2(subtotal * VAT_RATE) : 0;
  return {
    subtotal,
    vat,
    grandTotal: round2(subtotal + vat),
    includeVat,
    vatRate: VAT_RATE,
  };
}

export function countItems(items: BasketItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}