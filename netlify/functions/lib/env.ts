/**
 * ค่าตั้งต้นฝั่งเซิร์ฟเวอร์ (อ่านจาก Environment Variables ของ Netlify)
 * หมายเหตุ: ค่าเหล่านี้เป็นความลับ ห้ามขึ้นต้นด้วย VITE_ (เพราะค่านั้นจะถูกฝังลงไฟล์ JS)
 */

/** true เมื่อรันบนเครื่อง (vite dev / netlify dev) — ใช้เปิดโหมดฐานข้อมูลไฟล์ในเครื่อง */
export function isLocalDevelopment(): boolean {
  return (
    process.env.NETLIFY_DEV === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.UDTC_ALLOW_LOCAL_DB === '1'
  );
}

/** อีเมลแอดมินเริ่มต้น (ตรงกับค่าใน src/config/site.ts) */
const DEFAULT_ADMIN_EMAIL = 'admin@udtc.ac.th';

/** อีเมลแอดมินที่อนุญาตให้แก้ไขข้อมูล (ถ้าไม่ตั้ง ADMIN_EMAIL จะใช้ VITE_ADMIN_EMAIL) */
export function adminEmail(): string {
  const value = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '').trim();
  return (value || DEFAULT_ADMIN_EMAIL).toLowerCase();
}

/** Google OAuth Client ID สำหรับตรวจ ID token (ถ้าไม่ตั้ง GOOGLE_CLIENT_ID จะใช้ VITE_GOOGLE_CLIENT_ID) */
export function googleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}
