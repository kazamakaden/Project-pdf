import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CustomerInfo } from '@/types/quotation';

interface QuotationFormProps {
  customer: CustomerInfo;
  onCustomerChange: (patch: Partial<CustomerInfo>) => void;
}

const fieldClass = 'space-y-1';
const sectionClass =
  'space-y-3 rounded-lg border border-royal/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const headingClass = 'text-sm font-semibold text-slate-900 dark:text-white';

export function QuotationForm({ customer, onCustomerChange }: QuotationFormProps) {
  return (
    <div className="space-y-4">
      <section className={sectionClass}>
        <h2 className={headingClass}>ข้อมูลผู้ขออนุมัติ</h2>
        <div className="grid gap-3">
          <div className={fieldClass}>
            <Label htmlFor="requesterName">ชื่อผู้ขอ</Label>
            <Input
              id="requesterName"
              value={customer.requesterName}
              onChange={(event) => onCustomerChange({ requesterName: event.target.value })}
              placeholder="ชื่อ-นามสกุลผู้ขอ"
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="department">หน่วยงาน / แผนก</Label>
            <Input
              id="department"
              value={customer.department}
              onChange={(event) => onCustomerChange({ department: event.target.value })}
              placeholder="เช่น งานพัสดุ / แผนกวิชาช่างไฟฟ้า"
            />
          </div>
        </div>
        <p className="rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          ภาษีมูลค่าเพิ่ม 7% เปิด/ปิดได้ที่หน้าตะกร้าสินค้า — ถ้าเปิด เอกสารจะแสดง “รวมค่าวัสดุ”,
          “ภาษีมูลค่าเพิ่ม 7%” และ “รวมทั้งสิ้น” เพื่อให้ยอดบวกกันได้จริง
        </p>
      </section>
    </div>
  );
}
