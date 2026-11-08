/**
 * ชนิดข้อมูลของ Netlify Functions
 * ประกาศเองเพื่อไม่ต้องเพิ่ม dependency `@netlify/functions`
 */

export interface ApiEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  body: string | null;
  isBase64Encoded?: boolean;
}

export interface ApiResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}
