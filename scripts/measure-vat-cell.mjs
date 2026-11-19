/**
 * วัด rect ของป้าย "รวมเงิน" กับช่องแม่ ในหน้าใบเสนอราคาบนเว็บจริง
 * ใช้: CHROME_PATH=/root/build/chrome-wrap.sh node scripts/measure-vat-cell.mjs <url>
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME_PATH ?? 'chromium';
const PORT = Number(process.env.SMOKE_PORT ?? 9360);
const URL = process.argv[2] ?? 'https://project-pdf-1.onrender.com/';

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1440,1200',
  'about:blank',
], { stdio: 'ignore' });

async function cdpTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, err) => {
    ws.onopen = ok;
    ws.onerror = err;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, err } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? err(new Error(JSON.stringify(msg.error))) : ok(msg.result);
    }
  };
  const send = (method, params = {}) => new Promise((ok, err) => {
    const mid = ++id;
    pending.set(mid, { ok, err });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  return { ws, send };
}

try {
  let page = null;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await cdpTargets();
      page = list.find((t) => t.type === 'page');
      if (page) break;
    } catch { /* waiting */ }
    await sleep(250);
  }
  if (!page) throw new Error('chrome debugger not reachable');

  const { send } = await connect(page.webSocketDebuggerUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(3500);

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  // ใส่สินค้า 1 รายการลงตะกร้าผ่าน localStorage แล้วโหลดใหม่
  const seeded = await evalJs(`(async () => {
    const r = await fetch('/api/products');
    const data = await r.json();
    const rows = Array.isArray(data) ? data : (data.products || data.data || []);
    if (!rows.length) return 'no products';
    const item = { product: rows[0], quantity: 1 };
    localStorage.setItem('lmc-basket', JSON.stringify({ state: { items: [item], includeVat: false }, version: 0 }));
    return 'seeded ' + rows.length;
  })()`);
  console.log('seed:', seeded);

  await send('Page.navigate', { url: URL });
  await sleep(3000);

  // เปิดหน้าตะกร้า แล้วกดปุ่มไปหน้าใบเสนอราคา
  const openedCart = await evalJs(`(() => {
    const els = [...document.querySelectorAll('button,a,[role=button]')];
    const c = els.find((el) => /ตะกร้า/.test(el.textContent || ''));
    if (!c) return 'cart not found';
    c.click();
    return 'cart clicked';
  })()`);
  console.log('cart:', openedCart);
  await sleep(2000);

  const clicked = await evalJs(`(() => {
    const btns = [...document.querySelectorAll('button,a,[role=button]')];
    const b = btns.find((el) => (el.textContent || '').includes('สร้างใบรายการ'));
    if (!b) return 'button not found';
    b.click();
    return 'clicked';
  })()`);
  console.log('nav:', clicked);
  await sleep(2500);

  const rects = await evalJs(`(() => {
    const all = [...document.querySelectorAll('div,span')];
    const label = all.find((el) => el.children.length === 0 && (el.textContent || '').trim() === 'รวมเงิน');
    if (!label) return { error: 'label not found' };
    const lr = label.getBoundingClientRect();
    const pr = label.parentElement.getBoundingClientRect();
    return {
      label: { top: Math.round(lr.top), bottom: Math.round(lr.bottom), h: Math.round(lr.height), cy: Math.round(lr.top + lr.height / 2) },
      parent: { top: Math.round(pr.top), bottom: Math.round(pr.bottom), h: Math.round(pr.height), cy: Math.round(pr.top + pr.height / 2) },
      padTop: getComputedStyle(label).paddingTop,
      padBottom: getComputedStyle(label).paddingBottom,
      lineHeight: getComputedStyle(label).lineHeight,
      display: getComputedStyle(label).display,
      deltaCenter: Math.round((lr.top + lr.height / 2) - (pr.top + pr.height / 2)),
    };
  })()`);
  console.log(JSON.stringify(rects, null, 1));
} finally {
  chrome.kill('SIGKILL');
}
