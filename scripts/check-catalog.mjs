/**
 * ตรวจหน้า "รายการ" ว่าตัดรูปออกแล้ว + มีช่องจำนวน
 * ใช้: CHROME_PATH=... node scripts/check-catalog.mjs <url> [shot.png]
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH ?? 'chromium';
const PORT = Number(process.env.SMOKE_PORT ?? 9370);
const URL = process.argv[2] ?? 'http://127.0.0.1:4173/';
const SHOT = process.argv[3] ?? '';

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu',
  '--no-sandbox', '--window-size=1440,1400', 'about:blank',
], { stdio: 'ignore' });

async function pageWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* wait */ }
    await sleep(250);
  }
  throw new Error('chrome debugger not reachable');
}

const ws = new WebSocket(await pageWs());
await new Promise((ok, err) => { ws.onopen = ok; ws.onerror = err; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { ok, err } = pending.get(m.id); pending.delete(m.id); m.error ? err(new Error(JSON.stringify(m.error))) : ok(m.result); }
};
const send = (method, params = {}) => new Promise((ok, err) => { const mid = ++id; pending.set(mid, { ok, err }); ws.send(JSON.stringify({ id: mid, method, params })); });

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(3500);

  const info = (await send('Runtime.evaluate', {
    expression: `(() => {
      const imgs = document.querySelectorAll('img').length;
      const numbers = document.querySelectorAll('input[type=number]').length;
      const h1 = document.querySelector('h1')?.textContent?.trim();
      const vat = document.body.innerText.includes('ภาษีมูลค่าเพิ่ม');
      const old = document.body.innerText.includes('แคตตาล็อก');
      const card = [...document.querySelectorAll('article')].find((el) => (el.textContent || '').includes('กรรไกร'));
      const info = card ? {
        title: card.querySelector('h3')?.textContent?.trim(),
        selectOptions: [...(card.querySelectorAll('select option'))].map((o) => o.textContent.trim()),
      } : null;
      return { imgs, numbers, h1, vat, oldWord: old, cards: document.querySelectorAll('article').length, knifeCard: info };
    })()`, returnByValue: true,
  })).result.value;
  console.log(JSON.stringify(info));

  if (SHOT) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(SHOT, Buffer.from(shot.data, 'base64'));
    console.log('shot:', SHOT);
  }
} finally {
  chrome.kill('SIGKILL');
}
