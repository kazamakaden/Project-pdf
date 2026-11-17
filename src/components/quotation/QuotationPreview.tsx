import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { docFontOption, useDocFontStore } from '@/store/docFont';
import type { BasketItem } from '@/types/basket';
import type { CustomerInfo, QuotationTotals } from '@/types/quotation';
import { formatCurrency } from '@/utils/format';
import { bahtText } from '@/utils/bahttext';

/**
 * ใบประมาณการค่าใช้จ่าย — ลอกแบบจากไฟล์ Expense_Estimation_Form.xlsx
 * (หัวข้อ "ความสอดคล้องกับนโยบาย" 5 ข้อ, ตาราง 7 คอลัมน์, แถวรวมค่าวัสดุ)
 *
 * เอกสารพิมพ์ขาว-ดำล้วน: ใช้เฉพาะสีดำ (#000) กับพื้นกระดาษสีขาว (#fff)
 * ไม่มีพื้นสี/ตัวอักษรสีอื่นเลย เพื่อให้พิมพ์เครื่องเลเซอร์ขาว-ดำแล้วอ่านชัดเหมือนต้นฉบับ
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
/**
 * ระยะขอบ 10 มม. (38 px @96dpi) ทุกด้าน — เครื่องพิมพ์เลเซอร์/อิงก์เจ็ตทั่วไป
 * พิมพ์ไม่ได้ถึงขอบกระดาษ ถ้าดันเนื้อหาชนขอบ เส้นตารางด้านขวา/ล่างจะหายตอนปริ้น
 */
const PAD = 38;
const PAD_X = PAD;

/** ความกว้างคอลัมน์ A-G (รวม = 718 px = ความกว้างเนื้อหา 794 - 2×38) */
const COL_WIDTHS = [55, 205, 62, 62, 100, 112, 122];
const COL_TEMPLATE = COL_WIDTHS.map((width) => `${width}px`).join(' ');

/** จำนวนแถวต่อหน้า (เท่าแบบฟอร์มกระดาษ 20 แถว) */
const ROWS_PER_PAGE = 20;
const MIN_ROWS = ROWS_PER_PAGE;
const ROW_HEIGHT = 28;

/** พื้นกระดาษ (ขาวล้วน) — เอกสารต้องมีแค่ดำ/ขาว */
const PAPER = '#FFFFFF';
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
  overflow: 'hidden',
  borderBottom: `1.5px solid ${INK}`,
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
    borderRight: `1.5px solid ${INK}`,
    // ภาษาไทยไม่มีช่องว่าง: ต้องให้ตัดคำได้ทุกจุด ไม่งั้นความกว้างขั้นต่ำของช่อง
    // จะดันตารางล้นออกนอกกรอบขวา ทำให้เส้นขอบขวาหายตอนพิมพ์
    overflowWrap: 'anywhere',
  };
}

function headerCell(scale: number): CSSProperties {
  return {
    ...baseCell(scale),
    justifyContent: 'center',
    textAlign: 'center',
    color: INK,
    backgroundColor: PAPER,
    fontWeight: 700,
    fontSize: 13 * scale,
    padding: '2px 4px',
  };
}

const lastCell: CSSProperties = { borderRight: 'none' };

function totalCell(scale: number): CSSProperties {
  return {
    ...baseCell(scale),
    backgroundColor: PAPER,
    fontWeight: 700,
    justifyContent: 'flex-end',
    fontSize: 13.5 * scale,
  };
}

