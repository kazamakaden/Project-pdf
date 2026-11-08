import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CustomerInfo, QuotationMeta } from '@/types/quotation';

interface QuotationFormProps {
  customer: CustomerInfo;
  onCustomerChange: (patch: Partial<CustomerInfo>) => void;
  meta: QuotationMeta;
  onMetaChange: (patch: Partial<QuotationMeta>) => void;
  includeVat: boolean;
  onIncludeVatChange: (value: boolean) => void;
}

const fieldClass = 'space-y-1';
const sectionClass =
  'space-y-3 rounded-lg border border-royal/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const headingClass = 'text-sm font-semibold text-slate-900 dark:text-white';

export function QuotationForm({
  customer,
  onCustomerChange,
  meta,
  onMetaChange,
  includeVat,
  onIncludeVatChange,
}: QuotationFormProps) {
  return (
    <div className="space-y-4">
      <section className={sectionClass}>
        <h2 className={headingClass}>ข้อมูลลูกค้า</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <Label htmlFor="contactName">ชื่อผู้ติดต่อ</Label>
            <Input
              id="contactName"
              value={customer.contactName}
              onChange={(event) => onCustomerChange({ contactName: event.target.value })}
              placeholder="ชื่อ-นามสกุล"
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="organization">หน่วยงาน / บริษัท</Label>
            <Input
              id="organization"
              value={customer.organization}
              onChange={(event) => onCustomerChange({ organization: event.target.value })}
              placeholder="ชื่อหน่วยงาน (ถ้ามี)"
            />
          </div>
          <div className={fieldClass + ' sm:col-span-2'}>
            <Label htmlFor="address">ที่อยู่</Label>
            <Input
              id="address"
              value={customer.address}
              onChange={(event) => onCustomerChange({ address: event.target.value })}
              placeholder="ที่อยู่สำหรับออกเอกสาร"
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
            <Input
              id="taxId"
              value={customer.taxId}
              onChange={(event) => onCustomerChange({ taxId: event.target.value })}
              placeholder="0-0000-00000-00-0"
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>รายละเอียดใบเสนอราคา</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <Label htmlFor="quotationNo">เลขที่ใบเสนอราคา</Label>
            <Input
              id="quotationNo"
              value={meta.quotationNo}
              onChange={(event) => onMetaChange({ quotationNo: event.target.value })}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="reference">อ้างอิง</Label>
            <Input
              id="reference"
              value={meta.reference}
              onChange={(event) => onMetaChange({ reference: event.target.value })}
              placeholder="เลขที่หนังสือ/โครงการ (ถ้ามี)"
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="issueDate">วันที่</Label>
            <Input
              id="issueDate"
              type="date"
              value={meta.issueDate}
              onChange={(event) => onMetaChange({ issueDate: event.target.value })}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="validUntil">ยืนราคาถึง</Label>
            <Input
              id="validUntil"
              type="date"
              value={meta.validUntil}
              onChange={(event) => onMetaChange({ validUntil: event.target.value })}
            />
          </div>
          <div className={fieldClass + ' sm:col-span-2'}>
            <Label htmlFor="note">หมายเหตุ</Label>
            <Input
              id="note"
              value={meta.note}
              onChange={(event) => onMetaChange({ note: event.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
          <Switch checked={includeVat} onCheckedChange={onIncludeVatChange} aria-label="เปิด/ปิด VAT" />
          <div className="text-sm">
            <p className="font-medium text-slate-800 dark:text-slate-100">คิดภาษีมูลค่าเพิ่ม 7%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              เปิด/ปิดการคำนวณ VAT ในใบเสนอราคา
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}