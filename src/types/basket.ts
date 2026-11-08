import type { Product } from './product';

export interface BasketItem {
  product: Product;
  quantity: number;
}