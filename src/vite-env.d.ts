/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Client ID (สร้างจาก Google Cloud Console) */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** อีเมล Google ของเจ้าของเว็บ (คนเดียวที่มีสิทธิ์แก้ไขข้อมูล) */
  readonly VITE_ADMIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}