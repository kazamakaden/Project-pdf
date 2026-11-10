import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { docFontOption, useDocFontStore } from '@/store/docFont';
import type { BasketItem } from '@/types/basket';
import type { CustomerInfo, QuotationTotals } from '@/types/quotation';
import { formatCurrency } from '@/utils/format';

/**
 * ใบประมาณการค่าใช้จ่าย — ลอกแบบจากไฟล์ Expense_Estimation_Form.xlsx
 * (แถบหัวเรื่องน้ำเงิน, หัวข้อ "ความสอดคล้องกับนโยบาย" 5 ข้อ, ตาราง 7 คอลัมน์, แถวรวมค่าวัสดุสีเหลือง)
 *
 * พิกัดทั้งหมดเป็น pixel ที่ 96dpi: 794 x 1120 px = A4 (210 x 297 mm)
 * จึงพิมพ์ออกกระดาษได้สัดส่วน 1:1 และ html2canvas จับภาพได้ตรงตามที่เห็นบนจอ
 *
 * ฟอนต์เลือกได้ 2 แบบ (ค่าเริ่มต้น TH Sarabun New) — ขนาดตัวอักษรคูณด้วย scale ของฟอนต์
 * เพื่อให้อ่านง่ายพอ ๆ กัน เพราะ TH Sarabun New ตัวเล็กกว่า Sarabun
 *
 * ถ้ารายการเกิน 20 แถว จะสร้าง "หน้าใหม่ที่หน้าตาเหมือนหน้าแรกทั้งหน้า"
 * (หัวเรื่อง + นโยบาย + หัวตาราง) แล้วต่อด้วยแถว 21, 22, ... และมียอดรวมที่หน้าสุดท้าย
 */

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1120;
const PAD_X = 30;

/** ความกว้างคอลัมน์ A-G (รวม = 734 px = ความกว้างเนื้อหา) */
const COL_WIDTHS = [57, 214, 68, 68, 102, 112, 113];
const COL_TEMPLATE = COL_WIDTHS.map((width) => `${width}px`).join(' ');

/** จำนวนแถวต่อหน้า (เท่าแบบฟอร์มกระดาษ 20 แถว) */
const ROWS_PER_PAGE = 20;
const MIN_ROWS = ROWS_PER_PAGE;
const ROW_HEIGHT = 30;

const NAVY = '#1F4E79';
const HEADER_BLUE = '#2F5597';
const TOTAL_BG = '#FFF2CC';
const INK = '#000000';

/** ตัวเลือกในหัวข้อ "ความสอดคล้องกับนโยบาย" (ข้อความตรงกับไฟล์ Expense_Estimation_Form.xlsx) */
const POLICY_ITEMS: Array<{ label: string; suffix: string; options: number }> = [
  { label: 'การดำเนินงานตามหลักของปรัชญาเศรษฐกิจพอเพียง', suffix: 'ด้านที่', options: 5 },
  { label: 'นโยบายการพัฒนาการศึกษา กระทรวงศึกษาธิการ', suffix: 'นโยบายที่', options: 11 },
  { label: 'มาตรฐานการประกันคุณภาพภายในของ สมศ.', suffix: 'มาตรฐานที่', options: 7 },
  { label: 'ยุทธศาสตร์ของ สอศ.', suffix: 'ยุทธศาสตร์ที่', options: 4 },
  { label: 'ยุทธศาสตร์การพัฒนาจังหวัดอุดรธานี', suffix: 'ยุทธศาสตร์ที่', options: 6 },
];

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: COL_TEMPLATE,
  borderBottom: `1px solid ${INK}`,
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

/** เซลล์ข้อมูล — ขนาดตัวอักษรปรับตามฟอนต์ที่เลือก */
function baseCell(scale: number): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '3px 6px',
    fontSize: 13 * scale,
    lineHeight: 1.25,
    minWidth: 0,
    borderRight: `1px solid ${INK}`,
    wordBreak: 'break-word',
  };
}

function headerCell(scale: number): CSSProperties {
  return {
    ...baseCell(scale),
    justifyContent: 'center',
    textAlign: 'center',
    color: '#FFFFFF',
    backgroundColor: HEADER_BLUE,
    fontWeight: 600,
    fontSize: 13 * scale,
    padding: '2px 4px',
  };
}

