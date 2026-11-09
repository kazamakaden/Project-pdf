/**
 * ตัวเรียก Backend API (Netlify Functions)
 * - ค่าเริ่มต้นเรียก path เดียวกันกับเว็บ (`/api/...`) จึงไม่ติด CORS
 * - ถ้า API อยู่คนละโดเมน ให้ตั้ง VITE_API_URL ใน Environment Variables
 */
import { useAuthStore } from '@/store/auth';
import type { Product } from '@/types/product';

const BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function endpoint(path: string): string {
  return BASE + '/api' + path;
}

/**
 * โทเคนสำหรับเรียก API ที่ต้องเป็นแอดมิน
 * - ล็อกอิน Google → ใช้ ID token (ตรวจลายเซ็นที่เซิร์ฟเวอร์)
 * - โหมดทดสอบบนเครื่อง → ใช้ `local-admin:<อีเมล>` (เซิร์ฟเวอร์รับเฉพาะตอน dev)
 */
export function getAdminToken(): string | null {
  const user = useAuthStore.getState().user;
  if (!user) return null;
  if (user.sub === 'local-admin') return 'local-admin:' + user.email;
  return user.credential ?? null;
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  if (!token) throw new ApiError('กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล', 401);
  return { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint(path), init);
  } catch {
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต', 0);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = (payload as { error?: unknown } | null)?.error;
    throw new ApiError(
      typeof message === 'string' ? message : 'เซิร์ฟเวอร์ตอบกลับ ' + response.status,
      response.status,
    );
  }

  return payload as T;
}

export interface ProductInput {
  name: string;
  category: string;
  size: string;
  model: string;
  brand: string;
  unit: string;
  price: number;
  note: string;
  imageUrl?: string;
}

export interface ProductListResult {
  products: Product[];
  /** ข้อผิดพลาดตอนเซิร์ฟเวอร์พยายามใส่ข้อมูลตั้งต้นอัตโนมัติ (ถ้ามี) — ใช้แจ้งในแบนเนอร์ */
  seedError?: string;
}

export const api = {
  /** รายการสินค้าทั้งหมด (สาธารณะ) — เซิร์ฟเวอร์จะใส่ข้อมูลตั้งต้นอัตโนมัติถ้าฐานข้อมูลว่าง */
  async listProducts(): Promise<ProductListResult> {
    const data = await request<{ products?: Product[]; seedError?: string }>('/products', {
      headers: { accept: 'application/json' },
    });
    return {
      products: Array.isArray(data.products) ? data.products : [],
      seedError:
        typeof data.seedError === 'string' && data.seedError ? data.seedError : undefined,
    };
  },

  /** เพิ่มสินค้า (ต้องเป็นแอดมิน) */
  async createProduct(input: ProductInput): Promise<Product> {
    const data = await request<{ product: Product }>('/products', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(input),
    });
    return data.product;
  },

  /** แก้ไขสินค้า (ต้องเป็นแอดมิน) — ส่ง id ทาง query เพื่อให้ตรงกับ redirect ของ Netlify ทุกกรณี */
  async updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
    const data = await request<{ product: Product }>('/products?id=' + encodeURIComponent(id), {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify(patch),
    });
    return data.product;
  },

  /** ลบสินค้า (ต้องเป็นแอดมิน) */
  async deleteProduct(id: string): Promise<void> {
    await request<{ deleted: string }>('/products?id=' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: adminHeaders(),
    });
  },

  /** เขียนทับทั้งคลังด้วยข้อมูลตั้งต้น (ใช้ครั้งแรก + ปุ่ม "คืนค่า") */
  async importProducts(products: Product[]): Promise<number> {
    const data = await request<{ imported?: number }>('/products', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ mode: 'replace', products }),
    });
    return typeof data.imported === 'number' ? data.imported : products.length;
  },
};
