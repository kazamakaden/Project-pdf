import { create } from 'zustand';
import { allocateDocNumber } from '@/utils/docNumber';
import type { DocNumberInfo } from '@/utils/docNumber';

/**
 * เก็บเลขที่เอกสารของ "ใบปัจจุบัน" ไว้ใน localStorage
 * key = ลายนิ้วมือของตะกร้า (สินค้า + จำนวน + ราคา + VAT)
 * ถ้า key เดิม → ใช้เลขเดิม (ดาวน์โหลดซ้ำ/รีเฟรชแล้วยังเป็นใบเดียวกัน)
 * ถ้า key เปลี่ยน → ออกเลขใหม่ให้ใบใหม่
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

interface DocNumberState extends DocNumberInfo {
  /** ลายนิ้วมือตะกร้าที่ผูกกับเลขนี้ */
  key: string;
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
    sync: (key) => {
      if (!key) return;
      if (get().key === key && get().code) return;

      const info = allocateDocNumber();
      const next: SavedNumber = { key, ...info };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* localStorage ถูกปิด — ใช้ค่าในหน่วยความจำ */
      }
      set(next);
    },
  };
});
