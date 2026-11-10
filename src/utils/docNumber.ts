/**
 * เลขที่เอกสาร + วันที่ไทย (ค่าเริ่มต้น = วันนี้ตามเวลาไทย)
 *
 * รูปแบบ: PR-<ปี พ.ศ.>-<เดือน><วัน>-<ลำดับของวันนั้น>
 *   ตัวอย่าง: PR-2569-1110-001  (10 พ.ย. 2569 ใบที่ 1 ของวัน)
 *
 * เลขจะถูกจองครั้งแรกที่เปิดหน้าใบขอซื้อ (ต่อตะกร้า 1 ใบ)
 * แล้วเก็บไว้ใน localStorage — ดาวน์โหลดซ้ำใบเดิมจะได้เลขเดิม
 * เปลี่ยนรายการในตะกร้าเมื่อไร = ใบใหม่ = เลขใหม่
 */

export interface DocNumberInfo {
  /** รหัสเอกสาร เช่น PR-2569-1110-001 */
  code: string;
  /** วันที่แบบไทย เช่น 10 พฤศจิกายน 2569 */
  dateLabel: string;
  /** วันที่ตามเวลาไทยแบบ ISO เช่น 2026-11-10 */
  isoDate: string;
}

const SEQ_KEY = 'lmc-doc-seq';

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

/** จองเลขใหม่ของวันนี้ (ลำดับรีเซ็ตเมื่อขึ้นวันใหม่ตามเวลาไทย) */
export function allocateDocNumber(now: Date = new Date()): DocNumberInfo {
  const isoDate = bangkokTodayIso(now);
  let seq = 1;

  try {
    const raw = window.localStorage.getItem(SEQ_KEY);
    const saved = raw ? (JSON.parse(raw) as { date?: string; seq?: number }) : null;
    if (saved?.date === isoDate && typeof saved.seq === 'number' && saved.seq > 0) {
      seq = saved.seq + 1;
    }
    window.localStorage.setItem(SEQ_KEY, JSON.stringify({ date: isoDate, seq }));
  } catch {
    /* localStorage ถูกปิด — ใช้ลำดับ 1 */
  }

  return { code: buildDocCode(isoDate, seq), dateLabel: thaiDateLabel(isoDate), isoDate };
}
