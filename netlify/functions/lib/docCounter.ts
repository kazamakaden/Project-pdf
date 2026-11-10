/**
 * ตัวนับเลขที่เอกสารกลาง (กันเลขซ้ำข้ามเครื่อง)
 *
 * - ถ้าตั้งค่า MONGODB_URI → ใช้ MongoDB `counters` + findOneAndUpdate($inc) ซึ่ง atomic
 * - ถ้าไม่มี (โหมดพัฒนา) → ใช้ไฟล์ .local-db/doc-counters.json
 *
 * คีย์นับแยกตามวัน (เวลาไทย) เช่น doc-2026-11-10 → { seq: 3 }
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { bangkokTodayIso, buildDocCode, thaiDateLabel } from '../../../src/utils/docCode';
import type { DocNumberInfo } from '../../../src/utils/docCode';
import { HttpError } from './http';
import { mongoClient } from './repo';

interface CounterDoc {
  _id: string;
  seq: number;
  updatedAt?: string;
}

export interface AllocatedDocNumber extends DocNumberInfo {
  /** ลำดับของวันนั้น */
  seq: number;
  /** แหล่งที่มาของเลข (ใช้ตรวจสอบ/แสดงผล) */
  source: 'mongodb' | 'file';
}

function mongoUri(): string {
  return (process.env.MONGODB_URI ?? '').trim();
}

function dbName(): string {
  return (process.env.MONGODB_DB ?? 'udtc').trim() || 'udtc';
}

function counterKey(isoDate: string): string {
  return 'doc-' + isoDate;
}

/** ออกเลขถัดไปจาก MongoDB (atomic) */
async function nextFromMongo(isoDate: string): Promise<number> {
  const client = await mongoClient(mongoUri());
  const collection = client.db(dbName()).collection<CounterDoc>('counters');

  const updated = await collection.findOneAndUpdate(
    { _id: counterKey(isoDate) },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { upsert: true, returnDocument: 'after' },
  );

  return updated?.seq ?? 1;
}

// ------------------------------------------------------------ file fallback

const FILE_NAME = 'doc-counters.json';
let fileQueue: Promise<unknown> = Promise.resolve();

function countersFile(): string {
  const dir = (process.env.UDTC_LOCAL_DB_DIR ?? '').trim() || join(process.cwd(), '.local-db');
  return join(dir, FILE_NAME);
}

function withFileLock<T>(task: () => Promise<T>): Promise<T> {
  const run = fileQueue.then(task, task);
  fileQueue = run.catch(() => undefined);
  return run;
}

async function nextFromFile(isoDate: string): Promise<number> {
  return withFileLock(async () => {
    const file = countersFile();
    let counters: Record<string, number> = {};

    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        counters = parsed as Record<string, number>;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const key = counterKey(isoDate);
    const seq = (Number(counters[key]) || 0) + 1;
    counters[key] = seq;

    await fs.mkdir(dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(counters, null, 2), 'utf8');
    return seq;
  });
}

/** ออกเลขที่เอกสารของวันนี้ (เวลาไทย) */
export async function allocateDocumentNumber(now: Date = new Date()): Promise<AllocatedDocNumber> {
  const isoDate = bangkokTodayIso(now);
  const hasMongo = mongoUri().length > 0;

  if (!hasMongo && process.env.NODE_ENV !== 'development' && process.env.UDTC_ALLOW_LOCAL_DB !== '1') {
    throw new HttpError(
      503,
      'ยังไม่ได้เชื่อมต่อฐานข้อมูลสำหรับออกเลขที่เอกสาร (ต้องตั้งค่า MONGODB_URI)',
    );
  }

  const seq = hasMongo ? await nextFromMongo(isoDate) : await nextFromFile(isoDate);

  return {
    code: buildDocCode(isoDate, seq),
    dateLabel: thaiDateLabel(isoDate),
    isoDate,
    seq,
    source: hasMongo ? 'mongodb' : 'file',
  };
}
