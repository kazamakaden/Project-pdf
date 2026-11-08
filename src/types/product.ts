export interface Product {
  /** Unique id (p001, p002, ...) derived from the sequence number. */
  id: string;
  /** Original row number from the source Excel (ลำดับ). */
  seq: number;
  /** Product description (รายการ). */
  name: string;
  /** Derived catalog category for filtering. */
  category: string;
  /** Size specification (ขนาด). */
  size: string;
  /** Model / variant (รุ่น). */
  model: string;
  /** Brand (ยี่ห้อ). */
  brand: string;
  /** Unit of measure (หน่วยนับ). */
  unit: string;
  /** Unit price in THB. 0 means price on request (สอบถาม). */
  price: number;
  /** Remark (หมายเหตุ). */
  note: string;
  /** Product photo as a data URL or public path (optional). */
  imageUrl?: string;
  /** เวลาที่เพิ่มเข้าฐานข้อมูล ครั้งแรก (ISO string) */
  createdAt?: string;
  /** เวลาที่แก้ไขล่าสุด (ISO string) */
  updatedAt?: string;
}