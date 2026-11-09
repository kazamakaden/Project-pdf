import { forwardRef } from 'react';
import { SITE } from '@/config/site';
import type { BasketItem } from '@/types/basket';
import type { CustomerInfo, QuotationMeta, QuotationTotals } from '@/types/quotation';
import { bahtText } from '@/utils/bahttext';
import { formatCurrency, formatDateThai } from '@/utils/format';

interface QuotationPreviewProps {
  customer: CustomerInfo;
  meta: QuotationMeta;
  items: BasketItem[];
  totals: QuotationTotals;
}

const thClass = 'border border-slate-400 px-1 py-[2px] text-center align-top';
const tdClass = 'border border-slate-300 px-1 py-[2px] align-top';

const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(function QuotationPreview(
  { customer, meta, items, totals },
  ref,
) {
  return (
    <div
      ref={ref}
      className="mx-auto bg-white text-slate-900"
      style={{ width: '794px', minHeight: '1120px', padding: '22px 36px', boxSizing: 'border-box' }}
    >
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E40AF] pb-2">
        <div className="flex max-w-[68%] items-start gap-3">
          <img
            src="/logo.png"
            alt="โลโก้วิทยาลัยเทคนิคอุดรธานี"
            className="h-14 w-auto shrink-0 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-[#1E40AF]">{SITE.nameTh}</h1>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{SITE.nameEn}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
              {SITE.address}
              <br />
              โทร. {SITE.phone} · โทรสาร {SITE.fax}
              <br />
              เลขประจำตัวผู้เสียภาษี {SITE.taxId}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block border border-[#1E40AF] px-4 py-1.5 text-lg font-bold text-[#1E40AF]">
            ใบเสนอราคา
          </div>
          <p className="mt-1 text-[10px] tracking-widest text-slate-400">QUOTATION</p>
        </div>
      </div>

      <div className="mt-2 flex items-start justify-between">
        <div className="max-w-[55%] text-[11px]">
          <p className="font-semibold text-slate-500">เรียน / ลูกค้า</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{customer.contactName || '-'}</p>
          {customer.organization ? <p className="text-slate-600">{customer.organization}</p> : null}
          {customer.address ? <p className="leading-relaxed text-slate-600">{customer.address}</p> : null}
          {customer.taxId ? (
            <p className="text-slate-600">เลขประจำตัวผู้เสียภาษี {customer.taxId}</p>
          ) : null}
        </div>
        <div className="text-[11px] leading-relaxed text-slate-700">
          <p>
            <span className="text-slate-500">เลขที่: </span>
            <span className="font-semibold text-slate-900">{meta.quotationNo || '-'}</span>
          </p>
          <p>
            <span className="text-slate-500">วันที่: </span>
            <span className="font-medium text-slate-900">{formatDateThai(meta.issueDate)}</span>
          </p>
          <p>
            <span className="text-slate-500">ยืนราคาถึง: </span>
            <span className="font-medium text-slate-900">{formatDateThai(meta.validUntil)}</span>
          </p>
          {meta.reference ? (
            <p>
              <span className="text-slate-500">อ้างอิง: </span>
              <span className="font-medium text-slate-900">{meta.reference}</span>
            </p>
          ) : null}
        </div>
      </div>

      <table className="mt-2 w-full border-collapse text-[10.5px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '30px' }} />
          <col />
          <col style={{ width: '66px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '54px' }} />
          <col style={{ width: '42px' }} />
          <col style={{ width: '36px' }} />
          <col style={{ width: '64px' }} />
          <col style={{ width: '74px' }} />
        </colgroup>
        <thead>
          <tr className="bg-[#1E40AF] text-white">
            <th className={thClass}>ลำดับ</th>
            <th className={thClass + ' text-left'}>รายการ</th>
            <th className={thClass}>ขนาด</th>
            <th className={thClass}>รุ่น</th>
            <th className={thClass}>ยี่ห้อ</th>
            <th className={thClass}>หน่วย</th>
            <th className={thClass}>จำนวน</th>
            <th className={thClass + ' text-right'}>ราคา/หน่วย</th>
            <th className={thClass + ' text-right'}>จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={9} className="border border-slate-300 py-8 text-center text-slate-400">
                ยังไม่มีรายการสินค้า
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const lineTotal = item.product.price * item.quantity;
              return (
                <tr key={item.product.id} style={{ pageBreakInside: 'avoid' }}>
                  <td className={tdClass + ' text-center'}>{index + 1}</td>
                  <td className={tdClass}>{item.product.name}</td>
                  <td className={tdClass + ' text-center'}>{item.product.size || '-'}</td>
                  <td className={tdClass + ' text-center'}>{item.product.model || '-'}</td>
                  <td className={tdClass + ' text-center'}>{item.product.brand || '-'}</td>
                  <td className={tdClass + ' text-center'}>{item.product.unit}</td>
                  <td className={tdClass + ' text-center'}>{item.quantity}</td>
                  <td className={tdClass + ' text-right'}>
                    {item.product.price > 0 ? formatCurrency(item.product.price) : 'สอบถาม'}
                  </td>
                  <td className={tdClass + ' text-right'}>
                    {item.product.price > 0 ? formatCurrency(lineTotal) : 'สอบถาม'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="quotation-summary mt-2 flex justify-end">
        <div className="w-[240px] text-[11px] text-slate-700">
          <div className="flex justify-between leading-relaxed">
            <span className="text-slate-500">รวมเป็นเงิน</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.includeVat ? (
            <div className="flex justify-between leading-relaxed">
              <span className="text-slate-500">ภาษีมูลค่าเพิ่ม 7%</span>
              <span>{formatCurrency(totals.vat)}</span>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between border-t border-slate-500 pt-0.5 text-sm font-bold text-[#1E40AF]">
            <span>รวมทั้งสิ้น</span>
            <span>{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      <p className="quotation-baht text-[11px] text-slate-700">
        <span className="text-slate-500">(ตัวอักษร) </span>
        {bahtText(totals.grandTotal)}
      </p>

      {meta.note ? (
        <p className="quotation-note mt-1 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
          หมายเหตุ: {meta.note}
        </p>
      ) : null}

      <div className="quotation-signature mt-4 flex justify-between text-center text-[11px]">
        <div className="w-[45%]">
          <div className="mx-auto h-10 w-40 border-b border-dotted border-slate-400" />
          <p className="mt-1 text-slate-600">ผู้สั่งซื้อ / ผู้อนุมัติ</p>
          <p className="text-slate-500">วันที่ ........./........./.........</p>
        </div>
        <div className="w-[45%]">
          <div className="mx-auto h-10 w-40 border-b border-dotted border-slate-400" />
          <p className="mt-1 font-medium text-slate-800">{SITE.signatoryName}</p>
          <p className="text-slate-600">{SITE.signatoryTitle}</p>
        </div>
      </div>

      <p className="mt-3 text-center text-[9px] text-slate-400">
        {SITE.documentFooter} · {SITE.nameTh}
      </p>
    </div>
  );
});

export { QuotationPreview };