const lastCell: CSSProperties = { borderRight: 'none' };

function totalCell(scale: number): CSSProperties {
  return {
    ...baseCell(scale),
    backgroundColor: TOTAL_BG,
    fontWeight: 700,
    justifyContent: 'flex-end',
    fontSize: 13.5 * scale,
  };
}

/** หัวตาราง 7 คอลัมน์ 2 ชั้น */
function TableHeader({ scale }: { scale: number }) {
  const cell = headerCell(scale);

  return (
    <div style={{ ...rowStyle, minHeight: 68, borderBottom: `1px solid ${INK}` }}>
      <div style={{ ...cell, gridColumn: '1' }}>ลำดับที่</div>
      <div style={{ ...cell, gridColumn: '2' }}>รายการ</div>
      <div style={{ ...cell, gridColumn: '3' }}>จำนวน</div>
      <div style={{ ...cell, gridColumn: '4' }}>หน่วย</div>
      <div
        style={{
          gridColumn: '5 / span 2',
          width: 214,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: HEADER_BLUE,
          color: '#FFFFFF',
          borderRight: `1px solid ${INK}`,
          minWidth: 0,
        }}
      >
        <div
          style={{
            flex: '0 0 auto',
            width: '100%',
            /**
             * ต้องเผื่อที่ด้านล่างให้ตัวอักษรบรรทัดที่ 2 ไม่จมลงไปใต้เส้นคั่น
             * (TH Sarabun New มีระยะ ascent สูงกว่า Sarabun ทำให้ html2canvas วาดข้อความต่ำลง)
             */
            minHeight: Math.ceil(15 * scale) * 2 + 6 + (scale > 1 ? 8 : 0),
            boxSizing: 'border-box',
            textAlign: 'center',
            fontSize: 12.5 * scale,
            lineHeight: `${Math.ceil(15 * scale)}px`,
            fontWeight: 600,
            padding: '2px 4px 0',
          }}
        >
          ราคาที่สืบทราบ/
          <br />
          ประมาณการครั้งสุดท้าย
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '102px 112px',
            width: '100%',
            height: 32,
            flex: '0 0 auto',
          }}
        >
          <div
            style={{
              ...cell,
              borderRight: `1px solid ${INK}`,
              borderTop: `1px solid ${INK}`,
              borderBottom: 'none',
              justifyContent: 'center',
            }}
          >
            ราคา/หน่วย
          </div>
          <div
            style={{
              ...cell,
              borderRight: 'none',
              borderTop: `1px solid ${INK}`,
              borderBottom: 'none',
            }}
          >
            รวมเงิน
          </div>
        </div>
      </div>
      <div style={{ ...cell, gridColumn: '7', ...lastCell }}>หมายเหตุ</div>
    </div>
  );
}

/** กล่องติ๊กแบบข้อความ "[  ]" เหมือนในไฟล์ Expense_Estimation_Form.xlsx
 *  วาดเป็น span แยกชิ้น เพราะ html2canvas ยุบช่องว่างในข้อความจนเหลือช่องเดียว */
function CheckBox({ label, scale }: { label: number; scale: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 13 * scale,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span>[</span>
      <span style={{ display: 'inline-block', width: 6.5 }} />
      <span>]</span>
      <span style={{ display: 'inline-block', width: 3.25 }} />
      <span>{label}</span>
    </span>
  );
}

interface PageProps {
  customer: CustomerInfo;
  items: BasketItem[];
  /** ลำดับเริ่มต้นของรายการในหน้านี้ (0, 20, 40, ...) */
  startIndex: number;
  totals: QuotationTotals;
  /** หน้านี้เป็นหน้าสุดท้ายหรือไม่ (แสดงแถวรวมค่าวัสดุ) */
  showTotal: boolean;
  isFirst: boolean;
  scale: number;
  fontFamily: string;
  /** เลขที่เอกสาร เช่น PR-2569-1110-001 */
  docCode: string;
  /** วันที่ไทย เช่น 10 พฤศจิกายน 2569 */
  docDate: string;
}

