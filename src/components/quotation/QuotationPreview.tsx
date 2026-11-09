import { forwardRef } from 'react';
import { SITE } from '@/config/site';
import type { BasketItem } from '@/types/basket';
import type { CustomerInfo, QuotationTotals } from '@/types/quotation';
import { formatCurrency } from '@/utils/format';

/** ตัวเลือกในหัวข้อ "ความสอดคล้องกับนโยบาย" (ตรงกับไฟล์ Expense_Estimation_Form.xlsx) */
const POLICY_ITEMS: Array<{ label: string; suffix: string; options: number }> = [
  { label: 'การดำเนินงานตามหลักของปรัชญาเศรษฐกิจพอเพียง', suffix: 'ด้านที่', options: 5 },
  { label: 'นโยบายการพัฒนาการศึกษา กระทรวงศึกษาธิการ', suffix: 'นโยบายที่', options: 11 },
  { label: 'มาตรฐานการประกันคุณภาพภายในของ สมศ.', suffix: 'มาตรฐานที่', options: 7 },
  { label: 'ยุทธศาสตร์ของ สอศ.', suffix: 'ยุทธศาสตร์ที่', options: 4 },
  { label: 'ยุทธศาสตร์การพัฒนาจังหวัดอุดรธานี', suffix: 'ยุทธศาสตร์ที่', options: 6 },
];

/** จำนวนแถวขั้นต่ำของตาราง เพื่อให้ได้หน้าตาเหมือนแบบฟอร์มกระดาษ */
const MIN_ROWS = 10;

const thClass = 'border border-slate-500 px-1 py-[3px] text-center align-middle font-semibold';
const tdClass = 'border border-slate-500 px-1 py-[3px] align-top';

interface QuotationPreviewProps {
  customer: CustomerInfo;
  items: BasketItem[];
  totals: QuotationTotals;
}

/** กล่องติ๊ก (ว่าง) สำหรับให้ทำเครื่องหมายบนกระดาษ */
function CheckBox({ label }: { label: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="inline-block h-[9px] w-[9px] border border-slate-600" />
      <span>{label}</span>
    </span>
  );
}

const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(function QuotationPreview(
  { customer, items, totals },
  ref,
) {
  const emptyRows = Math.max(0, MIN_ROWS - items.length);

  return (
    <div
      ref={ref}
      className="mx-auto bg-white text-slate-900"
      style={{ width: '794px', minHeight: '1120px', padding: '26px 30px', boxSizing: 'border-box' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <img
            src="/logo.png"
            alt="โลโก้วิทยาลัยเทคนิคอุดรธานี"
            className="h-16 w-16 shrink-0 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold leading-tight">{SITE.nameTh}</h1>
            <p className="text-[10px] leading-relaxed text-slate-600">{SITE.address}</p>
            <p className="text-[10px] leading-relaxed text-slate-600">
              โทร. {SITE.phone} · โทรสาร {SITE.fax}
            </p>
            <p className="text-[10px] leading-relaxed text-slate-600">{SITE.email}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">ใบขออนุมัติสั่งซื้อ</h2>
          <p className="mt-0.5 text-[10px] text-slate-600">
            ประมาณการค่าใช้จ่าย (ค่าใช้สอย/ค่าตอบแทน/ค่าวัสดุ)
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 border-y border-slate-400 py-1.5 text-[11px]">
        <p>
          <span className="text-slate-500">ชื่อผู้ขอ: </span>
          <span className="font-medium">{customer.requesterName || '-'}</span>
        </p>
        <p>
          <span className="text-slate-500">หน่วยงาน/แผนก: </span>
          <span className="font-medium">{customer.department || '-'}</span>
        </p>
      </div>

      <div className="mt-3 border border-slate-500">
        <p className="border-b border-slate-500 bg-slate-100 px-2 py-[3px] text-[11px] font-bold">
          ความสอดคล้องกับนโยบาย
        </p>
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {POLICY_ITEMS.map((policy, index) => (
              <tr key={policy.label}>
                <td className="w-5 border-b border-r border-slate-300 px-1 py-[3px] text-center align-top">
                  {index + 1}.
                </td>
                <td className="border-b border-r border-slate-300 px-1 py-[3px] align-top">
                  {policy.label} {policy.suffix}
                </td>
                <td className="w-[46%] border-b border-slate-300 px-1 py-[3px] align-top">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {Array.from({ length: policy.options }, (_, i) => i + 1).map((option) => (
                      <CheckBox key={option} label={option} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <table className="quotation-table mt-3 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-100">
            <th rowSpan={2} className={thClass + ' w-[7%]'}>
              ลำดับที่
            </th>
            <th rowSpan={2} className={thClass + ' w-[31%]'}>
              รายการ
            </th>
            <th rowSpan={2} className={thClass + ' w-[8%]'}>
              จำนวน
            </th>
            <th rowSpan={2} className={thClass + ' w-[8%]'}>
              หน่วย
            </th>
            <th colSpan={2} className={thClass}>
              ราคาที่สืบทราบ / ประมาณการครั้งสุดท้าย
            </th>
            <th rowSpan={2} className={thClass + ' w-[14%]'}>
              หมายเหตุ
            </th>
          </tr>
          <tr className="bg-slate-100">
            <th className={thClass + ' w-[11%]'}>ราคา/หน่วย</th>
            <th className={thClass + ' w-[12%]'}>รวมเงิน</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className={tdClass + ' py-6 text-center text-slate-400'}>
                ยังไม่มีรายการสินค้า
              </td>
            </tr>
          ) : null}
          {items.map((item, index) => {
            const lineTotal = item.product.price * item.quantity;
            const hasPrice = item.product.price > 0;
            return (
              <tr key={item.product.id} style={{ pageBreakInside: 'avoid' }}>
                <td className={tdClass + ' text-center'}>{index + 1}</td>
                <td className={tdClass}>{item.product.name}</td>
                <td className={tdClass + ' text-center'}>{item.quantity}</td>
                <td className={tdClass + ' text-center'}>{item.product.unit}</td>
                <td className={tdClass + ' text-right'}>
                  {hasPrice ? formatCurrency(item.product.price) : '-'}
                </td>
                <td className={tdClass + ' text-right'}>
                  {hasPrice ? formatCurrency(lineTotal) : '-'}
                </td>
                <td className={tdClass + ' text-center'}>{item.product.note || ''}</td>
              </tr>
            );
          })}
          {Array.from({ length: emptyRows }).map((_, index) => (
            <tr key={'blank-row-' + index}>
              <td className={tdClass}>&nbsp;</td>
              <td className={tdClass}>&nbsp;</td>
              <td className={tdClass}>&nbsp;</td>
              <td className={tdClass}>&nbsp;</td>
              <td className={tdClass}>&nbsp;</td>
              <td className={tdClass}>&nbsp;</td>
              <td className={tdClass}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="border border-slate-500 px-2 py-1 text-right font-bold">
              รวมค่าวัสดุ
            </td>
            <td className="border border-slate-500 px-2 py-1 text-right font-bold">
              {formatCurrency(totals.grandTotal)}
            </td>
            <td className="border border-slate-500" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
});

export { QuotationPreview };
