/**
 * ข้อมูลองค์กรและค่าตั้งต้นของระบบ
 * 👉 แก้ไขข้อมูลติดต่อ/ผู้ลงนามได้ที่ไฟล์นี้ไฟล์เดียว
 */
const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim() ?? '';
const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

export const SITE = {
  nameTh: 'วิทยาลัยเทคนิคอุดรธานี',
  nameEn: 'Udon Thani Technical College',
  tagline: 'ระบบวัสดุสำนักงาน · ออกใบเสนอราคาออนไลน์',
  description:
    'ศูนย์จำหน่ายวัสดุสำนักงานและอุปกรณ์เครื่องเขียนสำหรับนักศึกษาและบุคลากร พร้อมระบบออกใบเสนอราคาออนไลน์',
  address: 'วิทยาลัยเทคนิคอุดรธานี ตำบลหมากแข้ง อำเภอเมือง จังหวัดอุดรธานี 41000',
  phone: '042-221-336',
  fax: '042-221-337',
  taxId: '0994000000000',
  signatoryName: 'ผู้อำนวยการวิทยาลัยเทคนิคอุดรธานี',
  signatoryTitle: 'ผู้เสนอราคา / ผู้อนุมัติ',
  documentFooter: 'เอกสารฉบับนี้สร้างจากระบบใบเสนอราคาออนไลน์',
} as const;

/** Google OAuth Client ID — ถ้าว่าง ระบบจะปิดการเข้าสู่ระบบไว้ก่อน */
export const GOOGLE_CLIENT_ID = envClientId;

/** อีเมล Google ของเจ้าของเว็บ (อนุญาตให้แก้ไขได้เพียงอีเมลเดียว) */
export const ADMIN_EMAIL = (envAdminEmail || 'admin@udtc.ac.th').toLowerCase();

export const IS_GOOGLE_CONFIGURED = GOOGLE_CLIENT_ID.length > 0;

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}
