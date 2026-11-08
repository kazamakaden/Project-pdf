/**
 * Google Identity Services (Sign in with Google) — ทำงานฝั่ง client ทั้งหมด
 * ตรวจ ID token (JWT) ด้วยการอ่าน payload: aud / iss / email_verified / exp
 * หมายเหตุ: การตรวจลายเซ็นของ Google ต้องทำที่เซิร์ฟเวอร์ (ดูข้อจำกัดใน README)
 */

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const SCRIPT_ID = 'google-gsi-client';

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: 'popup' | 'redirect';
}

export interface GoogleIdentityServices {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityServices } };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('ไม่สามารถใช้งาน Google ได้ในสภาพแวดล้อมนี้'));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('โหลดสคริปต์ Google ไม่สำเร็จ')));
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('โหลดสคริปต์ Google ไม่สำเร็จ'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function getGoogleIdentity(): GoogleIdentityServices | null {
  if (typeof window === 'undefined') return null;
  return window.google?.accounts?.id ?? null;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
  expiresAt: number;
  /** ID token ดิบจาก Google — ใช้ส่งให้ Backend ตรวจสิทธิ์ (ลายเซ็นตรวจที่เซิร์ฟเวอร์) */
  credential?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  exp?: number;
}

function decodeBase64Url(value: string): string {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalised.length % 4 === 0 ? '' : '='.repeat(4 - (normalised.length % 4));
  const binary = window.atob(normalised + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

/** อ่านข้อมูลบัญชีจาก ID token และตรวจเงื่อนไขพื้นฐาน */
export function readGoogleCredential(credential: string, expectedAudience: string): GoogleProfile {
  const parts = credential.split('.');
  if (parts.length !== 3) throw new Error('ข้อมูลยืนยันตัวตนไม่ถูกต้อง');

  const payload = JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;

  if (payload.aud !== expectedAudience) throw new Error('Client ID ไม่ตรงกับการตั้งค่า');
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('ผู้ออกบัตรยืนยันไม่ถูกต้อง');
  }

  const email = (payload.email ?? '').trim().toLowerCase();
  if (!email) throw new Error('ไม่พบอีเมลจากบัญชี Google');
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('อีเมล Google ยังไม่ได้รับการยืนยัน');
  }
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  return {
    sub: payload.sub ?? '',
    email,
    emailVerified: true,
    name: payload.name ?? email,
    picture: payload.picture ?? '',
    expiresAt: payload.exp * 1000,
    credential,
  };
}

/**
 * โปรไฟล์จำลองสำหรับ "โหมดทดสอบบนเครื่อง" (ไม่ผ่าน Google OAuth)
 * ใช้เฉพาะเมื่อเปิดเว็บบนเครื่อง (localhost) — ดูเงื่อนไข isLocalHost ใน LoginPage
 */
export function createLocalAdminProfile(email: string, days = 7): GoogleProfile {
  return {
    sub: 'local-admin',
    email: email.trim().toLowerCase(),
    emailVerified: true,
    name: 'ผู้ดูแลระบบ (โหมดทดสอบ)',
    picture: '',
    expiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
  };
}
