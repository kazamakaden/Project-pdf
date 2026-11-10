/**
 * API ออกเลขที่เอกสารกลาง: POST /api/doc-number
 * ตอบกลับ { code, seq, isoDate, dateLabel, source }
 */
import { allocateDocumentNumber } from './lib/docCounter';
import { errorResponse, HttpError, json } from './lib/http';
import type { ApiEvent, ApiResponse } from './lib/types';

export async function handleApi(event: ApiEvent): Promise<ApiResponse> {
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();

    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: { allow: 'POST,OPTIONS' }, body: '' };
    }

    if (method !== 'POST') {
      throw new HttpError(405, 'การออกเลขที่เอกสารต้องใช้วิธี POST');
    }

    return json(200, await allocateDocumentNumber());
  } catch (error) {
    return errorResponse(error);
  }
}
