import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** ค่าลับฝั่งเซิร์ฟเวอร์ที่โหลดจาก .env เข้า process.env (เฉพาะตอนรันบนเครื่อง) */
const SERVER_ENV_KEYS = [
  'MONGODB_URI',
  'MONGODB_DB',
  'ADMIN_EMAIL',
  'VITE_ADMIN_EMAIL',
  'GOOGLE_CLIENT_ID',
  'VITE_GOOGLE_CLIENT_ID',
  'UDTC_ALLOW_LOCAL_DB',
  'UDTC_LOCAL_DB_DIR',
];

/**
 * รัน Netlify Function ในเครื่องผ่าน Vite dev server
 * → `npm run dev` แล้วเรียก /api/products ได้ทันที ไม่ต้องติดตั้ง Netlify CLI
 * (บน Netlify จริงใช้ netlify/functions + redirect ใน netlify.toml)
 */
function devApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'udtc-dev-api',
    apply: 'serve',
    configureServer(server) {
      for (const key of SERVER_ENV_KEYS) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }

      server.middlewares.use('/api', (req, res) => {
        void (async () => {
          try {
            // เลือก Netlify Function ตาม path: /api/personnel → personnel.ts, ที่เหลือ → products.ts
            const pathname = (req.url ?? '/').split('?')[0];
            const functionPath = pathname.startsWith('/personnel')
              ? '/netlify/functions/personnel.ts'
              : '/netlify/functions/products.ts';
            const { handleApi } = await server.ssrLoadModule(functionPath);

            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
            const body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : null;

            const requestUrl = new URL(req.url ?? '/', 'http://localhost');
            const response = await handleApi({
              httpMethod: req.method ?? 'GET',
              path: '/api' + (req.url ?? '/').split('?')[0],
              headers: req.headers as Record<string, string | undefined>,
              queryStringParameters: Object.fromEntries(requestUrl.searchParams.entries()),
              body,
              isBase64Encoded: false,
            });

            res.statusCode = response.statusCode;
            const responseHeaders: Record<string, string> = response.headers ?? {};
            for (const [key, value] of Object.entries(responseHeaders)) {
              res.setHeader(key, value);
            }
            res.end(response.body);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดใน Dev API',
              }),
            );
          }
        })();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), devApiPlugin(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
