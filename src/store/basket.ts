import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BasketItem } from '@/types/basket';
import type { Product } from '@/types/product';

interface BasketState {
  items: BasketItem[];
  includeVat: boolean;
  isDrawerOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearBasket: () => void;
  setIncludeVat: (value: boolean) => void;
  toggleVat: () => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set) => ({
      items: [],
      includeVat: true,
      isDrawerOpen: false,
      addItem: (product, quantity = 1) =>
        set((state) => {
          const qty = Math.max(1, Math.floor(quantity));
          const existing = state.items.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + qty }
                  : item,
              ),
            };
          }
          return { items: [...state.items, { product, quantity: qty }] };
        }),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.product.id !== productId) })),
      increment: (productId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        })),
      decrement: (productId) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.product.id === productId
                ? { ...item, quantity: Math.max(0, Math.floor(quantity)) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      clearBasket: () => set({ items: [] }),
      setIncludeVat: (value) => set({ includeVat: value }),
      toggleVat: () => set((state) => ({ includeVat: !state.includeVat })),
      setDrawerOpen: (open) => set({ isDrawerOpen: open }),
    }),
    {
      name: 'lmc-basket',
      partialize: (state) => ({ items: state.items, includeVat: state.includeVat }),
    },
  ),
);