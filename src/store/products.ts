import { useMemo } from 'react';
import { create } from 'zustand';
import { products as seedProducts } from '@/data/products';
import { api } from '@/lib/api';
import type { Product } from '@/types/product';

export interface ProductDraft {
  name: string;
  category: string;
  size: string;
  model: string;
  brand: string;
  unit: string;
  price: number;
  note: string;
  imageUrl: string;
}

/** จำนวนสินค้าตั้งต้นที่ฝังมากับเว็บ (ใช้ปุ่ม "นำเข้าข้อมูลตั้งต้น") */
export const SEED_PRODUCT_COUNT = seedProducts.length;

/** api = ข้อมูลจากฐานข้อมูลกลาง, seed = ข้อมูลสำรองที่ฝังมากับเว็บ */
export type CatalogSource = 'api' | 'seed';
export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ProductCatalogState {
  products: Product[];
  status: CatalogStatus;
  source: CatalogSource;
  error: string | null;
  saving: boolean;
  load: (force?: boolean) => Promise<void>;
  createProduct: (draft: ProductDraft) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  importSeedCatalog: () => Promise<number>;
}

function sortProducts(items: Product[]): Product[] {
  return [...items].sort((a, b) => a.seq - b.seq);
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const useProductStore = create<ProductCatalogState>()((set, get) => {
  /**
   * ถ้ายังแสดงข้อมูลสำรองอยู่ ให้เขียนข้อมูลตั้งต้นลงฐานข้อมูลก่อน
   * เพื่อไม่ให้สินค้าที่เพิ่มใหม่ปนกับข้อมูลที่ไม่ได้อยู่ในฐานข้อมูล
   */
  async function ensureBackedByDatabase(): Promise<void> {
    if (get().source === 'api') return;
    await api.importProducts(seedProducts);
    set({ products: sortProducts(seedProducts), source: 'api', error: null });
  }

  return {
    products: [],
    status: 'idle',
    source: 'seed',
    error: null,
    saving: false,

    load: async (force = false) => {
      const { status } = get();
      if (!force && (status === 'loading' || status === 'ready')) return;

      set({ status: 'loading', error: null });
      try {
        const { products: list, seedError } = await api.listProducts();
        if (list.length === 0) {
          set({
            products: sortProducts(seedProducts),
            status: 'ready',
            source: 'seed',
            error: seedError ?? null,
          });
          return;
        }
        set({ products: sortProducts(list), status: 'ready', source: 'api', error: null });
      } catch (error) {
        set({
          products: sortProducts(seedProducts),
          status: 'ready',
          source: 'seed',
          error: messageOf(error, 'โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ'),
        });
      }
    },

    createProduct: async (draft) => {
      set({ saving: true });
      try {
        await ensureBackedByDatabase();
        const created = await api.createProduct({
          name: draft.name.trim(),
          category: draft.category.trim() || 'อื่น ๆ',
          size: draft.size.trim(),
          model: draft.model.trim(),
          brand: draft.brand.trim(),
          unit: draft.unit.trim() || 'ชิ้น',
          price: draft.price,
          note: draft.note.trim(),
          imageUrl: draft.imageUrl || undefined,
        });
        set((state) => ({
          products: sortProducts([
            ...state.products.filter((item) => item.id !== created.id),
            created,
          ]),
          source: 'api',
          error: null,
        }));
      } finally {
        set({ saving: false });
      }
    },

    updateProduct: async (id, patch) => {
      set({ saving: true });
      try {
        await ensureBackedByDatabase();
        const updated = await api.updateProduct(id, patch);
        set((state) => ({
          products: state.products.map((item) => (item.id === id ? updated : item)),
          source: 'api',
          error: null,
        }));
      } finally {
        set({ saving: false });
      }
    },

    deleteProduct: async (id) => {
      set({ saving: true });
      try {
        await ensureBackedByDatabase();
        await api.deleteProduct(id);
        set((state) => ({
          products: state.products.filter((item) => item.id !== id),
          source: 'api',
          error: null,
        }));
      } finally {
        set({ saving: false });
      }
    },

    importSeedCatalog: async () => {
      set({ saving: true });
      try {
        const imported = await api.importProducts(seedProducts);
        set({
          products: sortProducts(seedProducts),
          status: 'ready',
          source: 'api',
          error: null,
        });
        return imported;
      } finally {
        set({ saving: false });
      }
    },
  };
});

/** รายการสินค้าทั้งหมด (จากฐานข้อมูลกลาง หรือข้อมูลสำรองเมื่อเชื่อมต่อไม่ได้) */
export function useCatalogProducts(): Product[] {
  return useProductStore((state) => state.products);
}

/** ตัวเลือกสำหรับตัวกรอง (ขนาด / ชนิด) */
export function useCatalogFacets(): { categories: string[]; sizes: string[] } {
  const catalog = useProductStore((state) => state.products);

  return useMemo(() => {
    const categories = Array.from(
      new Set(catalog.map((product) => product.category).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, 'th'));

    const sizes = Array.from(new Set(catalog.map((product) => product.size).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, 'th', { numeric: true }),
    );

    return { categories, sizes };
  }, [catalog]);
}
