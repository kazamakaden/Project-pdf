/**
 * ข้อมูลองค์กรและค่าตั้งต้นของระบบ
 * 👉 แก้ไขข้อมูลติดต่อได้ที่ไฟล์นี้ไฟล์เดียว
 * (รายชื่อ "ทำเนียบบุคลากร" แก้ไขได้จากหน้าผู้ดูแลระบบ ไม่ใช่ไฟล์นี้)
 */
const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim() ?? '';
const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

export const SITE = {
  nameTh: 'วิทยาลัยเทคนิคอุดรธานี',
  nameEn: 'Udon Thani Technical College',
  tagline: 'ระบบพัสดุสำนักงาน · ราคากลาง',
  description: 'ระบบพัสดุสำนักงาน วิทยาลัยเทคนิคอุดรธานี',
  address: 'เลขที่ 3 ถนนวัฒนานุวงศ์ ตำบลหมากแข้ง อำเภอเมือง จังหวัดอุดรธานี 41000',
  phone: '042-221538',
  fax: '042-240031, 042-246038',
  email: 'webmaster@udontech.ac.th',
  website: 'หน้างานพัสดุ วิทยาลัยเทคนิคอุดรธานี',
  documentFooter: 'เอกสารฉบับนี้สร้างจากระบบพัสดุสำนักงานออนไลน์ · วิทยาลัยเทคนิคอุดรธานี',
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