/** หัวตาราง 7 คอลัมน์ 2 ชั้น */
function TableHeader({ scale }: { scale: number }) {
  const cell = headerCell(scale);

  return (
    <div style={{ ...rowStyle, minHeight: 82, borderBottom: `1.5px solid ${INK}` }}>
      <div style={{ ...cell, gridColumn: '1' }}>ลำดับที่</div>
      <div style={{ ...cell, gridColumn: '2' }}>รายการ</div>
      <div style={{ ...cell, gridColumn: '3' }}>จำนวน</div>
      <div style={{ ...cell, gridColumn: '4' }}>หน่วย</div>
      <div
        style={{
          gridColumn: '5 / span 2',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: PAPER,
          color: INK,
          borderRight: `1.5px solid ${INK}`,
          borderBottom: `1.5px solid ${INK}`,
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
            minHeight: Math.ceil(15 * scale) * 2 + 18 + (scale > 1 ? 8 : 0),
            boxSizing: 'border-box',
            textAlign: 'center',
            fontSize: 12.5 * scale,
            lineHeight: `${Math.ceil(15 * scale)}px`,
            fontWeight: 700,
            padding: '8px 4px 4px',
          }}
        >
          ราคาที่สืบทราบ/
          <br />
          ประมาณการครั้งสุดท้าย
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            width: '100%',
            height: 34,
            flex: '0 0 auto',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              display: 'block',
              textAlign: 'center',
              lineHeight: '32px',
              fontSize: 13 * scale,
              fontWeight: 700,
              color: INK,
              backgroundColor: PAPER,
              height: 34,
              boxSizing: 'border-box',
              borderRight: `1.5px solid ${INK}`,
              borderTop: `1.5px solid ${INK}`,
              borderBottom: 'none',
              overflowWrap: 'anywhere',
              minWidth: 0,
            }}
          >
            ราคา/หน่วย
          </div>
          <div
            style={{
              display: 'block',
              textAlign: 'center',
              lineHeight: '32px',
              fontSize: 13 * scale,
              fontWeight: 700,
              color: INK,
              backgroundColor: PAPER,
              height: 34,
              boxSizing: 'border-box',
              borderRight: 'none',
              borderTop: `1.5px solid ${INK}`,
              borderBottom: 'none',
              overflowWrap: 'anywhere',
              minWidth: 0,
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
}: PageProps) {
  const cell = baseCell(scale);
  const total = totalCell(scale);
  const blankRows = showTotal ? Math.max(0, MIN_ROWS - items.length) : 0;

  return (
    <div
      className="doc-page"
      style={{
        width: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
        boxSizing: 'border-box',
        backgroundColor: PAPER,
        color: INK,
        fontFamily,
        padding: `${PAD}px ${PAD_X}px ${PAD}px`,
        // ระยะชดเชย ascent ของฟอนต์ไทย — ใช้เฉพาะตอนจับภาพเป็น PDF (ดู index.css)
        ['--doc-shift' as string]: `${-12 * scale}px`,
        ...(isFirst
          ? null
          : { pageBreakBefore: 'always' as const, breakBefore: 'page' as const }),
      }}
    >
      {/* แถบหัวเรื่อง (A1:G1) — ขาว-ดำ: กรอบดำ ตัวอักษรดำ */}
      <div
        style={{
          height: 44,
          backgroundColor: PAPER,
          color: INK,
          border: `1.5px solid ${INK}`,
          /**
           * ใช้ line-height เท่าความสูง + textAlign แทน flex centering
           * เพราะ html2canvas จัดกึ่งกลางแนวตั้งด้วย flex ไม่แม่น (ข้อความจมลงล่างกรอบ)
           */
          fontWeight: 700,
          fontSize: 20 * scale,
          lineHeight: '41px',
          textAlign: 'center',
          boxSizing: 'border-box',
          padding: '0 12px',
        }}
      >
        <span className="doc-title-text">ประมาณการค่าใช้จ่าย (ค่าใช้สอย/ค่าตอบแทน/ค่าวัสดุ)</span>
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
              gridTemplateColumns: '400px 1fr',
              minHeight: 25,
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
          marginTop: 10,
          border: `1.5px solid ${INK}`,
          borderBottom: 'none',
          backgroundColor: PAPER,
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

        {/* แถวรวมค่าวัสดุ + จำนวนเงินเป็นตัวอักษร — แสดงเฉพาะหน้าสุดท้าย */}
        {showTotal ? (
          <>
            <div
              style={{
                ...rowStyle,
                minHeight: 32,
                borderBottom: `1.5px solid ${INK}`,
              }}
            >
              <div style={{ ...total, gridColumn: '1 / span 5' }}>รวมค่าวัสดุ</div>
              <div style={{ ...total, gridColumn: '6' }}>{formatCurrency(totals.subtotal)}</div>
              <div style={{ ...total, gridColumn: '7', ...lastCell }} />
            </div>

            <div style={{ ...rowStyle, minHeight: 32, borderBottom: `1.5px solid ${INK}` }}>
              <div style={{ ...total, gridColumn: '1 / span 5', fontSize: 14 * scale }}>
                รวมทั้งสิ้น
              </div>
              <div style={{ ...total, gridColumn: '6', fontSize: 14 * scale }}>
                {formatCurrency(totals.grandTotal)}
              </div>
              <div style={{ ...total, gridColumn: '7', ...lastCell }} />
            </div>

            {/* จำนวนเงินเป็นตัวอักษร เช่น "ห้าพันบาทถ้วน" — เส้นปิดท้ายตาราง (double) อยู่ที่แถวนี้ */}
            <div
              style={{ ...rowStyle, height: 36, minHeight: 36, borderBottom: `3px double ${INK}` }}
            >
              {/* ช่องเดียวทั้งแถว: ป้ายกับจำนวนเงินเป็นตัวอักษรอยู่ด้วยกัน ไม่มีเส้นคั่นกลาง */}
              <div
                style={{
                  ...total,
                  gridColumn: '1 / span 7',
                  justifyContent: 'flex-start',
                  gap: 8,
                  lineHeight: '34px',
                  overflow: 'visible',
                  ...lastCell,
                }}
              >
                {/* ชดเชยระยะ ascent ของฟอนต์ไทยที่ html2canvas วาดต่ำกว่าปกติ */}
                <span className="doc-baht-text">
                  รวมทั้งสิ้น (ตัวอักษร) {bahtText(totals.grandTotal)}
                </span>
              </div>
            </div>
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
  /** ลำดับหน้าที่แสดงบนจอ (0 = หน้าแรก) — ไม่ระบุ = แสดงทุกหน้า */
  pageToShow?: number;
  /** true = แสดงทุกหน้าใน DOM ใช้ตอนจับภาพเป็น PDF เท่านั้น */
  showAllPages?: boolean;
}

const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(function QuotationPreview(
  { customer, items, totals, pageToShow, showAllPages },
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

  /** หน้าจอ: ทีละหน้า (เหมือนโปรแกรมอ่าน PDF) · ตอนจับภาพ: ทุกหน้า */
  const visibleIndexes =
    showAllPages || pageToShow === undefined
      ? pages.map((_, index) => index)
      : [Math.min(Math.max(pageToShow, 0), lastPage)];

  return (
    <div ref={ref} style={{ width: PAGE_WIDTH, backgroundColor: '#FFFFFF', margin: '0 auto' }}>
      {visibleIndexes.map((pageIndex) => (
        <QuotationPage
          key={pageIndex}
          customer={customer}
          items={pages[pageIndex]}
          startIndex={pageIndex * ROWS_PER_PAGE}
          totals={totals}
          showTotal={pageIndex === lastPage}
          isFirst={pageIndex === 0}
          scale={scale}
          fontFamily={fontFamily}
        />
      ))}
    </div>
  );
});

export { QuotationPreview };