/** หนึ่งหน้ากระดาษ A4 — หน้าตาเหมือนกันทุกหน้า ต่างกันแค่รายการที่ต่อเนื่องกัน */
function QuotationPage({
  customer,
  items,
  startIndex,
  totals,
  showTotal,
  isFirst,
  scale,
  fontFamily,
  docCode,
  docDate,
}: PageProps) {
  const cell = baseCell(scale);
  const total = totalCell(scale);
  const blankRows = showTotal ? Math.max(0, MIN_ROWS - items.length) : 0;
  const showVat = totals.includeVat && totals.vat > 0;

  return (
    <div
      style={{
        width: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: INK,
        fontFamily,
        padding: `26px ${PAD_X}px 24px`,
        ...(isFirst
          ? null
          : { pageBreakBefore: 'always' as const, breakBefore: 'page' as const }),
      }}
    >
      {/* แถบหัวเรื่อง (A1:G1) */}
      <div
        style={{
          height: 52,
          backgroundColor: NAVY,
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 20 * scale,
          lineHeight: 1.1,
          textAlign: 'center',
          padding: '0 12px',
        }}
      >
        ประมาณการค่าใช้จ่าย (ค่าใช้สอย/ค่าตอบแทน/ค่าวัสดุ)
      </div>

      {/* ข้อมูลผู้ขอ + เลขที่เอกสาร/วันที่ (แถวว่างใน xlsx) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginTop: 6,
          marginBottom: 6,
          fontSize: 13 * scale,
          lineHeight: 1.4,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 28px', minWidth: 0 }}>
          <span>
            ชื่อผู้ขอ: <span style={{ fontWeight: 600 }}>{customer.requesterName || '-'}</span>
          </span>
          <span>
            หน่วยงาน/แผนก: <span style={{ fontWeight: 600 }}>{customer.department || '-'}</span>
          </span>
        </div>
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap', flex: '0 0 auto' }}>
          <div>
            เลขที่ <span style={{ fontWeight: 600 }}>{docCode || '-'}</span>
          </div>
          <div>
            วันที่ <span style={{ fontWeight: 600 }}>{docDate || '-'}</span>
          </div>
        </div>
      </div>

      {/* หัวข้อความสอดคล้องกับนโยบาย (A3:G8) */}
      <div style={{ fontSize: 14.5 * scale, fontWeight: 700, marginTop: 2, marginBottom: 2 }}>
        ความสอดคล้องกับนโยบาย
      </div>
      <div>
        {POLICY_ITEMS.map((policy, index) => (
          <div
            key={policy.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '345px 1fr',
              minHeight: 30,
              alignItems: 'center',
              fontSize: 13.5 * scale,
              lineHeight: 1.3,
            }}
          >
            <div>
              {index + 1}. {policy.label} {policy.suffix}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 6px', alignItems: 'center' }}>
              {Array.from({ length: policy.options }, (_, option) => option + 1).map((option) => (
                <CheckBox key={option} label={option} scale={scale} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ตาราง (A10:G32) */}
      <div
        className="quotation-table"
        style={{
          marginTop: 12,
          border: `1px solid ${INK}`,
          borderBottom: 'none',
          backgroundColor: '#FFFFFF',
        }}
      >
        <TableHeader scale={scale} />

        {/* แถวรายการของหน้านี้ */}
        {items.map((item, index) => {
          const lineTotal = item.product.price * item.quantity;
          const hasPrice = item.product.price > 0;
          return (
            <div key={item.product.id} style={{ ...rowStyle, minHeight: ROW_HEIGHT }}>
              <div style={{ ...cell, justifyContent: 'center' }}>{startIndex + index + 1}</div>
              <div style={cell}>{item.product.name}</div>
              <div style={{ ...cell, justifyContent: 'center' }}>{item.quantity}</div>
              <div style={{ ...cell, justifyContent: 'center' }}>{item.product.unit}</div>
              <div style={{ ...cell, justifyContent: 'flex-end' }}>
                {hasPrice ? formatCurrency(item.product.price) : '-'}
              </div>
              <div style={{ ...cell, justifyContent: 'flex-end' }}>
                {hasPrice ? formatCurrency(lineTotal) : '-'}
              </div>
              <div
                style={{
                  ...cell,
                  ...lastCell,
                  justifyContent: 'center',
                  fontSize: 12.5 * scale,
                }}
              >
                {item.product.note || ''}
              </div>
            </div>
          );
        })}

        {/* แถวว่างให้ครบ 20 แถวเหมือนแบบฟอร์ม */}
        {Array.from({ length: blankRows }).map((_, index) => (
          <div
            key={'blank-row-' + index}
            style={{ ...rowStyle, height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
          >
            <div style={cell}>&nbsp;</div>
            <div style={cell}>&nbsp;</div>
            <div style={cell}>&nbsp;</div>
            <div style={cell}>&nbsp;</div>
            <div style={cell}>&nbsp;</div>
            <div style={cell}>&nbsp;</div>
            <div style={{ ...cell, ...lastCell }}>&nbsp;</div>
          </div>
        ))}

        {/* แถวรวมค่าวัสดุ — แสดงเฉพาะหน้าสุดท้าย */}
        {showTotal ? (
          <>
            <div
              style={{
                ...rowStyle,
                minHeight: 32,
                borderBottom: showVat ? `1px solid ${INK}` : 'none',
              }}
            >
              <div style={{ ...total, gridColumn: '1 / span 5' }}>รวมค่าวัสดุ</div>
              <div style={{ ...total, gridColumn: '6' }}>{formatCurrency(totals.subtotal)}</div>
              <div style={{ ...total, gridColumn: '7', ...lastCell }} />
            </div>

            {/* แสดง VAT ให้ชัดเจน เพื่อให้ยอดในเอกสารบวกกันได้จริง */}
            {showVat ? (
              <>
                <div style={{ ...rowStyle, minHeight: 32, borderBottom: `1px solid ${INK}` }}>
                  <div style={{ ...total, gridColumn: '1 / span 5' }}>ภาษีมูลค่าเพิ่ม 7%</div>
                  <div style={{ ...total, gridColumn: '6' }}>{formatCurrency(totals.vat)}</div>
                  <div style={{ ...total, gridColumn: '7', ...lastCell }} />
                </div>
                <div style={{ ...rowStyle, minHeight: 34, borderBottom: `3px double ${INK}` }}>
                  <div style={{ ...total, gridColumn: '1 / span 5', fontSize: 14 * scale }}>
                    รวมทั้งสิ้น
                  </div>
                  <div style={{ ...total, gridColumn: '6', fontSize: 14 * scale }}>
                    {formatCurrency(totals.grandTotal)}
                  </div>
                  <div style={{ ...total, gridColumn: '7', ...lastCell }} />
                </div>
              </>
            ) : (
              <div style={{ height: 0, borderBottom: `3px double ${INK}` }} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

interface QuotationPreviewProps {
  customer: CustomerInfo;
  items: BasketItem[];
  totals: QuotationTotals;
  /** เลขที่เอกสาร (แสดงทุกหน้า) */
  docCode: string;
  /** วันที่ไทย (แสดงทุกหน้า) */
  docDate: string;
}

const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(function QuotationPreview(
  { customer, items, totals, docCode, docDate },
  ref,
) {
  const fontId = useDocFontStore((state) => state.font);
  const scale = docFontOption(fontId).scale;
  const fontFamily = `${docFontOption(fontId).family}, 'Sarabun', 'Leelawadee UI', 'Tahoma', sans-serif`;

  /** แบ่งรายการเป็นหน้าละ 20 แถว */
  const pages: BasketItem[][] = [];
  for (let index = 0; index < items.length; index += ROWS_PER_PAGE) {
    pages.push(items.slice(index, index + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);
  const lastPage = pages.length - 1;

  return (
    <div ref={ref} style={{ width: PAGE_WIDTH, backgroundColor: '#FFFFFF', margin: '0 auto' }}>
      {pages.map((pageItems, pageIndex) => (
        <QuotationPage
          key={pageIndex}
          customer={customer}
          items={pageItems}
          startIndex={pageIndex * ROWS_PER_PAGE}
          totals={totals}
          showTotal={pageIndex === lastPage}
          isFirst={pageIndex === 0}
          scale={scale}
          fontFamily={fontFamily}
          docCode={docCode}
          docDate={docDate}
        />
      ))}
    </div>
  );
});

export { QuotationPreview };
