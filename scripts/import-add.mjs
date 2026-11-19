/**
 * เพิ่มรายการจาก /tmp/xlsx_rows.json เข้า MongoDB (ADD ONLY — ไม่ลบ/ไม่แทนที่ของเดิม)
 * ใช้: MONGODB_URI=... node scripts/import-add.mjs [--dry]
 */
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error('ต้องตั้ง MONGODB_URI');
  process.exit(1);
}
const DB = process.env.MONGODB_DB ?? 'udtc';
const dry = process.argv.includes('--dry');
const rows = JSON.parse(readFileSync('/tmp/xlsx_rows.json', 'utf8'));

const BUCKETS = [
  ['กาวและเทป', ['กาว', 'เทป', 'สก็อต', 'แลกซีน']],
  ['หมึกและงานพิมพ์', ['หมึก', 'ตลับ', 'ริบบอน', 'สติกเกอร์', 'ตรายาง', 'พิมพ์']],
  ['แฟ้มและจัดเก็บ', ['แฟ้ม', 'ลิ้นชัก', 'กล่อง', 'ตะกร้า', 'ที่เก็บ', 'ชั้น', 'ซอง']],
  ['เครื่องเขียน', ['ดินสอ', 'ปากกา', 'ยางลบ', 'กบเหลา', 'ไม้บรรทัด', 'สี', 'ปากกาลบคำผิด', 'ปากกามาร์คเกอร์']],
  ['กระดาษและสมุด', ['กระดาษ', 'สมุด', 'ปก', 'เกียรติบัตร', 'สมุดบัญชี']],
];

function bucket(name) {
  for (const [cat, words] of BUCKETS) {
    if (words.some((w) => name.includes(w))) return cat;
  }
  return 'อุปกรณ์สำนักงาน';
}

const client = new MongoClient(URI, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const col = client.db(DB).collection('products');

const existing = await col.find({}, { projection: { name: 1, size: 1, model: 1, brand: 1, unit: 1 } }).toArray();
const keyOf = (p) => [p.name, p.size, p.model, p.brand, p.unit].map((v) => (v ?? '').toString().trim()).join('|');
const have = new Set(existing.map(keyOf));

let maxSeq = (await col.find().sort({ seq: -1 }).limit(1).toArray())[0]?.seq ?? 0;
const now = new Date().toISOString();
const docs = [];
let skipped = 0;
for (const r of rows) {
  const key = keyOf(r);
  if (have.has(key)) {
    skipped += 1;
    continue;
  }
  have.add(key);
  maxSeq += 1;
  const id = 'x' + String(maxSeq).padStart(3, '0');
  docs.push({
    _id: id,
    id,
    seq: maxSeq,
    name: r.name,
    category: bucket(r.name),
    size: r.size,
    model: r.model,
    brand: r.brand,
    unit: r.unit,
    price: r.price,
    note: r.note,
    createdAt: now,
  });
}

console.log(`จะเพิ่ม ${docs.length} รายการ (ข้ามซ้ำ ${skipped}) seq ${docs.length ? docs[0].seq : '-'}..${docs.length ? docs[docs.length - 1].seq : '-'}`);
if (dry) {
  console.log(JSON.stringify(docs.slice(0, 3), null, 1));
} else if (docs.length) {
  const res = await col.insertMany(docs, { ordered: false });
  console.log('inserted:', res.insertedCount);
}

console.log('count after:', await col.countDocuments());
await client.close();
