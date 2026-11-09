/**
 * ชั้นเข้าถึงข้อมูลสินค้า (Repository)
 * - ถ้าตั้งค่า MONGODB_URI → ใช้ MongoDB Atlas (ใช้จริงบนเว็บที่ deploy)
 * - ถ้ารันบนเครื่องและยังไม่ตั้งค่า MONGODB_URI → ใช้ไฟล์ .local-db/products.json (สะดวกตอนพัฒนา)
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { MongoClient } from 'mongodb';
import type { Product } from '../../../src/types/product';
import { isLocalDevelopment } from './env';
import { HttpError } from './http';

const COLLECTION = 'products';
/** เก็บธงว่า "ใส่ข้อมูลตั้งต้นอัตโนมัติไปแล้ว" — ป้องกันการ seed ซ้ำ */
const META_COLLECTION = 'meta';
const SEED_MARKER_ID = 'catalog-seed-v1';
const MAX_IMAGE_LENGTH = 2 * 1024 * 1024;
const MAX_IMPORT_ITEMS = 3000;

interface MetaDoc {
  _id: string;
  seededAt?: string;
}

/** ฟิลด์ที่ client ส่งมาแก้ไขได้ (ตรวจชนิดข้อมูลก่อนบันทึกทุกครั้ง) */
export interface ProductInput {
  name?: unknown;
  category?: unknown;
  size?: unknown;
  model?: unknown;
  brand?: unknown;
  unit?: unknown;
  price?: unknown;
  note?: unknown;
  imageUrl?: unknown;
}

export interface ProductRepo {
  readonly mode: 'mongodb' | 'file';
  list(): Promise<Product[]>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, patch: ProductInput): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
  replaceAll(items: unknown): Promise<number>;
  /** ใส่ข้อมูลตั้งต้นอัตโนมัติ (เรียกเฉพาะตอนที่ API อ่านแล้วพบว่าคลังว่าง) — คืนจำนวนที่เขียน (0 = เคย seed แล้ว) */
  ensureSeeded(items: Product[]): Promise<number>;
}

function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function asPrice(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num * 100) / 100;
}

/** รวมข้อมูลใหม่เข้ากับข้อมูลเดิมและตรวจความถูกต้อง (throws HttpError 400) */
function mergeInput(input: ProductInput, id: string, seq: number, base?: Product): Product {
  const name = asText(input.name, base?.name ?? '');
  if (!name) throw new HttpError(400, 'กรุณากรอกชื่อสินค้า');

  const record: Product = {
    id,
    seq,
    name,
    category: asText(input.category, base?.category ?? '') || 'อื่น ๆ',
    size: asText(input.size, base?.size ?? ''),
    model: asText(input.model, base?.model ?? ''),
    brand: asText(input.brand, base?.brand ?? ''),
    unit: asText(input.unit, base?.unit ?? '') || 'ชิ้น',
    price: asPrice(input.price, base?.price ?? 0),
    note: asText(input.note, base?.note ?? ''),
  };

  const imageUrl = input.imageUrl === undefined ? base?.imageUrl : asText(input.imageUrl);
  if (imageUrl) {
    if (imageUrl.length > MAX_IMAGE_LENGTH) {
      throw new HttpError(413, 'รูปภาพใหญ่เกินไป (สูงสุด ~2 MB) กรุณาเลือกรูปที่เล็กลง');
    }
    record.imageUrl = imageUrl;
  }
  if (base?.createdAt) record.createdAt = base.createdAt;
  if (base?.updatedAt) record.updatedAt = base.updatedAt;
  return record;
}

/** ตรวจรายการที่นำเข้าทั้งคลัง (ใช้ครั้งแรก + ปุ่ม "คืนค่า") */
function normaliseImport(items: unknown): Product[] {
  if (!Array.isArray(items)) throw new HttpError(400, 'ข้อมูลนำเข้าต้องเป็นรายการสินค้า');
  if (items.length === 0) throw new HttpError(400, 'ไม่มีข้อมูลสินค้าที่จะนำเข้า');
  if (items.length > MAX_IMPORT_ITEMS) {
    throw new HttpError(400, 'นำเข้าได้สูงสุด ' + MAX_IMPORT_ITEMS + ' รายการต่อครั้ง');
  }

  const now = new Date().toISOString();
  const usedIds = new Set<string>();
  const result: Product[] = [];

  items.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const input = raw as ProductInput & { id?: unknown; seq?: unknown };
    if (!asText(input.name)) return;

    let id = asText(input.id) || 'p' + String(index + 1).padStart(3, '0');
    if (usedIds.has(id)) id = id + '-' + index;
    usedIds.add(id);

    const rawSeq = Number(input.seq);
    const seq = Number.isFinite(rawSeq) && rawSeq > 0 ? Math.floor(rawSeq) : index + 1;

    const record = mergeInput(input, id, seq);
    record.createdAt = now;
    result.push(record);
  });

  if (result.length === 0) throw new HttpError(400, 'ไม่มีข้อมูลสินค้าที่นำเข้าได้');
  return result;
}

