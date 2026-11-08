import type { ApiResponse } from './types';

/** ข้อผิดพลาดที่ตั้งใจส่งกลับให้ client พร้อม HTTP status */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const BASE_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function json(
  statusCode: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {},
): ApiResponse {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

/** แปลง error ใด ๆ ให้เป็น response มาตรฐาน (ไม่ให้ stack trace หลุดออกไป) */
export function errorResponse(error: unknown): ApiResponse {
  if (error instanceof HttpError) return json(error.status, { error: error.message });
  console.error('[api] unexpected error:', error);
  const message = error instanceof Error && error.message ? error.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
  return json(500, { error: message });
}
