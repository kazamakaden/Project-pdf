/**
 * เลขที่เอกสารฝั่งเว็บ
 * - ปกติได้เลขจาก API กลาง (MongoDB) เพื่อกันซ้ำข้ามเครื่อง
 * - ถ้าเชื่อมต่อ API ไม่ได้ จะสำรองด้วยเลขในเครื่อง (localStorage) เพื่อให้พิมพ์ได้เสมอ
 *
 * รูปแบบ: PR-<ปี พ.ศ.>-<เดือน><วัน>-<ลำดับของวันนั้น>
 */
import { bangkokTodayIso, buildDocCode, thaiDateLabel } from './docCode';
import type { DocNumberInfo } from './docCode';

export { bangkokTodayIso, buildDocCode, thaiDateLabel, parseDocSeq } from './docCode';
export type { DocNumberInfo } from './docCode';

const SEQ_KEY = 'lmc-doc-seq';

/** เลขสำรองในเครื่อง (ใช้เมื่อเรียก API ไม่ได้) — ลำดับรีเซ็ตเมื่อขึ้นวันใหม่ตามเวลาไทย */
export function allocateLocalDocNumber(now: Date = new Date()): DocNumberInfo {
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