function newProductId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function sortBySeq(items: Product[]): Product[] {
  return [...items].sort((a, b) => a.seq - b.seq);
}

/** MongoDB code 11000 = _id ซ้ำ (ทั้ง error เดี่ยวและ bulk write จาก insertMany) */
function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ((error as { code?: unknown }).code === 11000) return true;
  const writeErrors = (error as { writeErrors?: Array<{ code?: number }> }).writeErrors;
  return (
    Array.isArray(writeErrors) &&
    writeErrors.length > 0 &&
    writeErrors.every((item) => item?.code === 11000)
  );
}

// ---------------------------------------------------------------- MongoDB

interface ProductDoc extends Product {
  _id: string;
}

function toProduct(doc: ProductDoc): Product {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id };
}

/** เปิด connection ครั้งเดียวแล้วใช้ซ้ำระหว่าง invocation (container ที่ยังอุ่นอยู่) */
function mongoClient(uri: string): Promise<MongoClient> {
  const holder = globalThis as unknown as { __udtcMongoClient?: Promise<MongoClient> };
  if (!holder.__udtcMongoClient) {
    holder.__udtcMongoClient = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }
  return holder.__udtcMongoClient;
}

function mongoRepo(uri: string): ProductRepo {
  const dbName = (process.env.MONGODB_DB ?? 'udtc').trim() || 'udtc';

  async function collection() {
    const client = await mongoClient(uri);
    return client.db(dbName).collection<ProductDoc>(COLLECTION);
  }

  async function meta() {
    const client = await mongoClient(uri);
    return client.db(dbName).collection<MetaDoc>(META_COLLECTION);
  }

  /** ตั้งธงว่า seed แล้ว (ใช้ร่วมกับ replaceAll ของแอดมิน) */
  async function markSeeded(): Promise<void> {
    try {
      await (await meta()).updateOne(
        { _id: SEED_MARKER_ID },
        { $setOnInsert: { seededAt: new Date().toISOString() } },
        { upsert: true },
      );
    } catch (error) {
      console.warn('[api] เขียนธง seed ไม่สำเร็จ (ไม่กระทบข้อมูล):', error);
    }
  }

  return {
    mode: 'mongodb',

    async list() {
      const docs = await (await collection()).find({}).sort({ seq: 1 }).toArray();
      return docs.map((doc) => toProduct(doc));
    },

    async create(input) {
      const col = await collection();
      const last = await col
        .find({}, { projection: { seq: 1 } })
        .sort({ seq: -1 })
        .limit(1)
        .toArray();

      const record = mergeInput(input, newProductId(), (last[0]?.seq ?? 0) + 1);
      record.createdAt = new Date().toISOString();
      await col.insertOne({ ...record, _id: record.id });
      return record;
    },

    async update(id, patch) {
      const col = await collection();
      const existing = await col.findOne({ _id: id });
      if (!existing) return null;

      const base = toProduct(existing);
      const record = mergeInput(patch, id, base.seq, base);
      record.updatedAt = new Date().toISOString();

      const { id: _ignored, ...fields } = record;
      const update: Record<string, unknown> = { $set: fields };
      if (!record.imageUrl) update.$unset = { imageUrl: '' };
      await col.updateOne({ _id: id }, update);
      return record;
    },

    async remove(id) {
      const result = await (await collection()).deleteOne({ _id: id });
      return result.deletedCount > 0;
    },

    async replaceAll(items) {
      const records = normaliseImport(items);
      const col = await collection();
      await col.deleteMany({});
      await col.insertMany(records.map((record) => ({ ...record, _id: record.id })));
      // แอดมินตั้งข้อมูลเองแล้ว → ไม่ต้อง seed อัตโนมัติอีกแม้จะลบสินค้าออกจนหมด
      await markSeeded();
      return records.length;
    },

    async ensureSeeded(items) {
      const records = normaliseImport(items);
      const metaCol = await meta();

      // เคยตั้งข้อมูลแล้ว (แอดมินนำเข้า/คืนค่าเอง) → ไม่ seed ซ้ำแม้คลังจะว่าง
      if (await metaCol.findOne({ _id: SEED_MARKER_ID })) return 0;

      // ใช้ insertMany แบบ ordered:false — ถ้าอีกคำขอ/อีก container ใส่พร้อมกัน
      // เอกสารที่มี _id อยู่แล้วจะถูกข้าม (ไม่เกิดข้อมูลซ้ำ) และถ้าล้มกลางทาง
      // คำขอครั้งถัดไปจะเติมส่วนที่ขาดให้เอง
      try {
        await (await collection()).insertMany(
          records.map((record) => ({ ...record, _id: record.id })),
          { ordered: false },
        );
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }

      await markSeeded();
      return records.length;
    },
  };
}

