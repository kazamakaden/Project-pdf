/**
 * จับภาพหน้าจอหน้าเว็บ (ใช้ตรวจผลลัพธ์ด้วยตา)
 * ใช้: node scripts/shot.mjs [url] [out.png]
 * env: CHROME_PATH, SMOKE_PORT
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME_PATH ?? 'google-chrome';
const PORT = Number(process.env.SMOKE_PORT ?? 9340);
const URL = process.argv[2] ?? 'http://127.0.0.1:4173/';
const OUT = resolve(process.argv[3] ?? 'work/shot-page.png');

const profile = mkdtempSync(join(tmpdir(), 'shot-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1600',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function waitDebugger() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return res.json();
    } catch {
      /* not ready */
    }
    await sleep(250);
  }
  throw new Error('chrome debugger not reachable');
}

function client(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let seq = 0;
    ws.onopen = () =>
      res({
        send(method, params = {}) {
          const id = (seq += 1);
          return new Promise((ok, fail) => {
            pending.set(id, { ok, fail });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close: () => ws.close(),
      });
    ws.onerror = () => rej(new Error('ws error'));
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { ok, fail } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
      }
    };
  });
}

try {
  await waitDebugger();
  let target;
  for (let i = 0; i < 40 && !target; i += 1) {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
    if (!target) await sleep(250);
  }
  const cdp = await client(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: URL });
  await sleep(3000);
  const text = await cdp.send('Runtime.evaluate', {
    expression: 'document.body.innerText.slice(0, 400)',
    returnByValue: true,
  });
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  writeFileSync(OUT, Buffer.from(data, 'base64'));
  console.log('shot:', OUT);
  console.log(text.result.value.replace(/\n+/g, ' | ').slice(0, 300));
  cdp.close();
} catch (error) {
  console.error('FAIL:', error.message ?? error);
  process.exitCode = 1;
} finally {
  chrome.kill();
  rmSync(profile, { recursive: true, force: true });
}
