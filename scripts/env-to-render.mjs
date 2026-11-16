/**
 * แปลง .env เดิมเป็นบล็อกสำหรับวางใน Render (Environment → Add from .env)
 * ใช้: node scripts/env-to-render.mjs .env
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? '.env';
const KEYS = [
  'VITE_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_ID',
  'VITE_ADMIN_EMAIL',
  'ADMIN_EMAIL',
  'MONGODB_URI',
  'MONGODB_DB',
  'VITE_API_URL',
];

let raw = '';
try {
  raw = readFileSync(file, 'utf8');
} catch {
  console.error('อ่านไฟล์ ' + file + ' ไม่ได้ — ระบุ path ให้ถูก');
  process.exit(1);
}

const values = new Map();
for (const line of raw.split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (!match) continue;
  values.set(match[1], match[2].replace(/^["']|["']$/g, ''));
}

const missing = [];
for (const key of KEYS) {
  const value = values.get(key) ?? (key === 'MONGODB_DB' ? 'udtc' : '');
  if (!value && key !== 'VITE_API_URL') missing.push(key);
  console.log(key + '=' + value);
}

if (missing.length) {
  console.error('\n# ยังขาดค่า: ' + missing.join(', '));
}
