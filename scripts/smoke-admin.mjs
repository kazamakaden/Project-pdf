/**
 * Smoke test หน้าจอจริงด้วย Chrome headless (CDP)
 * ใช้: node scripts/smoke-admin.mjs  (ต้องรัน dev/preview server ไว้ก่อน)
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = Number(process.env.SMOKE_PORT ?? 9333);
const APP_URL = process.env.SMOKE_URL ?? 'http://localhost:5199/';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN ?? 'admin@udtc.ac.th';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

const profileDir = mkdtempSync(join(tmpdir(), 'udtc-smoke-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,1000',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function getTarget() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const list = await res.json();
      const page = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      /* ยังไม่พร้อม */
    }
    await sleep(250);
  }
  throw new Error('ไม่สามารถเชื่อมต่อ Chrome remote debugging');
}

function createClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const listeners = [];
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
        on(fn) {
          listeners.push(fn);
        },
        close() {
          ws.close();
        },
      });
    ws.onerror = () => reject(new Error('WebSocket error'));
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
        return;
      }
      if (msg.method) listeners.forEach((fn) => fn(msg));
    };
  });
}

const errors = [];
let client;
let exitCode = 0;

try {
  const target = await getTarget();
  client = await createClient(target.webSocketDebuggerUrl);
  client.on((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails?.exception?.description ?? 'exception');
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    }
  });
  await client.send('Runtime.enable');
  await client.send('Page.enable');

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result.value;
  };

  const goto = async (url) => {
    await client.send('Page.navigate', { url });
    await sleep(1500);
  };

  const waitFor = async (expression, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await evaluate(expression)) return true;
      } catch {
        /* ระหว่างโหลด */
      }
      await sleep(200);
    }
    return false;
  };

  const clickByText = (text, tag = 'button') =>
    evaluate(`(() => {
      const el = Array.from(document.querySelectorAll(${JSON.stringify(tag)}))
        .find((node) => (node.innerText || '').trim().includes(${JSON.stringify(text)}));
      if (!el) return false;
      el.click();
      return true;
    })()`);

  const setInput = (id, value) =>
    evaluate(`(() => {
      const el = document.getElementById(${JSON.stringify(id)});
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);

  // ---------- 1) แคตตาล็อก ----------
  await goto(APP_URL);
  check('โหลดหน้าแคตตาล็อกได้', await waitFor(`!!document.querySelector('header')`));
  check(
    'เปิดครั้งแรกเป็นโหมดสว่าง (light)',
    await evaluate(`!document.documentElement.classList.contains('dark')`),
  );
  check(
    'โลโก้แสดงใน header และ footer',
    await evaluate(`(() => {
      const imgs = Array.from(document.querySelectorAll('header img, footer img'))
        .filter((img) => (img.getAttribute('src') || '') === '/logo.png');
      return imgs.length >= 2 && imgs.every((img) => img.complete && img.naturalWidth > 0);
    })()`),
  );

  const toggledDark = await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find((node) => (node.getAttribute('aria-label') || '').includes('สลับโหมด'));
    if (!btn) return false;
    btn.click();
    return document.documentElement.classList.contains('dark');
  })()`);
  check('ปุ่มสลับโหมดมืดยังทำงาน', toggledDark === true);
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find((node) => (node.getAttribute('aria-label') || '').includes('สลับโหมด'));
    btn?.click();
    return true;
  })()`);
  await sleep(300);
  check(
    'สลับกลับเป็นโหมดสว่างได้',
    await evaluate(`!document.documentElement.classList.contains('dark')`),
  );
  check(
    'แสดงชื่อหน่วยงานใหม่',
    await evaluate(`document.body.innerText.includes('วิทยาลัยเทคนิคอุดรธานี')`),
  );
  const cards = await evaluate(`document.querySelectorAll('article').length`);
  check('แสดงการ์ดสินค้า', cards > 0, `${cards} การ์ด`);
  check(
    'มีตัวกรองขนาด',
    await evaluate(`!!document.querySelector('select[aria-label="ขนาดสินค้า"]')`),
  );

  const pickedSize = await evaluate(`(() => {
    const select = document.querySelector('select[aria-label="ขนาดสินค้า"]');
    const option = select ? Array.from(select.options).find((o) => o.value !== 'all') : null;
    if (!option) return '';
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(select, option.value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return option.value;
  })()`);
  await sleep(600);
  const filteredCards = await evaluate(`document.querySelectorAll('article').length`);
  check(
    'กรองตามขนาดได้',
    Boolean(pickedSize) && filteredCards > 0 && filteredCards < cards,
    `ขนาด ${pickedSize}: ${filteredCards} การ์ด`,
  );

  // ---------- 2) หน้าผู้ดูแล (ยังไม่ล็อกอิน) ----------
  await goto(APP_URL);
  await clickByText('ผู้ดูแลระบบ');
  check(
    'หน้าผู้ดูแลแจ้งวิธีตั้งค่า Google Client ID',
    await waitFor(`document.body.innerText.includes('ยังไม่ได้ตั้งค่า Google Client ID')`),
  );

  // ---------- 2b) ล็อกอินแบบโลคอล (โหมดทดสอบ, ไม่ผ่าน Google) ----------
  check(
    'มีปุ่มเข้าสู่ระบบแบบโลคอล (โหมดทดสอบ)',
    await waitFor(`document.body.innerText.includes('เข้าสู่ระบบแบบโลคอล')`),
  );
  await clickByText('เข้าสู่ระบบแบบโลคอล');
  check(
    'เข้าสู่ระบบแบบโลคอลได้โดยไม่ใช้ Google',
    await waitFor(`document.body.innerText.includes('จัดการสินค้า')`),
  );
  await clickByText('ออกจากระบบ');
  await sleep(400);

  // ---------- 3) จำลองเซสชันแอดมิน ----------
  await evaluate(`localStorage.setItem('udtc-auth', JSON.stringify({
    state: { user: { sub: 'local-admin', email: ${JSON.stringify(ADMIN_EMAIL)},
                     name: 'Smoke Admin', picture: '', emailVerified: true },
             expiresAt: Date.now() + 3600000 },
    version: 0
  }))`);
  await goto(APP_URL);
  await clickByText('หลังบ้าน');
  check('เข้าแผงจัดการสินค้าได้', await waitFor(`document.body.innerText.includes('จัดการสินค้า')`));
  const rows = await evaluate(`document.querySelectorAll('table tbody tr').length`);
  check('ตารางสินค้าแสดงรายการ', rows > 0, `${rows} แถว`);

  // ---------- 4) เพิ่มสินค้าใหม่ ----------
  await clickByText('เพิ่มสินค้าใหม่');
  check('เปิดฟอร์มเพิ่มสินค้า', await waitFor(`!!document.getElementById('product-name')`));
  await setInput('product-name', 'สินค้าทดสอบ Smoke');
  await setInput('product-price', '123');
  await evaluate(`(() => {
    const form = document.getElementById('product-name')?.closest('form');
    if (!form) return false;
    form.requestSubmit();
    return true;
  })()`);
  await sleep(1200);
  check(
    'เพิ่มสินค้าใหม่สำเร็จ (บันทึกผ่าน API)',
    await waitFor(
      `fetch('/api/products')
        .then((r) => r.json())
        .then((d) => (d.products || []).some((p) => p.name === 'สินค้าทดสอบ Smoke'))
        .catch(() => false)`,
      15000,
    ),
  );
  check(
    'สินค้าใหม่ปรากฏในตาราง',
    await evaluate(`document.body.innerText.includes('สินค้าทดสอบ Smoke')`),
  );

  // ---------- 5) ข้อมูลคงอยู่หลังรีเฟรช ----------
  await goto(APP_URL);
  check(
    'ข้อมูลคงอยู่ในฐานข้อมูลหลังรีเฟรช',
    await waitFor(
      `fetch('/api/products')
        .then((r) => r.json())
        .then((d) => (d.products || []).some((p) => p.name === 'สินค้าทดสอบ Smoke'))
        .catch(() => false)`,
      15000,
    ),
  );

  // ---------- 6) แคตตาล็อกเห็นสินค้าที่เพิ่ม ----------
  await waitFor(`!!document.querySelector('header')`);
  await evaluate(`(() => {
    const input = Array.from(document.querySelectorAll('input'))
      .find((node) => (node.placeholder || '').includes('ค้นหา'));
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'สินค้าทดสอบ Smoke');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(800);
  const searchCount = await evaluate(`document.querySelectorAll('article').length`);
  check('ค้นหาสินค้าที่เพิ่มใหม่ในแคตตาล็อกได้', searchCount === 1, `${searchCount} การ์ด`);

  // ---------- 7) หน้าใบเสนอราคา ----------
  await evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('button'))
      .find((node) => (node.innerText || '').trim() === 'ใบเสนอราคา');
    if (!el) return false;
    el.click();
    return true;
  })()`);
  await waitFor(`document.body.innerText.includes('สร้างใบเสนอราคา')`);
  check(
    'ใบเสนอราคาแสดงข้อมูลหน่วยงานจาก SITE',
    await evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('0994000000000') && text.includes('042-221-336');
    })()`),
  );
  check(
    'โลโก้แสดงในหัวใบเสนอราคา',
    await evaluate(`(() => {
      const page = document.querySelector('div[style*="794px"]');
      const img = page ? page.querySelector('img[src="/logo.png"]') : null;
      return Boolean(img && img.complete && img.naturalWidth > 0);
    })()`),
  );

  // ---------- 8) ล้างข้อมูลที่ทดสอบ ----------
  const removed = await evaluate(`(async () => {
    const list = await fetch('/api/products').then((r) => r.json()).catch(() => ({ products: [] }));
    const targets = (list.products || []).filter((p) => p.name === 'สินค้าทดสอบ Smoke');
    for (const item of targets) {
      await fetch('/api/products/' + encodeURIComponent(item.id), {
        method: 'DELETE',
        headers: { authorization: 'Bearer local-admin:' + ${JSON.stringify(ADMIN_EMAIL)} },
      });
    }
    localStorage.removeItem('udtc-auth');
    return targets.length;
  })()`);
  check('ล้างสินค้าทดสอบออกจากฐานข้อมูลแล้ว', removed > 0, `${removed} รายการ`);

  check('ไม่มี console error', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (error) {
  console.error('SMOKE ERROR:', error.message);
  exitCode = 1;
} finally {
  client?.close();
  chrome.kill();
  await sleep(400);
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

const failed = results.filter((item) => !item.ok);
console.log(`\nสรุป: ผ่าน ${results.length - failed.length}/${results.length} รายการ`);
if (failed.length > 0 || exitCode !== 0) {
  console.log('FAILED:', failed.map((item) => item.name).join(', '));
  process.exitCode = 1;
} else {
  console.log('ผลลัพธ์: ทุกกรณีผ่าน');
}
