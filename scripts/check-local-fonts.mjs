/**
 * ตรวจว่าเว็บไม่เรียกฟอนต์จากอินเทอร์เน็ตแล้ว และฟอนต์ Sarabun/Prompt โหลดจาก /fonts/ จริง
 * node scripts/check-local-fonts.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.SMOKE_PORT ?? 9336);
const APP_URL = process.env.SMOKE_URL ?? 'http://localhost:5199/';

const profile = mkdtempSync(join(tmpdir(), 'udtc-font-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1000',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function getTarget() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      /* not ready */
    }
    await sleep(250);
  }
  throw new Error('no target');
}

function createClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let seq = 0;
    ws.onopen = () =>
      resolve({
        send(method, params = {}) {
          const id = (seq += 1);
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close: () => ws.close(),
      });
    ws.onerror = () => reject(new Error('ws error'));
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
  });
}

let client;
let code = 0;
try {
  const target = await getTarget();
  client = await createClient(target.webSocketDebuggerUrl);
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Page.navigate', { url: APP_URL });
  await sleep(3500);

  const { result } = await client.send('Runtime.evaluate', {
    expression: `(async () => {
      await document.fonts.ready;
      const resources = performance.getEntriesByType('resource').map((r) => r.name);
      const external = resources.filter((u) => !u.startsWith(location.origin) && !u.startsWith('data:'));
      const fontFiles = resources.filter((u) => u.includes('/fonts/'));
      return {
        external,
        fontFiles,
        sarabun: document.fonts.check('13px Sarabun'),
        sarabunBold: document.fonts.check('bold 13px Sarabun'),
        prompt: document.fonts.check('16px Prompt'),
        family: getComputedStyle(document.body).fontFamily,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  const data = result.value;
  console.log(JSON.stringify(data, null, 2));
  const ok =
    data.external.length === 0 &&
    data.sarabun === true &&
    data.sarabunBold === true &&
    data.prompt === true &&
    data.fontFiles.length > 0;
  console.log(ok ? 'PASS: ใช้ฟอนต์ในเว็บ 100% ไม่มีการเรียกออกอินเทอร์เน็ต' : 'FAIL');
  if (!ok) code = 1;
} catch (error) {
  console.error('ERR', error.message);
  code = 1;
} finally {
  try {
    client?.close();
  } catch {
    /* ignore */
  }
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
  process.exit(code);
}
