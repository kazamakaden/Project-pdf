/**
 * ทดสอบปุ่มเลื่อนหน้าในตัวอย่างเอกสาร: กดลูกศรถัดไป/ก่อนหน้า แล้วอ่านข้อความตัวนับและ scrollTop
 * ใช้: node scripts/check-pager.mjs
 * env: SMOKE_URL, SMOKE_PORT, CHROME_PATH, ITEMS
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME_PATH ?? 'google-chrome';
const PORT = Number(process.env.SMOKE_PORT ?? 9356);
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const ITEMS = Number(process.env.ITEMS ?? 23);

const item = (i) => ({
  product: {
    id: 'p' + (400 + i),
    seq: 400 + i,
    name: 'กรรไกร',
    category: 'เครื่องเขียน',
    size: '6 นิ้ว',
    model: '',
    brand: '',
    unit: 'อัน',
    price: 45,
    note: '',
  },
  quantity: 1,
});
const basket = JSON.stringify({
  state: { items: Array.from({ length: ITEMS }, (_, i) => item(i)), includeVat: true },
  version: 0,
});

const profile = mkdtempSync(join(tmpdir(), 'pager-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1000',
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
    target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!target) await sleep(250);
  }
  const cdp = await client(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('lmc-basket', ${JSON.stringify(basket)}); } catch (e) {}`,
  });
  await cdp.send('Page.navigate', { url: URL });
  await sleep(2500);

  const run = async (expr) =>
    (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))
      .result.value;
  const click = (label) =>
    run(`(() => {
      const el = Array.from(document.querySelectorAll('button'))
        .find((n) => (n.innerText || '').trim().includes(${JSON.stringify(label)})
          || n.getAttribute('aria-label') === ${JSON.stringify(label)});
      if (!el) return 'not-found'; el.click(); return 'ok';
    })()`);
  const state = () =>
    run(`(() => {
      const input = document.querySelector('input[aria-label="เลขหน้า"]');
      return {
        page: input ? input.value : null,
        pagesInDom: document.querySelectorAll('.quotation-table').length,
        firstRow: (document.querySelector('.quotation-table')?.innerText || '').trim().split('\\n')[0],
      };
    })()`);

  await click('ตะกร้าสินค้า');
  await sleep(700);
  await click('สร้างใบรายการขออนุมัติสั่งซื้อ');
  await sleep(1500);
  console.log('start', JSON.stringify(await state()));
  // พิมพ์เลขหน้าแล้วกด Enter
  await run(`(() => {
    const input = document.querySelector('input[aria-label="เลขหน้า"]');
    if (!input) return 'no-input';
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '2');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return 'typed';
  })()`);
  await sleep(800);
  console.log('after-type-2', JSON.stringify(await state()));
  console.log('next:', await click('หน้าถัดไป'));
  await sleep(1200);
  console.log('after-next', JSON.stringify(await state()));
  console.log('prev:', await click('หน้าก่อนหน้า'));
  await sleep(1200);
  console.log('after-prev', JSON.stringify(await state()));
  cdp.close();
} catch (error) {
  console.error('FAIL:', error.message ?? error);
  process.exitCode = 1;
} finally {
  chrome.kill();
  rmSync(profile, { recursive: true, force: true });
}
