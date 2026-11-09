/** บุคลากร 1 คนใน "ทำเนียบบุคลากร" (แอดมินเป็นผู้เพิ่ม/แก้ไข/ลบ) */
export interface Person {
  /** รหัสบุคลากร (สร้างอัตโนมัติ) */
  id: string;
  /** ชื่อ-นามสกุล */
  name: string;
  /** ตำแหน่ง / หน้าที่ */
  position: string;
  /** ลำดับการแสดงผล */
  order: number;
  /** เวลาที่เพิ่มเข้าฐานข้อมูล ครั้งแรก (ISO string) */
  createdAt?: string;
  /** เวลาที่แก้ไขล่าสุด (ISO string) */
  updatedAt?: string;
}
