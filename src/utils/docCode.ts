/**
 * ตัวช่วยเรื่องเลขที่เอกสาร (ใช้ร่วมกันทั้งฝั่งเว็บและ Netlify Function — ห้ามใช้ API ของเบราว์เซอร์ในไฟล์นี้)
 *
 * รูปแบบ: PR-<ปี พ.ศ.>-<เดือน><วัน>-<ลำดับของวันนั้น>
 *   ตัวอย่าง: PR-2569-1110-001  (10 พ.ย. 2569 ใบที่ 1 ของวัน)
 */

export interface DocNumberInfo {
  /** รหัสเอกสาร เช่น PR-2569-1110-001 */
  code: string;
  /** วันที่แบบไทย เช่น 10 พฤศจิกายน 2569 */
  dateLabel: string;
  /** วันที่ตามเวลาไทยแบบ ISO เช่น 2026-11-10 */
  isoDate: string;
}

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

/** สร้างรหัสจากวันที่ + ลำดับ */
export function buildDocCode(isoDate: string, seq: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const yearBe = year + 543;
  const monthDay = `${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  return `PR-${yearBe}-${monthDay}-${String(seq).padStart(3, '0')}`;
}

/** แปลง seq จากรหัส (ใช้ตรวจสอบในเทสต์) */
export function parseDocSeq(code: string): number {
  const match = /-(\d{3,})$/.exec(code);
  return match ? Number(match[1]) : 0;
}
