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
