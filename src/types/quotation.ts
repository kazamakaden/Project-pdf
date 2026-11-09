/** ข้อมูลผู้ขออนุมัติสั่งซื้อ (กรอกในหน้าสร้างเอกสาร) */
export interface CustomerInfo {
  /** ชื่อ-นามสกุลผู้ขอ */
  requesterName: string;
  /** หน่วยงาน / แผนก / ฝ่าย */
  department: string;
}

export interface QuotationTotals {
  subtotal: number;
  vat: number;
  grandTotal: number;
  includeVat: boolean;
  vatRate: number;
}