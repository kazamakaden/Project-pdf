/**
 * ตรวจสิทธิ์แอดมินฝั่งเซิร์ฟเวอร์
 * - production: ตรวจลายเซ็น Google ID token ด้วย google-auth-library แล้วเทียบอีเมลกับ ADMIN_EMAIL
 * - บนเครื่อง (dev): ยอมรับโทเคน `local-admin:<อีเมล>` จากปุ่ม "เข้าสู่ระบบแบบโลคอล"
 */
import { OAuth2Client } from 'google-auth-library';
import { adminEmail, googleClientId, isLocalDevelopment } from './env';
import { HttpError } from './http';
import type { ApiEvent } from './types';

const LOCAL_PREFIX = 'local-admin:';

let googleClient: OAuth2Client | null = null;

function readToken(event: ApiEvent): string {
  const raw = event.headers?.authorization ?? event.headers?.Authorization ?? '';
  const token = raw.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new HttpError(401, 'ต้องเข้าสู่ระบบก่อนแก้ไขข้อมูล');
  return token;
}

function assertAdminEmail(email: string): string {
  const expected = adminEmail();
  if (!expected) {
    throw new HttpError(500, 'ยังไม่ได้ตั้งค่า ADMIN_EMAIL บนเซิร์ฟเวอร์ (Environment Variables)');
  }
  if (email.trim().toLowerCase() !== expected) {
    throw new HttpError(403, 'บัญชี ' + email + ' ไม่มีสิทธิ์แก้ไขข้อมูล');
  }
  return expected;
}

/** คืนอีเมลแอดมินเมื่อตรวจสิทธิ์ผ่าน (throws HttpError เมื่อไม่ผ่าน) */
export async function requireAdmin(event: ApiEvent): Promise<string> {
  const token = readToken(event);

  if (token.startsWith(LOCAL_PREFIX)) {
    if (!isLocalDevelopment()) {
      throw new HttpError(401, 'โหมดทดสอบใช้ได้เฉพาะเมื่อเปิดเว็บบนเครื่อง (localhost)');
    }
    return assertAdminEmail(token.slice(LOCAL_PREFIX.length));
  }

  const clientId = googleClientId();
  if (!clientId) {
    throw new HttpError(500, 'ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID บนเซิร์ฟเวอร์ (Environment Variables)');
  }

  try {
    googleClient ??= new OAuth2Client(clientId);
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error('ไม่พบอีเมลในโทเคน');
    if (payload.email_verified !== true) throw new Error('อีเมลยังไม่ได้รับการยืนยัน');
    return assertAdminEmail(payload.email);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'ยืนยันสิทธิ์กับ Google ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
  }
}
