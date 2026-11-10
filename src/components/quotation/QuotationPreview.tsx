import { Fragment, forwardRef } from 'react';
import type { CSSProperties } from 'react';
import type { BasketItem } from '@/types/basket';
import type { CustomerInfo, QuotationTotals } from '@/types/quotation';
import { formatCurrency } from '@/utils/format';

/**
 * ใบประมาณการค่าใช้จ่าย — ลอกแบบจากไฟล์ Expense_Estimation_Form.xlsx
 * (แถบหัวเรื่องน้ำเงิน, หัวข้อ "ความสอดคล้องกับนโยบาย" 5 ข้อ, ตาราง 7 คอลัมน์, แถวรวมค่าวัสดุสีเหลือง)
 *
 * พิกัดทั้งหมดเป็น pixel ที่ 96dpi: 794 x 1120 px = A4 (210 x 297 mm)
 * จึงพิมพ์ออกกระดาษได้สัดส่วน 1:1 และ html2canvas จับภาพได้ตรงตามที่เห็นบนจอ
 */

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1120;
const PAD_X = 30;

/** ความกว้างคอลัมน์ A-G (รวม = 734 px = ความกว้างเนื้อหา) */
const COL_WIDTHS = [57, 214, 68, 68, 102, 112, 113];
const COL_TEMPLATE = COL_WIDTHS.map((width) => `${width}px`).join(' ');

/** จำนวนแถวขั้นต่ำของตาราง ให้เต็มหน้าเหมือนแบบฟอร์มกระดาษ (xlsx มี 20 แถว) */
const MIN_ROWS = 20;
/** จำนวนรายการต่อหน้า — เกินกว่านี้ขึ้นหน้าใหม่พร้อมหัวตารางซ้ำ */
const ROWS_PER_PAGE = 20;
const ROW_HEIGHT = 30;

const NAVY = '#1F4E79';
const HEADER_BLUE = '#2F5597';
const TOTAL_BG = '#FFF2CC';
const INK = '#000000';
const FONT = "'Sarabun', 'Leelawadee UI', 'Tahoma', sans-serif";

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

const baseCell: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '3px 6px',
  fontSize: 13,
  lineHeight: 1.25,
  minWidth: 0,
  borderRight: `1px solid ${INK}`,
  wordBreak: 'break-word',
};

const headerCell: CSSProperties = {
  ...baseCell,
  justifyContent: 'center',
  textAlign: 'center',
  color: '#FFFFFF',
  backgroundColor: HEADER_BLUE,
  fontWeight: 600,
  fontSize: 13,
  padding: '2px 4px',
};

const lastCell: CSSProperties = { borderRight: 'none' };

const totalCell: CSSProperties = {
  ...baseCell,
  backgroundColor: TOTAL_BG,
  fontWeight: 700,
  justifyContent: 'flex-end',
  fontSize: 13.5,
};

/** หัวตาราง 7 คอลัมน์ 2 ชั้น (ใช้ซ้ำเมื่อขึ้นหน้าใหม่) */
function TableHeader({ topBorder = false }: { topBorder?: boolean }) {
  return (
    <div
      style={{
        ...rowStyle,
        height: 68,
        borderBottom: `1px solid ${INK}`,
        ...(topBorder ? { borderTop: `1px solid ${INK}` } : null),
      }}
    >
      <div style={{ ...headerCell, gridColumn: '1' }}>ลำดับที่</div>
      <div style={{ ...headerCell, gridColumn: '2' }}>รายการ</div>
      <div style={{ ...headerCell, gridColumn: '3' }}>จำนวน</div>
      <div style={{ ...headerCell, gridColumn: '4' }}>หน่วย</div>
      <div
        style={{
          gridColumn: '5 / span 2',
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
            height: 36,
            boxSizing: 'border-box',
            textAlign: 'center',
            fontSize: 12.5,
            lineHeight: '15px',
            fontWeight: 600,
            padding: '2px 4px 0',
            borderBottom: `1px solid ${INK}`,
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
            height: 32,
            flex: '0 0 auto',
          }}
        >
          <div
            style={{
              ...headerCell,
              borderRight: `1px solid ${INK}`,
              borderBottom: 'none',
              justifyContent: 'center',
            }}
          >
            ราคา/หน่วย
          </div>
          <div style={{ ...headerCell, borderRight: 'none', borderBottom: 'none' }}>รวมเงิน</div>
        </div>
      </div>
      <div style={{ ...headerCell, gridColumn: '7', ...lastCell }}>หมายเหตุ</div>
    </div>
  );
}

interface QuotationPreviewProps {
  customer: CustomerInfo;
  items: BasketItem[];
  totals: QuotationTotals;
}

/** กล่องติ๊กแบบข้อความ "[  ]" เหมือนในไฟล์ Expense_Estimation_Form.xlsx
 *  วาดเป็น span แยกชิ้น เพราะ html2canvas ยุบช่องว่างในข้อความจนเหลือช่องเดียว */
