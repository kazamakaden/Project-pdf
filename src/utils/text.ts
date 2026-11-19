/**
 * จัดข้อความไทยให้อ่านง่าย: ใส่ช่องว่างตรงรอยต่อไทย↔ตัวเลข อังกฤษ↔ไทย
 * เช่น "กรรไกร8นิ้ว3M/1408" → "กรรไกร 8 นิ้ว 3M/1408"
 * ใช้กับชื่อสินค้าที่นำเข้าจากไฟล์ผู้ขาย ซึ่งบางแถวไม่ได้เว้นวรรคมาให้
 */
const THAI = '\u0E00-\u0E7F';

export function prettyThaiText(value: string | undefined | null): string {
  if (!value) return '';
  let text = String(value).replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
  // ไทย → ตัวเลข/อังกฤษ
  text = text.replace(new RegExp(`([${THAI}])([0-9A-Za-z])`, 'g'), '$1 $2');
  // ตัวเลข/อังกฤษ → ไทย
  text = text.replace(new RegExp(`([0-9A-Za-z])([${THAI}])`, 'g'), '$1 $2');
  // ตัวเลขติดหน่วยไทย เช่น 500แผ่น → 500 แผ่น (กรณีขึ้นต้นประโยค)
  text = text.replace(new RegExp(`([0-9])([${THAI}])`, 'g'), '$1 $2');
  // "/" ให้มีช่องว่างรอบ ๆ เพื่อไม่ให้ชนกัน
  text = text.replace(/\s*\/\s*/g, ' / ');
  return text.replace(/\s{2,}/g, ' ').trim();
}

/**
 * ชื่อหลักของสินค้า (ตัดขนาด/รุ่นที่ติดท้ายชื่อออก) ใช้จัดกลุ่มสินค้าตระกูลเดียวกัน
 * "กรรไกร 8 นิ้ว 3M / 1408" → "กรรไกร"
 * ถ้าสินค้ามีฟิลด์ size แยกอยู่แล้ว ใช้ชื่อเดิมเป็นชื่อหลัก
 */
const SIZE_WORDS = ['นิ้ว', 'ซม', 'ซม.', 'มม', 'มม.', 'เมตร', 'ลิตร', 'กก', 'กก.', 'กรัม', 'ออนซ์', 'หลา', 'ฟุต', 'แผ่น', 'ชุด', 'ม.'];
const SIZE_RE = new RegExp(`[0-9]+(?:[.,][0-9]+)?\\s*(?:${SIZE_WORDS.map((w) => w.replace('.', '\\.')).join('|')})$`, 'u');

export function baseNameOf(name: string | undefined | null, size?: string | null): string {
  const pretty = prettyThaiText(name);
  if (size && String(size).trim()) return pretty;

  let base = pretty.replace(/\s*\/\s*/gu, ' ').trim();
  for (let guard = 0; guard < 8; guard += 1) {
    const before = base;
    // ตัดวลีขนาดท้ายชื่อ ("8 นิ้ว", "500 แผ่น")
    if (SIZE_RE.test(base)) {
      base = base.replace(SIZE_RE, '').trim();
    } else {
      // ตัดคำท้ายที่เป็นรหัสรุ่น (มีตัวเลข) หรือตัวคั่นล้วน
      const parts = base.split(' ').filter(Boolean);
      const last = parts[parts.length - 1] ?? '';
      if (parts.length > 1 && (/[0-9]/.test(last) || /^[/.-]+$/.test(last))) {
        parts.pop();
        base = parts.join(' ');
      }
    }
    if (base === before) break;
  }
  return base.trim() || pretty;
}
