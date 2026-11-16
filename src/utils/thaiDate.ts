/**
 * ตัวช่วยเรื่องวันที่ไทย (ใช้ทั้งฝั่งเว็บและ Netlify Function — ห้ามใช้ API ของเบราว์เซอร์ในไฟล์นี้)
 *
 * ใช้แสดง "วันที่" บนใบประมาณการค่าใช้จ่ายเท่านั้น
 * (ระบบออกเลขที่เอกสาร PR-... ถูกยกเลิกแล้ว ไม่มีการออกเลขอีก)
 */

/** วันที่วันนี้ตามเวลาไทย (Asia/Bangkok) เป็น YYYY-MM-DD */
export function bangkokTodayIso(now: Date = new Date()): string {
  // en-CA ให้รูปแบบปี-เดือน-วัน (YYYY-MM-DD)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** แปลงวันที่ ISO เป็นข้อความไทย เช่น "10 พฤศจิกายน 2569" */
export function thaiDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  // ใช้เที่ยงวัน UTC เพื่อไม่ให้วันที่เลื่อนเมื่อแปลงเป็นเวลาไทย (+7)
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
