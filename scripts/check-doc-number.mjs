/**
 * ทดสอบเลขที่เอกสาร: ใบเดิมต้องได้เลขเดิม (แม้รีเฟรช) และใบใหม่ (ตะกร้าเปลี่ยน) ต้องได้เลขใหม่
 * node scripts/check-doc-number.mjs   (ต้องรัน dev server ที่ localhost:5199)
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.SMOKE_PORT ?? 9337);
const APP_URL = process.env.SMOKE_URL ?? 'http://localhost:5199/';

const product = (id, price) => ({
  id,
  seq: 1,
  name: 'กระจก',
  category: 'เครื่องเขียน',
  size: '',
  model: '',
  brand: '',
  unit: 'อัน',
  price,
  note: '',
});

const basket = (items) =>
  JSON.stringify({ state: { items: items.map((p) => ({ product: p, quantity: 1 })), includeVat: false }, version: 0 });

const BASKET_A = basket([product('p002', 45)]);
const BASKET_B = basket([product('p002', 45), product('p003', 80)]);

const profile = mkdtempSync(join(tmpdir(), 'udtc-docno-'));
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
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

try {
  const target = await getTarget();
  client = await createClient(target.webSocketDebuggerUrl);
  await client.send('Runtime.enable');
  await client.send('Page.enable');

  const evalJs = async (expression) => {
    const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const waitFor = async (expr, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await evalJs(expr)) return true;
      } catch {
        /* loading */
      }
      await sleep(250);
    }
    return false;
  };
  const clickText = (text) =>
    evalJs(`(() => {
      const el = Array.from(document.querySelectorAll('button'))
        .find((n) => (n.innerText || '').trim().includes(${JSON.stringify(text)}));
      if (!el) return false;
      el.click();
      return true;
    })()`);

  const openQuotation = async () => {
    if (!(await waitFor(`!!document.querySelector('header')`))) throw new Error('หน้าเว็บไม่โหลด');
    await sleep(800);
    if (!(await clickText('ตะกร้าสินค้า'))) throw new Error('ไม่พบเมนูตะกร้า');
    await waitFor(`document.body.innerText.includes('สร้างใบรายการขออนุมัติสั่งซื้อ')`);
    await sleep(300);
    if (!(await clickText('สร้างใบรายการขออนุมัติสั่งซื้อ'))) throw new Error('ไม่พบปุ่มสร้างใบ');
    await waitFor(`document.body.innerText.includes('ความสอดคล้องกับนโยบาย')`);
    await sleep(900);
  };

  const readDoc = () =>
    evalJs(`(() => {
      const page = document.querySelector('div[style*="794px"]');
      const text = page ? page.innerText : '';
      const codeMatch = text.match(/PR-\\d{4}-\\d{4}-\\d{3,}/);
      const dateMatch = text.match(/วันที่\\s+(.+)/);
      return { code: codeMatch ? codeMatch[0] : '', date: dateMatch ? dateMatch[1].trim() : '' };
    })()`);

  const seqOf = (code) => {
    const match = /-(\d+)$/.exec(code || '');
    return match ? Number(match[1]) : 0;
  };

  // 0) API กลางต้องเดินเลขเพิ่มทีละ 1 (ข้ามได้ถ้าทดสอบโหมด API ล่ม)
  const FAIL_API = process.env.FAIL_API === '1';
  let api2 = { code: '', seq: 0 };
  if (FAIL_API) {
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        const original = window.fetch;
        window.fetch = (input, init) => {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (String(url).includes('/api/doc-number')) {
            return Promise.reject(new Error('simulated offline'));
          }
          return original(input, init);
        };
      })();`,
    });
    check('โหมดจำลอง API ล่ม: ข้ามการทดสอบ API กลาง', true);
  } else {
    const callApi = async () => {
      const response = await fetch(new URL('/api/doc-number', APP_URL), { method: 'POST' });
      return response.json();
    };
    const api1 = await callApi();
    api2 = await callApi();
    check(
      'API กลางออกเลขเพิ่มทีละ 1 (วันเดียวกัน)',
      api2.seq === api1.seq + 1 && api2.isoDate === api1.isoDate,
      `${api1.code} → ${api2.code}`,
    );
  }

  const reloadPage = async () => {
    await evalJs('window.__reloadMarker = true');
    await client.send('Page.reload', { ignoreCache: true });
    if (!(await waitFor(`typeof window.__reloadMarker === 'undefined'`))) {
      throw new Error('หน้าเว็บไม่รีโหลด');
    }
    await sleep(700);
  };

  // 1) เปิดด้วยตะกร้า A
  const { identifier: seedScript } = await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('lmc-basket', ${JSON.stringify(BASKET_A)}); } catch (e) {}`,
  });
  await client.send('Page.navigate', { url: APP_URL });
  await openQuotation();
  // หลังจากโหลดครั้งแรกแล้ว ไม่ต้อง seed ซ้ำในการรีโหลด
  await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: seedScript });
  const first = await readDoc();
  check('มีเลขที่เอกสารรูปแบบ PR-ปี-เดือนวัน-ลำดับ', /^PR-\d{4}-\d{4}-\d{3,}$/.test(first.code), first.code);
  check('มีวันที่ไทย (พ.ศ.)', /25\d{2}/.test(first.date), first.date);
  check(
    'หน้าเว็บได้เลขที่เอกสาร (API กลาง หรือเลขสำรอง)',
    FAIL_API ? true : seqOf(first.code) === api2.seq + 1,
    FAIL_API ? '(โหมด API ล่ม — ใช้เลขสำรอง)' : `${first.code} (API ล่าสุด ${api2.code})`,
  );

  // 2) รีเฟรชหน้าเดิม → ต้องได้เลขเดิม (ใบเดียวกัน)
  await reloadPage();
  await openQuotation();
  const second = await readDoc();
  check('รีเฟรชแล้วใบเดิมได้เลขเดิม', second.code === first.code && second.code !== '', `${first.code} → ${second.code}`);

  // 3) เปลี่ยนตะกร้า → ต้องได้เลขใหม่
  await evalJs(`localStorage.setItem('lmc-basket', ${JSON.stringify(BASKET_B)})`);
  await reloadPage();
  await openQuotation();
  const third = await readDoc();
  check('เปลี่ยนรายการแล้วได้เลขใหม่', third.code !== '' && third.code !== first.code, `${first.code} → ${third.code}`);

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nสรุป: ผ่าน ${results.length - failed}/${results.length}`);
  if (failed) code = 1;
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
