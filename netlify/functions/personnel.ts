/**
 * Backend API ของ "ทำเนียบบุคลากร" (Netlify Function)
 *
 *   GET    /api/personnel        → รายชื่อบุคลากรทั้งหมด (สาธารณะ ใช้แสดงใน Footer)
 *   POST   /api/personnel        → เพิ่มบุคลากร (แอดมินเท่านั้น)
 *   PUT    /api/personnel/:id    → แก้ไขชื่อ/ตำแหน่ง (แอดมินเท่านั้น)
 *   DELETE /api/personnel/:id    → ลบบุคลากร (แอดมินเท่านั้น)
 */
import { requireAdmin } from './lib/auth';
import { errorResponse, HttpError, json } from './lib/http';
import { getPersonnelRepo } from './lib/personnelRepo';
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

/** รองรับทั้ง /api/personnel/ps123 และ /api/personnel?id=ps123 */
function readPersonId(event: ApiEvent): string {
  const fromQuery = event.queryStringParameters?.id?.trim();
  if (fromQuery) return fromQuery;

  const segments = (event.path ?? '').split('/').filter(Boolean);
  const index = segments.lastIndexOf('personnel');
  const candidate = index >= 0 ? segments[index + 1] : undefined;
  if (candidate) return decodeURIComponent(candidate);

  throw new HttpError(400, 'ไม่พบรหัสบุคลากรใน URL');
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

    const repo = getPersonnelRepo();

    if (method === 'GET') {
      const people = await repo.list();
      return json(200, { people, count: people.length, storage: repo.mode });
    }

    if (method === 'POST') {
      const admin = await requireAdmin(event);
      const person = await repo.create(parseBody(event));
      return json(201, { person, storage: repo.mode, by: admin });
    }

    if (method === 'PUT' || method === 'PATCH') {
      const admin = await requireAdmin(event);
      const id = readPersonId(event);
      const person = await repo.update(id, parseBody(event));
      if (!person) throw new HttpError(404, 'ไม่พบบุคลากรรหัส ' + id);
      return json(200, { person, storage: repo.mode, by: admin });
    }

    if (method === 'DELETE') {
      const admin = await requireAdmin(event);
      const id = readPersonId(event);
      const removed = await repo.remove(id);
      if (!removed) throw new HttpError(404, 'ไม่พบบุคลากรรหัส ' + id);
      return json(200, { deleted: id, storage: repo.mode, by: admin });
    }

    throw new HttpError(405, 'ไม่รองรับ method ' + method);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Netlify Functions entrypoint — เรียกผ่าน /api/personnel (ดู netlify.toml) */
export const handler = handleApi;
