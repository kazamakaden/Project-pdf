import { create } from 'zustand';

/** ฟอนต์ที่เลือกใช้ใน "เอกสาร/PDF" (ไม่กระทบฟอนต์หน้าเว็บ) */
export type DocFontId = 'thsarabun' | 'sarabun';

export interface DocFontOption {
  id: DocFontId;
  /** ชื่อที่แสดงในเมนู */
  label: string;
  /** ชื่อ family สำหรับ CSS */
  family: string;
  /** ตัวคูณขนาดตัวอักษร — TH Sarabun New ตัวเล็กกว่า Sarabun จึงขยายให้อ่านง่ายเท่ากัน */
  scale: number;
}

export const DOC_FONTS: DocFontOption[] = [
  { id: 'thsarabun', label: 'TH Sarabun New (ราชการ)', family: "'TH Sarabun New'", scale: 1.2 },
  { id: 'sarabun', label: 'Sarabun', family: "'Sarabun'", scale: 1 },
];

/** ค่าเริ่มต้น: ฟอนต์ราชการ TH Sarabun New */
export const DEFAULT_DOC_FONT: DocFontId = 'thsarabun';

const STORAGE_KEY = 'lmc-doc-font';

function readInitialFont(): DocFontId {
  if (typeof window === 'undefined') return DEFAULT_DOC_FONT;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'thsarabun' || saved === 'sarabun') return saved;
  } catch {
    /* localStorage ถูกปิด */
  }
  return DEFAULT_DOC_FONT;
}

interface DocFontState {
  font: DocFontId;
  setFont: (font: DocFontId) => void;
}

export const useDocFontStore = create<DocFontState>((set) => {
  const initial = readInitialFont();
  return {
    font: initial,
    setFont: (font) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, font);
      } catch {
        /* localStorage ถูกปิด */
      }
      set({ font });
    },
  };
});

export function docFontOption(id: DocFontId): DocFontOption {
  return DOC_FONTS.find((option) => option.id === id) ?? DOC_FONTS[0];
}
