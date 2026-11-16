/**
 * วัดความสูงจริงของหน้าฟอร์มใน DOM เทียบกับ A4 (794 x 1120 px @96dpi)
 * ใช้: node scripts/measure-page.mjs
 * env: SMOKE_URL, SMOKE_PORT, CHROME_PATH, ITEMS (จำนวนสินค้าในตะกร้า)
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME_PATH ?? 'google-chrome';
const PORT = Number(process.env.SMOKE_PORT ?? 9344);
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const ITEMS = Number(process.env.ITEMS ?? 6);

const product = (i) => ({
  product: {
    id: 'p' + String(100 + i),
    seq: 100 + i,
    name: 'หมึกเติมepson003-แดง',
    category: 'หมึกและงานพิมพ์',
    size: '',
    model: '',
    brand: '',
    unit: 'ขวด',
    price: 290,
    note: '',
  },
  quantity: 1,
});
const basket = JSON.stringify({
  state: { items: Array.from({ length: ITEMS }, (_, i) => product(i)), includeVat: true },
  version: 0,
});

const profile = mkdtempSync(join(tmpdir(), 'measure-'));
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
    '--window-size=1440,1200',
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
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('lmc-basket', ${JSON.stringify(basket)}); } catch (e) {}`,
  });
  await cdp.send('Page.navigate', { url: URL });
  await sleep(2500);
  const evalJs = async (expr) =>
    (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))
      .result.value;

  const clickByText = (text) =>
    evalJs(`(() => {
      const el = Array.from(document.querySelectorAll('button'))
        .find((n) => (n.innerText || '').trim().includes(${JSON.stringify(text)}));
      if (!el) return false; el.click(); return true;
    })()`);

  await clickByText('ตะกร้าสินค้า');
  await sleep(800);
  await clickByText('สร้างใบรายการขออนุมัติสั่งซื้อ');
  await sleep(1200);
  await evalJs('document.fonts.ready.then(() => true)');
  await sleep(500);

  const dump = await evalJs(`(() => {
    const table = document.querySelector('.quotation-table');
    const rows = Array.from(table.children).slice(-6);
    return rows.map((r) => ({
      text: (r.innerText || '').replace(/\n/g, ' ').slice(0, 40),
      h: Math.round(r.getBoundingClientRect().height),
      w: Math.round(r.getBoundingClientRect().width),
      cells: Array.from(r.children).map((c) => {
        const cs = getComputedStyle(c);
        const r2 = c.getBoundingClientRect();
        return { w: Math.round(r2.width), br: cs.borderRightWidth, bg: cs.backgroundColor, gc: cs.gridColumn };
      }),
    }));
  })()`);
  console.log('ROWS', JSON.stringify(dump, null, 1));

  const pages = await evalJs(`(() => {
    const tables = Array.from(document.querySelectorAll('.quotation-table'));
    return tables.map((t, i) => {
      const page = t.parentElement;
      const rows = Array.from(t.children);
      const last = rows[rows.length - 1];
      const pr = page.getBoundingClientRect();
      return {
        page: i + 1,
        pageTop: Math.round(pr.top),
        pageHeight: Math.round(pr.height),
        tableH: Math.round(t.getBoundingClientRect().height),
        lastRow: { h: Math.round(last.getBoundingClientRect().height), text: (last.innerText||'').slice(0,30) },
        tableBottomInPage: Math.round(t.getBoundingClientRect().bottom - pr.top),
      };
    });
  })()`);
  console.log('PAGES', JSON.stringify(pages));

  const info = await evalJs(`(() => {
    const table = document.querySelector('.quotation-table');
    const page = table ? table.parentElement : null;
    const pages = document.querySelectorAll('.quotation-table');
    const r = page ? page.getBoundingClientRect() : null;
    const t = table ? table.getBoundingClientRect() : null;
    return {
      pageHeight: r ? Math.round(r.height) : null,
      pageWidth: r ? Math.round(r.width) : null,
      tableBottom: t ? Math.round(t.bottom - r.top) : null,
      pageScrollHeight: page ? page.scrollHeight : null,
      tableScrollHeight: table ? table.scrollHeight : null,
      count: pages.length,
      titleRect: (() => {
        const t = document.querySelector('.doc-title-text');
        const box = t ? t.parentElement : null;
        const tr = t ? t.getBoundingClientRect() : null;
        const br = box ? box.getBoundingClientRect() : null;
        return tr && br ? {
          textCenterY: Math.round(tr.top + tr.height / 2 - br.top),
          textCenterX: Math.round(tr.left + tr.width / 2),
          boxCenterY: Math.round(br.height / 2),
        } : null;
      })(),
    };
  })()`);
  console.log(JSON.stringify(info));
  cdp.close();
} catch (error) {
  console.error('FAIL:', error.message ?? error);
  process.exitCode = 1;
} finally {
  chrome.kill();
  rmSync(profile, { recursive: true, force: true });
}
