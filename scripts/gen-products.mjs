import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('catalog-raw.json', 'utf8'));

const RULES = [
  ['วัสดุคอมพิวเตอร์', ['คอมพิวเตอร์', 'แฮนดี้ไดร์ฟ', 'ซีดี', 'ดีวีดี', 'แฟลช', 'เมาส์', 'คีย์บอร์ด', 'รีฟิวส์']],
  ['หมึกและงานพิมพ์', ['หมึก', 'ผ้าหมึก', 'พิมพ์ดีด']],
  ['กระดานและป้าย', ['กระดาน', 'ไวท์บอร์ด', 'ป้าย', 'ฟิวเจอร์บอร์ด', 'ขาตั้งรูป', 'เสาธง', 'ธง']],
  ['กระดาษและสมุด', ['กระดาษ', 'สมุด', 'บัตร', 'โฟโต', 'การ์ด', 'สติ๊กเกอร์', 'โปสเตอร์', 'คาร์บอน', 'โรเนียว', 'เทอร์มอล']],
  ['กาวและเทป', ['กาว', 'เทป', 'สก็อต', 'แล็กซีน', 'แลคซีน']],
  ['เครื่องเขียน', ['ดินสอ', 'ปากกา', 'ยางลบ', 'กบเหลา', 'กรรไกร', 'คัตเตอร์', 'ไม้บรรทัด', 'สี', 'พู่กัน', 'มาร์ค', 'ไฮไลท์', 'เมจิก', 'ชอล์ก']],
  ['แฟ้มและจัดเก็บ', ['แฟ้ม', 'ซอง', 'กล่อง', 'ตระกร้า', 'ตะกร้า', 'ลิ้นชัก', 'สันรูด', 'ถุง']],
  ['อุปกรณ์สำนักงาน', ['เครื่องเย็บ', 'ลวดเย็บ', 'ลวดเสียบ', 'คลิป', 'เครื่องเจาะ', 'เครื่องคำนวณ', 'เครื่องตีเบอร์', 'ที่ถอด', 'ตรายาง', 'แท่น', 'ถ่าน', 'ก้ามปู', 'มีด']],
];

function categorise(name) {
  for (const [cat, keys] of RULES) {
    if (keys.some((k) => name.includes(k))) return cat;
  }
  return 'อื่น ๆ';
}

const skipPrefixes = ['ใบเสนอราคา', 'ข้าพเจ้า', 'หมายเลขประจำตัว'];
const products = [];
const seen = new Set();
const anomalies = [];

for (const [key, sh] of Object.entries(data.sheets)) {
  for (const row of sh.rows) {
    const a = (row.A || '').trim();
    const b = (row.B || '').trim();
    if (!a && !b) continue;
    if (a === 'ลำดับ') continue;
    if (skipPrefixes.some((p) => a.startsWith(p) || b.startsWith(p))) continue;
    if (!a && b) { anomalies.push({ sheet: key, kind: 'no-seq', row }); continue; }
    if (!/^[0-9]+$/.test(a)) { anomalies.push({ sheet: key, kind: 'non-numeric-seq', row }); continue; }
    if (!b) { anomalies.push({ sheet: key, kind: 'no-name', row }); continue; }
    const seq = parseInt(a, 10);
    if (seen.has(seq)) { anomalies.push({ sheet: key, kind: 'dup-seq', row }); continue; }
    seen.add(seq);
    const priceRaw = (row.G || '').trim();
    const price = priceRaw ? parseFloat(priceRaw) : 0;
    products.push({
      id: 'p' + String(seq).padStart(3, '0'),
      seq,
      name: b,
      category: categorise(b),
      size: (row.C || '').trim(),
      model: (row.D || '').trim(),
      brand: (row.E || '').trim(),
      unit: (row.F || '').trim() || 'ชิ้น',
      price: Number.isFinite(price) ? price : 0,
      note: (row.H || '').trim(),
    });
  }
}

products.sort((x, y) => x.seq - y.seq);
const CAT_ORDER = RULES.map((r) => r[0]).concat('อื่น ๆ');
const cats = [...new Set(products.map((p) => p.category))].sort((a, b) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b));
const q = (v) => JSON.stringify(v);
const lines = [];
lines.push('// AUTO-GENERATED from "หลิ่มหมงใบเสนอราคาวัสดุสำนักงาน_2570.xlsx"');
lines.push('// Regenerate with: node scripts/gen-products.mjs');
lines.push("import type { Product } from '@/types/product';");
lines.push('');
lines.push('export const products: Product[] = [');
for (const p of products) {
  lines.push('  { id: ' + q(p.id) + ', seq: ' + p.seq + ', name: ' + q(p.name) + ', category: ' + q(p.category) + ', size: ' + q(p.size) + ', model: ' + q(p.model) + ', brand: ' + q(p.brand) + ', unit: ' + q(p.unit) + ', price: ' + p.price + ', note: ' + q(p.note) + ' },');
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
anomalies.slice(0, 20).forEach((x) => console.log('  ' + x.kind + ' @ ' + x.sheet + ' ' + JSON.stringify(x.row)));