// ------------------------------------------------------- File store (dev)

function localDbFile(): string {
  const dir = (process.env.UDTC_LOCAL_DB_DIR ?? '').trim() || join(process.cwd(), '.local-db');
  return join(dir, 'products.json');
}

let fileQueue: Promise<unknown> = Promise.resolve();

/** เขียนไฟล์ทีละคำขอเพื่อไม่ให้ข้อมูลชนกัน */
function withFileLock<T>(task: () => Promise<T>): Promise<T> {
  const run = fileQueue.then(task, task);
  fileQueue = run.catch(() => undefined);
  return run;
}

async function readLocalDb(): Promise<Product[]> {
  const file = localDbFile();
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Product[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeLocalDb(items: Product[]): Promise<void> {
  const file = localDbFile();
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(items, null, 2), 'utf8');
}

function fileRepo(): ProductRepo {
  return {
    mode: 'file',

    async list() {
      return sortBySeq(await readLocalDb());
    },

    create(input) {
      return withFileLock(async () => {
        const items = await readLocalDb();
        const maxSeq = items.reduce((max, item) => Math.max(max, item.seq), 0);
        const record = mergeInput(input, newProductId(), maxSeq + 1);
        record.createdAt = new Date().toISOString();
        await writeLocalDb([...items, record]);
        return record;
      });
    },

    update(id, patch) {
      return withFileLock(async () => {
        const items = await readLocalDb();
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) return null;

        const record = mergeInput(patch, id, items[index].seq, items[index]);
        record.updatedAt = new Date().toISOString();

        const next = [...items];
        next[index] = record;
        await writeLocalDb(next);
        return record;
      });
    },

    remove(id) {
      return withFileLock(async () => {
        const items = await readLocalDb();
        const next = items.filter((item) => item.id !== id);
        if (next.length === items.length) return false;
        await writeLocalDb(next);
        return true;
      });
    },

    replaceAll(items) {
      return withFileLock(async () => {
        const records = normaliseImport(items);
        await writeLocalDb(records);
        return records.length;
      });
    },

    ensureSeeded(items) {
      return withFileLock(async () => {
        // มีไฟล์อยู่แล้ว = เคยตั้งข้อมูล (หรือแอดมินลบจนว่าง) → ไม่ seed ซ้ำ
        try {
          await fs.access(localDbFile());
          return 0;
        } catch {
          /* ยังไม่เคยมีไฟล์ → seed ได้ */
        }
        const records = normaliseImport(items);
        await writeLocalDb(records);
        return records.length;
      });
    },
  };
}

// ------------------------------------------------------------- entrypoint

/** เลือกแหล่งข้อมูลตาม Environment Variables (cache ไว้ทั้ง container) */
export function getRepo(): ProductRepo {
  const holder = globalThis as unknown as { __udtcProductRepo?: ProductRepo };
  if (holder.__udtcProductRepo) return holder.__udtcProductRepo;

  const uri = (process.env.MONGODB_URI ?? '').trim();
  let repo: ProductRepo;

  if (uri) {
    repo = mongoRepo(uri);
  } else if (isLocalDevelopment()) {
    console.warn('[api] ไม่พบ MONGODB_URI — ใช้ไฟล์ .local-db/products.json แทน (โหมดพัฒนาเท่านั้น)');
    repo = fileRepo();
  } else {
    throw new HttpError(
      503,
      'ยังไม่ได้เชื่อมต่อฐานข้อมูล — กรุณากำหนด MONGODB_URI ใน Environment Variables ของ Netlify',
    );
  }

  holder.__udtcProductRepo = repo;
  return repo;
}

