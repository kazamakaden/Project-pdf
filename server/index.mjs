/**
 * เซิร์ฟเวอร์สำหรับ Render.com
 * - เสิร์ฟไฟล์เว็บที่ build แล้ว (dist)
 * - รับ path /api/* แล้วส่งต่อเข้า Netlify Function เดิม (handleApi) โดยไม่ต้องเขียน API ใหม่
 * - fallback ไป index.html เพื่อให้ React Router ทำงาน
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

/** ฟังก์ชันเดิมเป็น CommonJS ที่ผ่าน esbuild — โหลดด้วย require เพื่อไม่ชนกับ ESM */
const require = createRequire(import.meta.url);
const { handleApi: productsApi } = require('./api/products.cjs');
const { handleApi: personnelApi } = require('./api/personnel.cjs');
const { handleApi: docNumberApi } = require('./api/doc-number.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT || 10000);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

/** เก็บ body ดิบไว้ให้ฟังก์ชันเดิมอ่านเอง (มัน parse JSON เองอยู่แล้ว) */
app.use(express.text({ type: '*/*', limit: '12mb' }));

function pickHandler(apiPath) {
  if (apiPath.startsWith('/personnel')) return personnelApi;
  if (apiPath.startsWith('/doc-number')) return docNumberApi;
  return productsApi;
}

app.all('/api/*', async (req, res) => {
  const handler = pickHandler(req.path.slice('/api'.length));
  const event = {
    httpMethod: req.method,
    path: req.originalUrl.split('?')[0],
    headers: req.headers,
    queryStringParameters: req.query,
    body: typeof req.body === 'string' ? req.body : req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
  };

  try {
    const result = await handler(event);
    res.status(result.statusCode || 200);
    for (const [key, value] of Object.entries(result.headers || {})) res.setHeader(key, value);
    res.send(result.body ?? '');
  } catch (error) {
    console.error('[api] ผิดพลาด:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์ขัดข้อง' });
  }
});

app.use(express.static(DIST, { maxAge: '1h', index: false }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log('UDTC quotation site on port ' + PORT);
});
