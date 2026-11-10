/**
 * ตรวจสอบปลายทางจริง: เปิดเว็บ -> ตะกร้า -> สร้างใบขออนุมัติ -> กดดาวน์โหลด PDF
 * แล้วเก็บไฟล์ PDF + ภาพหน้าจอตัวอย่างไว้ตรวจ
 *
 * ใช้: node scripts/verify-pdf.mjs
 * env: SMOKE_URL, SMOKE_PORT, CHROME_PATH, VAT=0|1, OUT=path.pdf, SHOT=path.png
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = Number(process.env.SMOKE_PORT ?? 9334);
const APP_URL = process.env.SMOKE_URL ?? 'http://localhost:5199/';
const INCLUDE_VAT = (process.env.VAT ?? '1') !== '0';
const OUT = resolve(process.env.OUT ?? 'work/download.pdf');
const SHOT = process.env.SHOT ? resolve(process.env.SHOT) : null;
const DOWNLOAD_DIR = resolve('work/downloads');

rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
mkdirSync(DOWNLOAD_DIR, { recursive: true });
mkdirSync(resolve('work'), { recursive: true });

const PRODUCT = {
  id: 'p002',
  seq: 2,
  name: process.env.ITEM_NAME ?? 'กรรไกร',
  category: 'เครื่องเขียน',
  size: '6 นิ้ว',
  model: '',
  brand: '',
  unit: 'อัน',
  price: Number(process.env.ITEM_PRICE ?? 45),
  note: '',
};

const BASKET_ITEMS =
  process.env.MANY === '1'
    ? Array.from({ length: 25 }, (_, index) => ({
        product: { ...PRODUCT, id: 'p' + (200 + index), seq: 200 + index, price: 45 + index },
        quantity: 1,
      }))
    : process.env.LONGS === '1'
      ? Array.from({ length: 25 }, (_, index) => ({
          product: {
            ...PRODUCT,
            id: 'p' + (100 + index),
            seq: 100 + index,
            name:
              'กระดาษถ่ายเอกสาร เอสี่ 80 แกรม ชนิดหนาพิเศษสำหรับงานสำนักงาน ' + (index + 1),
            price: 45 + index,
          },
          quantity: 1,
        }))
      : [{ product: PRODUCT, quantity: 1 }];

const BASKET = JSON.stringify({
  state: { items: BASKET_ITEMS, includeVat: INCLUDE_VAT },
  version: 0,
});

const profileDir = mkdtempSync(join(tmpdir(), 'udtc-pdf-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,1200',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function waitForDebugger() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return res.json();
    } catch {
      /* ยังไม่พร้อม */
    }
    await sleep(250);
  }
  throw new Error('เชื่อมต่อ Chrome remote debugging ไม่ได้');
}

function createClient(url) {
  return new Promise((clientResolve, clientReject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const listeners = [];
    let seq = 0;
    ws.onopen = () =>
      clientResolve({
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
    ws.onerror = () => clientReject(new Error('WebSocket error'));
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
let browser;
let client;
let exitCode = 0;

try {
  const version = await waitForDebugger();
  browser = await createClient(version.webSocketDebuggerUrl);
  await browser.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: DOWNLOAD_DIR,
    eventsEnabled: true,
  });

  let target;
  for (let i = 0; i < 40 && !target; i += 1) {
    const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
    target = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
    if (!target) await sleep(250);
  }
  if (!target) throw new Error('ไม่พบแท็บของ Chrome');

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

  const waitFor = async (expression, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await evaluate(expression)) return true;
      } catch {
        /* ระหว่างโหลด */
      }
      await sleep(250);
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

  // ใส่ตะกร้าจำลองก่อนโหลดแอป (และเลือกฟอนต์เอกสารถ้าระบุ)
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try {
      localStorage.setItem('lmc-basket', ${JSON.stringify(BASKET)});
      ${
        process.env.FONT
          ? `localStorage.setItem('lmc-doc-font', ${JSON.stringify(process.env.FONT)});`
          : ''
      }
    } catch (e) {}`,
  });

  await client.send('Page.navigate', { url: APP_URL });
  if (!(await waitFor(`!!document.querySelector('header')`))) {
    throw new Error('หน้าเว็บไม่โหลด');
  }
  await sleep(1200);

  if (!(await clickByText('ตะกร้าสินค้า'))) throw new Error('ไม่พบเมนูตะกร้าสินค้า');
  if (!(await waitFor(`document.body.innerText.includes('สร้างใบรายการขออนุมัติสั่งซื้อ')`))) {
    throw new Error('หน้าตะกร้าไม่แสดง');
  }
  await sleep(400);
  if (!(await clickByText('สร้างใบรายการขออนุมัติสั่งซื้อ'))) {
    throw new Error('ไม่พบปุ่มสร้างใบขออนุมัติ');
  }
  if (!(await waitFor(`document.body.innerText.includes('ความสอดคล้องกับนโยบาย')`))) {
    throw new Error('หน้าใบขออนุมัติไม่แสดง');
  }

  if (process.env.SKIP_INPUTS !== '1') {
    await setInput('requesterName', 'นายทดสอบ ระบบ');
    await setInput('department', 'งานพัสดุ');
    await sleep(600);
  }

  // รอฟอนต์พร้อมก่อนจับภาพ (เหมือนที่ปุ่มดาวน์โหลดทำ)
  await evaluate(`document.fonts.ready.then(() => true)`);

  if (SHOT) {
    const { data } = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(SHOT, Buffer.from(data, 'base64'));
  }

  if (!(await clickByText('ดาวน์โหลด PDF'))) throw new Error('ไม่พบปุ่มดาวน์โหลด PDF');

  let file = null;
  for (let i = 0; i < 240; i += 1) {
    const files = readdirSync(DOWNLOAD_DIR).filter((name) => name.toLowerCase().endsWith('.pdf'));
    if (files.length > 0) {
      const path = join(DOWNLOAD_DIR, files[0]);
      const size = statSync(path).size;
      if (size > 10000) {
        file = path;
        break;
      }
    }
    await sleep(250);
  }
  if (!file) throw new Error('ไม่ได้รับไฟล์ PDF จากการดาวน์โหลด');
  renameSync(file, OUT);

  const size = statSync(OUT).size;
  console.log(`OK  ${OUT}  ${size} bytes  vat=${INCLUDE_VAT}`);
  if (errors.length) {
    console.log('CONSOLE ERRORS:', errors.slice(0, 5));
    exitCode = 1;
  }
} catch (error) {
  console.error('FAIL:', error.message ?? error);
  if (errors.length) console.error('CONSOLE ERRORS:', errors.slice(0, 5));
  exitCode = 1;
} finally {
  try {
    client?.close();
    browser?.close();
  } catch {
    /* ignore */
  }
  chrome.kill();
  await sleep(300);
  if (!process.env.KEEP_PROFILE) rmSync(profileDir, { recursive: true, force: true });
  process.exit(exitCode);
}
