/**
 * เปิดหน้าใบเสนอราคา (seed ตะกร้าเอง) แล้วถ่ายภาพ + ตรวจเส้นขอบของแถวสรุป
 * ใช้: CHROME_PATH=... node scripts/shot-quotation.mjs <url> <out.png>
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH ?? 'chromium';
const PORT = Number(process.env.SMOKE_PORT ?? 9380);
const URL = process.argv[2] ?? 'http://127.0.0.1:4173/';
const OUT = process.argv[3] ?? '/tmp/quotation.png';

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu',
  '--no-sandbox', '--window-size=1200,1500', 'about:blank',
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
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(3000);

  // seed จากข้อมูลที่ฝังมากับเว็บ (ไม่พึ่ง API)
  const seeded = await evalJs(`(() => {
    const mod = document.querySelector('script[type=module]');
    localStorage.setItem('lmc-basket', JSON.stringify({
      state: { items: [{ product: {
        id:'seed-1', seq:1, name:'DOUBLE A/A4/80g/500แผ่น/BOX', category:'กระดาษ', size:'', model:'',
        brand:'', unit:'รีม', price:120, note:'', imageUrl:'', createdAt: new Date().toISOString()
      }, quantity: 1 }], includeVat: false }, version: 0
    }));
    return 'seeded';
  })()`);
  console.log('seed:', seeded);

  await send('Page.navigate', { url: URL });
  await sleep(2500);

  console.log('nav:', await evalJs(`(() => {
    const els = [...document.querySelectorAll('button,a,[role=button]')];
    const c = els.find((el) => /ตะกร้า/.test(el.textContent || ''));
    if (c) c.click();
    return c ? 'cart clicked' : 'cart not found';
  })()`));
  await sleep(1800);

  console.log('to quotation:', await evalJs(`(() => {
    const b = [...document.querySelectorAll('button,a,[role=button]')].find((el) => (el.textContent || '').includes('สร้างใบรายการ'));
    if (b) b.click();
    return b ? 'clicked' : 'button not found';
  })()`));
  await sleep(2000);

  const borders = await evalJs(`(() => {
    const findRow = (text) => [...document.querySelectorAll('div')].find((el) => el.children.length === 0 && (el.textContent || '').trim() === text);
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle, borderBottom: cs.borderBottomWidth, borderLeft: cs.borderLeftWidth, borderRight: cs.borderRightWidth, h: Math.round(r.height) };
    };
    return { baht: pick(findRow('รวมค่าวัสดุ')), total: pick(findRow('รวมทั้งสิ้น')), money: pick(findRow('รวมเงิน')) };
  })()`);
  console.log(JSON.stringify(borders));

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('shot:', OUT);
} finally {
  chrome.kill('SIGKILL');
}
