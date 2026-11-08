/** ย่อ/บีบอัดรูปสินค้าเป็น data URL เพื่อเก็บใน localStorage และใช้ในไฟล์ PDF ได้ทันที */

const MAX_DIMENSION = 720;
const INITIAL_QUALITY = 0.75;
const MIN_QUALITY = 0.4;
const MAX_BASE64_LENGTH = 320 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
    image.src = src;
  });
}

/**
 * อ่านไฟล์รูปแล้วย่อขนาด + บีบอัดเป็น JPEG data URL
 * @throws Error เมื่อไฟล์ไม่ใช่รูปภาพ หรือประมวลผลไม่ได้
 */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');

  const original = await readFileAsDataUrl(file);
  const image = await loadImageElement(original);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return original;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > MAX_BASE64_LENGTH && quality > MIN_QUALITY) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return dataUrl;
}

/** ประมาณขนาดพื้นที่ที่ข้อมูลใช้ (ไบต์) */
export function estimateBytes(value: string): number {
  return value.length;
}

/** แปลงไบต์เป็นข้อความอ่านง่าย */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
