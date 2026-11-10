import { create } from 'zustand';
import { allocateDocNumberRemote } from '@/lib/api';
import { allocateLocalDocNumber, thaiDateLabel } from '@/utils/docNumber';
import type { DocNumberInfo } from '@/utils/docNumber';

/**
 * เก็บเลขที่เอกสารของ "ใบปัจจุบัน" ไว้ใน localStorage
 * key = ลายนิ้วมือของตะกร้า (สินค้า + จำนวน + ราคา + VAT)
 *
 * - key เดิม → ใช้เลขเดิม (ดาวน์โหลดซ้ำ/รีเฟรชแล้วยังเป็นใบเดียวกัน)
 * - key เปลี่ยน → ขอเลขใหม่จาก API กลาง (กันซ้ำข้ามเครื่อง)
 * - API ใช้ไม่ได้ → ใช้เลขสำรองในเครื่อง เพื่อให้พิมพ์เอกสารได้เสมอ
 */
const STORAGE_KEY = 'lmc-doc-current';

interface SavedNumber extends DocNumberInfo {
  key: string;
}

function readSaved(): SavedNumber | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedNumber> | null;
    if (
      parsed &&
      typeof parsed.key === 'string' &&
      typeof parsed.code === 'string' &&
      typeof parsed.dateLabel === 'string' &&
      typeof parsed.isoDate === 'string'
    ) {
      return parsed as SavedNumber;
    }
  } catch {
    /* ข้อมูลเสีย — ออกเลขใหม่ */
  }
  return null;
}

function save(next: SavedNumber): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage ถูกปิด — ใช้ค่าในหน่วยความจำ */
  }
}

/** กันคำขอเก่ามาเขียนทับคำขอใหม่ */
let requestToken = 0;

interface DocNumberState extends DocNumberInfo {
  /** ลายนิ้วมือตะกร้าที่ผูกกับเลขนี้ */
  key: string;
  /** ตะกร้าที่กำลังขอเลขอยู่ */
  pendingKey: string;
  /** เรียกทุกครั้งที่หน้าใบขอซื้อแสดง — ออกเลขใหม่เฉพาะเมื่อตะกร้าเปลี่ยน */
  sync: (key: string) => void;
}

export const useDocNumberStore = create<DocNumberState>((set, get) => {
  const saved = readSaved();
  return {
    key: saved?.key ?? '',
    code: saved?.code ?? '',
    dateLabel: saved?.dateLabel ?? '',
    isoDate: saved?.isoDate ?? '',
    pendingKey: '',
    sync: (key) => {
      if (!key) return;
      if (get().key === key && get().code) return;
      if (get().pendingKey === key) return;

      const token = (requestToken += 1);
      // ล้างเลขเดิมก่อน เพื่อไม่ให้เลขของใบเก่าค้างอยู่ระหว่างรอเลขใหม่
      set({ pendingKey: key, key: '', code: '', dateLabel: '', isoDate: '' });

      void (async () => {
        let info: DocNumberInfo;
        try {
          const remote = await allocateDocNumberRemote();
          info = {
            code: remote.code,
            isoDate: remote.isoDate,
            dateLabel: remote.dateLabel || thaiDateLabel(remote.isoDate),
          };
        } catch {
          // เซิร์ฟเวอร์ใช้ไม่ได้ → เลขสำรองในเครื่อง
          info = allocateLocalDocNumber();
        }

        if (token !== requestToken) return;

        const next: SavedNumber = { key, ...info };
        save(next);
        set({ ...next, pendingKey: '' });
      })();
    },
  };
});