function CheckBox({ label }: { label: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 13,
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

const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(function QuotationPreview(
  { customer, items, totals },
  ref,
) {
  const emptyRows = Math.max(0, MIN_ROWS - items.length);
  const showVat = totals.includeVat && totals.vat > 0;

  return (
    <div
      ref={ref}
      style={{
        width: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: INK,
        fontFamily: FONT,
        padding: `26px ${PAD_X}px 24px`,
        margin: '0 auto',
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
          fontSize: 20,
          lineHeight: 1.1,
          textAlign: 'center',
          padding: '0 12px',
        }}
      >
        ประมาณการค่าใช้จ่าย (ค่าใช้สอย/ค่าตอบแทน/ค่าวัสดุ)
      </div>

      {/* ข้อมูลผู้ขอ (แถวว่างใน xlsx — ใช้เป็นที่พิมพ์ชื่อผู้ขอ/หน่วยงาน) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2px 28px',
          minHeight: 24,
          marginTop: 6,
          marginBottom: 6,
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        <span>
          ชื่อผู้ขอ: <span style={{ fontWeight: 600 }}>{customer.requesterName || '-'}</span>
        </span>
        <span>
          หน่วยงาน/แผนก: <span style={{ fontWeight: 600 }}>{customer.department || '-'}</span>
        </span>
      </div>

      {/* หัวข้อความสอดคล้องกับนโยบาย (A3:G8) */}
      <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 2, marginBottom: 2 }}>
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
              fontSize: 13.5,
              lineHeight: 1.3,
            }}
          >
            <div>
              {index + 1}. {policy.label} {policy.suffix}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 9px', alignItems: 'center' }}>
              {Array.from({ length: policy.options }, (_, option) => option + 1).map((option) => (
                <CheckBox key={option} label={option} />
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
        <TableHeader />

        {/* แถวรายการ */}
        {items.map((item, index) => {
          const lineTotal = item.product.price * item.quantity;
          const hasPrice = item.product.price > 0;
          const startsNewPage = index > 0 && index % ROWS_PER_PAGE === 0;
          return (
            <Fragment key={item.product.id}>
              {startsNewPage ? (
                <div
                  style={{
                    pageBreakBefore: 'always',
                    breakBefore: 'page',
                    paddingTop: 26,
                  }}
                >
                  <TableHeader topBorder />
                </div>
              ) : null}
              <div style={{ ...rowStyle, minHeight: ROW_HEIGHT }}>
                <div style={{ ...baseCell, justifyContent: 'center' }}>{index + 1}</div>
                <div style={baseCell}>{item.product.name}</div>
                <div style={{ ...baseCell, justifyContent: 'center' }}>{item.quantity}</div>
                <div style={{ ...baseCell, justifyContent: 'center' }}>{item.product.unit}</div>
                <div style={{ ...baseCell, justifyContent: 'flex-end' }}>
                  {hasPrice ? formatCurrency(item.product.price) : '-'}
                </div>
                <div style={{ ...baseCell, justifyContent: 'flex-end' }}>
                  {hasPrice ? formatCurrency(lineTotal) : '-'}
                </div>
                <div style={{ ...baseCell, ...lastCell, justifyContent: 'center', fontSize: 12.5 }}>
                  {item.product.note || ''}
                </div>
              </div>
            </Fragment>
          );
        })}

        {/* แถวว่างให้ครบ 20 แถวเหมือนแบบฟอร์ม */}
        {Array.from({ length: emptyRows }).map((_, index) => (
          <div
            key={'blank-row-' + index}
            style={{ ...rowStyle, height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
          >
            <div style={baseCell}>&nbsp;</div>
            <div style={baseCell}>&nbsp;</div>
            <div style={baseCell}>&nbsp;</div>
            <div style={baseCell}>&nbsp;</div>
            <div style={baseCell}>&nbsp;</div>
            <div style={baseCell}>&nbsp;</div>
            <div style={{ ...baseCell, ...lastCell }}>&nbsp;</div>
          </div>
        ))}

        {/* แถวรวมค่าวัสดุ (A32:E32 merged) */}
        <div
          style={{
            ...rowStyle,
            minHeight: 32,
            borderBottom: showVat ? `1px solid ${INK}` : 'none',
          }}
        >
          <div style={{ ...totalCell, gridColumn: '1 / span 5' }}>รวมค่าวัสดุ</div>
          <div style={{ ...totalCell, gridColumn: '6' }}>{formatCurrency(totals.subtotal)}</div>
          <div style={{ ...totalCell, gridColumn: '7', ...lastCell }} />
        </div>

        {/* แสดง VAT ให้ชัดเจน เพื่อให้ยอดในเอกสารบวกกันได้จริง */}
        {showVat ? (
          <>
            <div style={{ ...rowStyle, minHeight: 32, borderBottom: `1px solid ${INK}` }}>
              <div style={{ ...totalCell, gridColumn: '1 / span 5' }}>ภาษีมูลค่าเพิ่ม 7%</div>
              <div style={{ ...totalCell, gridColumn: '6' }}>{formatCurrency(totals.vat)}</div>
              <div style={{ ...totalCell, gridColumn: '7', ...lastCell }} />
            </div>
            <div style={{ ...rowStyle, minHeight: 34, borderBottom: `3px double ${INK}` }}>
              <div style={{ ...totalCell, gridColumn: '1 / span 5', fontSize: 14 }}>รวมทั้งสิ้น</div>
              <div style={{ ...totalCell, gridColumn: '6', fontSize: 14 }}>
                {formatCurrency(totals.grandTotal)}
              </div>
              <div style={{ ...totalCell, gridColumn: '7', ...lastCell }} />
            </div>
          </>
        ) : (
          <div style={{ height: 0, borderBottom: `3px double ${INK}` }} />
        )}
      </div>
    </div>
  );
});

export { QuotationPreview };
