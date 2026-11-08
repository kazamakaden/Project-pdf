/**
 * Backend API ของแคตตาล็อกสินค้า (Netlify Function)
 *
 *   GET    /api/products        → รายการสินค้าทั้งหมด (สาธารณะ)
 *   POST   /api/products        → เพิ่มสินค้า / นำเข้าทั้งคลัง (แอดมินเท่านั้น)
 *   PUT    /api/products/:id    → แก้ไขสินค้า (แอดมินเท่านั้น)
 *   DELETE /api/products/:id    → ลบสินค้า (แอดมินเท่านั้น)
 */
import { requireAdmin } from './lib/auth';
import { errorResponse, HttpError, json } from './lib/http';
import { getRepo } from './lib/repo';
import type { ApiEvent, ApiResponse } from './lib/types';

function parseBody(event: ApiEvent): Record<string, unknown> {
  if (!event.body) throw new HttpError(400, 'ไม่พบข้อมูลที่ส่งมา');
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'ข้อมูลที่ส่งมาต้องเป็นออบเจกต์');
  }
  return parsed as Record<string, unknown>;
}

/** รองรับทั้ง /api/products/p001 และ /api/products?id=p001 */
function readProductId(event: ApiEvent): string {
  const fromQuery = event.queryStringParameters?.id?.trim();
  if (fromQuery) return fromQuery;

  const segments = (event.path ?? '').split('/').filter(Boolean);
  const index = segments.lastIndexOf('products');
  const candidate = index >= 0 ? segments[index + 1] : undefined;
  if (candidate) return decodeURIComponent(candidate);

  throw new HttpError(400, 'ไม่พบรหัสสินค้าใน URL');
}

export async function handleApi(event: ApiEvent): Promise<ApiResponse> {
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();

    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: { allow: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
        body: '',
      };
    }

    const repo = getRepo();

    if (method === 'GET') {
      const products = await repo.list();
      return json(200, { products, count: products.length, storage: repo.mode });
    }

    if (method === 'POST') {
      const admin = await requireAdmin(event);
      const body = parseBody(event);

      if (body.mode === 'replace') {
        const imported = await repo.replaceAll(body.products);
        return json(200, { imported, storage: repo.mode, by: admin });
      }

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) throw new HttpError(400, 'กรุณากรอกชื่อสินค้า');

      const product = await repo.create(body);
      return json(201, { product, storage: repo.mode, by: admin });
    }

    if (method === 'PUT' || method === 'PATCH') {
      const admin = await requireAdmin(event);
      const id = readProductId(event);
      const product = await repo.update(id, parseBody(event));
      if (!product) throw new HttpError(404, 'ไม่พบสินค้ารหัส ' + id);
      return json(200, { product, storage: repo.mode, by: admin });
    }

    if (method === 'DELETE') {
      const admin = await requireAdmin(event);
      const id = readProductId(event);
      const removed = await repo.remove(id);
      if (!removed) throw new HttpError(404, 'ไม่พบสินค้ารหัส ' + id);
      return json(200, { deleted: id, storage: repo.mode, by: admin });
    }

    throw new HttpError(405, 'ไม่รองรับ method ' + method);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Netlify Functions entrypoint — เรียกผ่าน /api/products (ดู netlify.toml) */
export const handler = handleApi;
