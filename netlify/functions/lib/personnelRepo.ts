/**
 * ชั้นเข้าถึงข้อมูล "ทำเนียบบุคลากร" (Personnel Repository)
 * - ถ้าตั้งค่า MONGODB_URI → ใช้ MongoDB Atlas (collection `personnel`)
 * - ถ้ารันบนเครื่องและยังไม่ตั้งค่า MONGODB_URI → ใช้ไฟล์ .local-db/personnel.json
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { MongoClient } from 'mongodb';
import type { Person } from '../../../src/types/person';
import { isLocalDevelopment } from './env';
import { HttpError } from './http';

const COLLECTION = 'personnel';
const MAX_NAME = 200;
const MAX_POSITION = 200;

/** ฟิลด์ที่ client ส่งมาแก้ไขได้ */
export interface PersonInput {
  name?: unknown;
  position?: unknown;
}

export interface PersonRepo {
  readonly mode: 'mongodb' | 'file';
  list(): Promise<Person[]>;
  create(input: PersonInput): Promise<Person>;
  update(id: string, patch: PersonInput): Promise<Person | null>;
  remove(id: string): Promise<boolean>;
}

function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

/** รวมข้อมูลใหม่เข้ากับข้อมูลเดิมและตรวจความถูกต้อง (throws HttpError 400) */
function mergeInput(input: PersonInput, id: string, order: number, base?: Person): Person {
  const name = asText(input.name, base?.name ?? '');
  if (!name) throw new HttpError(400, 'กรุณากรอกชื่อ-นามสกุลบุคลากร');
  if (name.length > MAX_NAME) throw new HttpError(400, 'ชื่อ-นามสกุลยาวเกินไป');

  const position = asText(input.position, base?.position ?? '');
  if (position.length > MAX_POSITION) throw new HttpError(400, 'ตำแหน่งยาวเกินไป');

  const record: Person = { id, order, name, position };
  if (base?.createdAt) record.createdAt = base.createdAt;
  if (base?.updatedAt) record.updatedAt = base.updatedAt;
  return record;
}

function newPersonId(): string {
  return 'ps' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function sortByOrder(items: Person[]): Person[] {
  return [...items].sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------- MongoDB

interface PersonDoc extends Person {
  _id: string;
}

function toPerson(doc: PersonDoc): Person {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id };
}

/** เปิด connection ครั้งเดียวแล้วใช้ซ้ำระหว่าง invocation (ใช้ร่วมกับ repo สินค้า) */
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

function mongoRepo(uri: string): PersonRepo {
  const dbName = (process.env.MONGODB_DB ?? 'udtc').trim() || 'udtc';

  async function collection() {
    const client = await mongoClient(uri);
    return client.db(dbName).collection<PersonDoc>(COLLECTION);
  }

  return {
    mode: 'mongodb',

    async list() {
      const docs = await (await collection()).find({}).sort({ order: 1 }).toArray();
      return docs.map((doc) => toPerson(doc));
    },

    async create(input) {
      const col = await collection();
      const last = await col
        .find({}, { projection: { order: 1 } })
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      const record = mergeInput(input, newPersonId(), (last[0]?.order ?? 0) + 1);
      record.createdAt = new Date().toISOString();
      await col.insertOne({ ...record, _id: record.id });
      return record;
    },

    async update(id, patch) {
      const col = await collection();
      const existing = await col.findOne({ _id: id });
      if (!existing) return null;

      const base = toPerson(existing);
      const record = mergeInput(patch, id, base.order, base);
      record.updatedAt = new Date().toISOString();

      const { id: _ignored, ...fields } = record;
      await col.updateOne({ _id: id }, { $set: fields });
      return record;
    },

    async remove(id) {
      const result = await (await collection()).deleteOne({ _id: id });
      return result.deletedCount > 0;
    },
  };
}

// ------------------------------------------------------- File store (dev)

function localDbFile(): string {
  const dir = (process.env.UDTC_LOCAL_DB_DIR ?? '').trim() || join(process.cwd(), '.local-db');
  return join(dir, 'personnel.json');
}

let fileQueue: Promise<unknown> = Promise.resolve();

/** เขียนไฟล์ทีละคำขอเพื่อไม่ให้ข้อมูลชนกัน */
function withFileLock<T>(task: () => Promise<T>): Promise<T> {
  const run = fileQueue.then(task, task);
  fileQueue = run.catch(() => undefined);
  return run;
}

async function readLocalDb(): Promise<Person[]> {
  const file = localDbFile();
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Person[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeLocalDb(items: Person[]): Promise<void> {
  const file = localDbFile();
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(items, null, 2), 'utf8');
}

function fileRepo(): PersonRepo {
  return {
    mode: 'file',

    async list() {
      return sortByOrder(await readLocalDb());
    },

    create(input) {
      return withFileLock(async () => {
        const items = await readLocalDb();
        const maxOrder = items.reduce((max, item) => Math.max(max, item.order), 0);
        const record = mergeInput(input, newPersonId(), maxOrder + 1);
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

        const record = mergeInput(patch, id, items[index].order, items[index]);
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
  };
}

// ------------------------------------------------------------- entrypoint

/** เลือกแหล่งข้อมูลตาม Environment Variables (cache ไว้ทั้ง container) */
export function getPersonnelRepo(): PersonRepo {
  const holder = globalThis as unknown as { __udtcPersonnelRepo?: PersonRepo };
  if (holder.__udtcPersonnelRepo) return holder.__udtcPersonnelRepo;

  const uri = (process.env.MONGODB_URI ?? '').trim();
  let repo: PersonRepo;

  if (uri) {
    repo = mongoRepo(uri);
  } else if (isLocalDevelopment()) {
    console.warn('[api] ไม่พบ MONGODB_URI — ใช้ไฟล์ .local-db/personnel.json แทน (โหมดพัฒนาเท่านั้น)');
    repo = fileRepo();
  } else {
    throw new HttpError(
      503,
      'ยังไม่ได้เชื่อมต่อฐานข้อมูล — กรุณากำหนด MONGODB_URI ใน Environment Variables ของ Netlify',
    );
  }

  holder.__udtcPersonnelRepo = repo;
  return repo;
}


