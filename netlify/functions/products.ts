/**
 * Backend API ของแคตตาล็อกสินค้า (Netlify Function)
 *
 *   GET    /api/products        → รายการสินค้าทั้งหมด (สาธารณะ)
 *   POST   /api/products        → เพิ่มสินค้า / นำเข้าทั้งคลัง (แอดมินเท่านั้น)
 *   PUT    /api/products/:id    → แก้ไขสินค้า (แอดมินเท่านั้น)
 *   DELETE /api/products/:id    → ลบสินค้า (แอดมินเท่านั้น)
 */
import { products as seedProducts } from '../../src/data/products';
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
      let products = await repo.list();
      let seedError: string | undefined;

      /**
       * ฐานข้อมูลว่างครั้งแรก (ยังไม่มีใครกด "นำเข้าข้อมูลตั้งต้น") → ใส่ข้อมูลตั้งต้นให้อัตโนมัติ
       * ครั้งเดียว เพื่อให้เว็บที่ deploy ใหม่ใช้งานได้ทันทีโดยไม่ต้องล็อกอินแอดมินก่อน
       * (ถ้าเขียนไม่สำเร็จ เช่น ผู้ใช้ MongoDB เป็น read-only จะไม่ทำให้ GET ล้ม — แค่แสดงผลว่าง)
       */
      if (products.length === 0) {
        try {
          await repo.ensureSeeded(seedProducts);
        } catch (error) {
          console.error('[api] ใส่ข้อมูลตั้งต้นอัตโนมัติไม่สำเร็จ:', error);
          seedError =
            error instanceof Error && error.message
              ? error.message
              : 'เขียนข้อมูลตั้งต้นลงฐานข้อมูลไม่สำเร็จ';
        }

        // คำขออื่นอาจกำลัง seed อยู่ หรือเพิ่งเขียนเสร็จ → อ่านซ้ำอีกไม่กี่ครั้งก่อนตอบว่าว่าง
        for (let attempt = 0; attempt < 4 && products.length === 0; attempt += 1) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 200));
          products = await repo.list();
        }
      }

      const payload: Record<string, unknown> = {
        products,
        count: products.length,
        storage: repo.mode,
      };
      // ส่งสาเหตุกลับไปให้หน้าเว็บแสดงในแบนเนอร์ เพื่อให้ผู้ดูแลระบบตามแก้ได้ทันที
      if (seedError) payload.seedError = seedError;

      return json(200, payload);
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
