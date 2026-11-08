const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** Convert a group of up to 6 digits (0 - 999999) into Thai words. */
function convertGroup(value: number): string {
  const digits = String(value).split('').map(Number);
  const length = digits.length;
  let out = '';
  let started = false;

  for (let i = 0; i < length; i++) {
    const digit = digits[i];
    const place = length - i - 1;
    if (digit === 0) continue;

    if (place === 1 && digit === 1) {
      out += 'สิบ';
      started = true;
      continue;
    }
    if (place === 1 && digit === 2) {
      out += 'ยี่สิบ';
      started = true;
      continue;
    }
    if (place === 0 && digit === 1) {
      out += started ? 'เอ็ด' : 'หนึ่ง';
      continue;
    }

    out += DIGITS[digit] + PLACES[place];
    started = true;
  }

  return out;
}

/** Convert a non-negative integer into Thai words (supports ล้าน). */
function readInteger(value: number): string {
  if (value === 0) return 'ศูนย์';
  let out = '';
  let rest = Math.floor(value);

  if (rest >= 1_000_000) {
    const millions = Math.floor(rest / 1_000_000);
    out += readInteger(millions) + 'ล้าน';
    rest %= 1_000_000;
    if (rest === 0) return out;
  }

  out += convertGroup(rest);
  return out;
}

/**
 * Convert an amount into Thai Baht text, e.g. 1250.5 -> "หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์".
 */
export function bahtText(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '';
  const fixed = amount.toFixed(2);
  const [bahtPart, satangPart] = fixed.split('.');
  const baht = parseInt(bahtPart, 10);
  const satang = parseInt(satangPart, 10);

  let text = readInteger(baht) + 'บาท';
  if (satang === 0) {
    text += 'ถ้วน';
  } else {
    text += readInteger(satang) + 'สตางค์';
  }
  return text;
}