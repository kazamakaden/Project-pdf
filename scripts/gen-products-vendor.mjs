// สร้าง src/data/products.ts จากใบเสนอราคาผู้ขาย (catalog-vendor-2569.json)
// ใช้แทนแคตตาล็อกเดิมทั้งชุด — 1 แถวใน Excel = 1 สินค้า
//
// วิธีใช้: python3 (extract xlsx -> catalog-vendor-2569.json) แล้ว node scripts/gen-products-vendor.mjs
import fs from 'node:fs';

const SOURCE_FILE = 'catalog-vendor-2569.json';
const data = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));

/** กฎจัดหมวดจากชื่อสินค้า — เรียงจากเจาะจงไปกว้าง (ตัวแรกที่ตรงคือหมวดที่ใช้) */
const RULES = [
  ['หมึกและงานพิมพ์', ['หมึก', 'ตลับหมึก', 'ผ้าหมึก', 'พิมพ์ดีด', 'เลเซอร์']],
  ['วัสดุคอมพิวเตอร์', ['คอมพิวเตอร์', 'แฮนดี้ไดร์ฟ', 'ซีดี', 'ดีวีดี', 'แฟลช', 'เมาส์', 'คีย์บอร์ด', 'รีฟิวส์']],
  ['กระดาษและสมุด', ['กระดาษ', 'สมุด', 'บัตร', 'โฟโต', 'การ์ด', 'สติกเกอร์', 'โปสเตอร์', 'คาร์บอน', 'โรเนียว', 'แกรม', 'ปอนด์', 'A4', 'A3', 'F14', 'โพสต์อิท', 'ขี้ผึ้ง']],
  ['กาวและเทป', ['กาว', 'เทป', 'สก็อต', 'สก๊อต', 'OPP', 'แล็กซีน', 'แลคซีน']],
  ['เครื่องเขียน', ['ดินสอ', 'ปากกา', 'ยางลบ', 'กบเหลา', 'กรรไกร', 'คัตเตอร์', 'ไม้บรรทัด', 'สี', 'พู่กัน', 'มาร์ค', 'ไฮไลท์', 'เมจิก', 'ชอล์ก', 'ลบคำผิด']],
  ['แฟ้มและจัดเก็บ', ['แฟ้ม', 'ซอง', 'กล่อง', 'ตระกร้า', 'ตะกร้า', 'ลิ้นชัก', 'สันรูด', 'ถุง', 'ลิ้นแฟ้ม']],
  ['อุปกรณ์สำนักงาน', ['เครื่องเย็บ', 'ลวดเย็บ', 'ลวดเสียบ', 'คลิป', 'เครื่องเจาะ', 'เครื่องคำนวณ', 'เครื่องตีเบอร์', 'ที่ถอด', 'ตรายาง', 'แท่น', 'ถ่าน', 'ก้ามปู', 'มีด']],
];

function categorise(name) {
  for (const [cat, keys] of RULES) {
    if (keys.some((key) => name.includes(key))) return cat;
  }
  return 'อื่น ๆ';
}

const products = [];
const anomalies = [];
const seen = new Set();

for (const row of data.rows) {
  const name = (row.name || '').trim();
  if (!name) {
    anomalies.push({ kind: 'no-name', row });
    continue;
  }
  if (seen.has(row.seq)) {
    anomalies.push({ kind: 'dup-seq', row });
    continue;
  }
  seen.add(row.seq);

  const price = parseFloat(String(row.unitPrice || '').replace(/,/g, ''));
  products.push({
    id: 'p' + String(row.seq).padStart(3, '0'),
    seq: row.seq,
    name,
    category: categorise(name),
    size: '',
    model: '',
    brand: '',
    unit: (row.unit || '').trim() || 'ชิ้น',
    price: Number.isFinite(price) ? price : 0,
    note: '',
  });
}

products.sort((a, b) => a.seq - b.seq);
const CAT_ORDER = RULES.map((rule) => rule[0]).concat('อื่น ๆ');
const cats = [...new Set(products.map((p) => p.category))].sort(
  (a, b) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b),
);

const q = (value) => JSON.stringify(value);
const lines = [];
lines.push('// AUTO-GENERATED from "catalog-vendor-2569.json" (ใบเสนอราคาผู้ขาย 41 รายการ)');
lines.push('// Regenerate with: node scripts/gen-products-vendor.mjs');
lines.push("import type { Product } from '@/types/product';");
lines.push('');
lines.push('export const products: Product[] = [');
for (const p of products) {
  lines.push(
    '  { id: ' + q(p.id) + ', seq: ' + p.seq + ', name: ' + q(p.name) + ', category: ' + q(p.category) +
      ', size: ' + q(p.size) + ', model: ' + q(p.model) + ', brand: ' + q(p.brand) + ', unit: ' + q(p.unit) +
      ', price: ' + p.price + ', note: ' + q(p.note) + ' },',
  );
}
lines.push('];');
lines.push('');
lines.push('export const categories: string[] = [');
for (const c of cats) lines.push('  ' + q(c) + ',');
lines.push('];');
fs.writeFileSync('src/data/products.ts', lines.join('\n') + '\n', 'utf8');

console.log('products: ' + products.length);
console.log('categories: ' + JSON.stringify(cats));
console.log('price=0: ' + products.filter((p) => p.price === 0).length);
console.log('anomalies: ' + anomalies.length);
anomalies.slice(0, 10).forEach((x) => console.log('  ' + x.kind + ' ' + JSON.stringify(x.row)));
