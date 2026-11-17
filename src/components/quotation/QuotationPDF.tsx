import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuotationForm } from '@/components/quotation/QuotationForm';
import { QuotationPreview } from '@/components/quotation/QuotationPreview';
import { useBasketStore } from '@/store/basket';
import { DOC_FONTS, docFontOption, useDocFontStore } from '@/store/docFont';
import type { DocFontId } from '@/store/docFont';
import { useUiStore } from '@/store/ui';
import type { AppView } from '@/types/navigation';
import type { CustomerInfo } from '@/types/quotation';
import { computeTotals } from '@/utils/calc';
import { formatCurrency } from '@/utils/format';

interface QuotationPDFProps {
  onNavigate: (view: AppView) => void;
}

/** ชื่อไฟล์ PDF (อักษรละตินเพื่อให้เปิดได้ทุกอุปกรณ์) */
function buildFileName(): string {
  const now = new Date();
  const stamp =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  return 'purchase-request-' + stamp + '.pdf';
}

export function QuotationPDF({ onNavigate }: QuotationPDFProps) {
  const items = useBasketStore((state) => state.items);
  const includeVat = useBasketStore((state) => state.includeVat);
  const showToast = useUiStore((state) => state.showToast);
  const fontId = useDocFontStore((state) => state.font);
  const setFont = useDocFontStore((state) => state.setFont);
  const fontOption = docFontOption(fontId);


  const previewRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo>({
    requesterName: '',
    department: '',
  });

  const totals = computeTotals(items, false);

  /** จำนวนหน้าของฟอร์ม (20 รายการ/หน้า) — ใช้กับปุ่มเลื่อนหน้าในตัวอย่างเอกสาร */
  const pageCount = Math.max(1, Math.ceil(items.length / 20));
  const pageSafe = Math.min(currentPage, pageCount);

  /** พิมพ์เลขหน้าแล้วกด Enter เพื่อกระโดดไปหน้านั้น */
  const [pageInput, setPageInput] = useState('1');

  const goToPage = (target: number) => {
    const page = Math.min(Math.max(target, 1), pageCount);
    setCurrentPage(page);
    setPageInput(String(page));
  };


  /** พิมพ์/บันทึกเป็น PDF ด้วยเบราว์เซอร์ — ต้องเรนเดอร์ทุกหน้าก่อนสั่งพิมพ์ */
  const handlePrint = async () => {
    setIsPrinting(true);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    try {
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const updateCustomer = (patch: Partial<CustomerInfo>) =>
    setCustomer((previous) => ({ ...previous, ...patch }));

  /**
   * สร้างเอกสารด้วยเอนจินพิมพ์ของเบราว์เซอร์ (Ctrl+P / Save as PDF)
   * เลิกใช้ html2canvas เพราะวาดข้อความไทยต่ำกว่ากึ่งกลางช่องทุกช่อง ~9.5px
   * ต้องเรนเดอร์ทุกหน้าก่อนสั่งพิมพ์ ไม่งั้นจะพิมพ์ได้แค่หน้าที่กำลังดูอยู่
   */
  const handleDownload = async () => {
    if (items.length === 0) {
      showToast('กรุณาเลือกสินค้าก่อนสร้างใบขออนุมัติสั่งซื้อ');
      return;
    }
    setIsGenerating(true);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    // เก็บทุกหน้าไว้จนกว่าหน้าต่างพิมพ์จะปิด (afterprint) แล้วค่อยกลับไปดูทีละหน้า
    const finish = () => setIsGenerating(false);
    window.addEventListener('afterprint', finish, { once: true });
    window.setTimeout(finish, 60_000);
    window.print();
  };

  return (
    <section className="doc-print-shell mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="doc-print-head mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            สร้างใบรายการขออนุมัติสั่งซื้อ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            กรอกชื่อผู้ขอและหน่วยงาน ตรวจสอบตัวอย่าง แล้วดาวน์โหลดเป็นไฟล์ PDF ขนาด A4
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="whitespace-nowrap">แบบอักษรเอกสาร</span>
            <select
              id="doc-font"
              value={fontId}
              onChange={(event) => setFont(event.target.value as DocFontId)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 shadow-sm focus:border-royal focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {DOC_FONTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={() => onNavigate('catalog')}>
            เลือกสินค้าเพิ่ม
          </Button>
          <Button variant="accent" onClick={handleDownload} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {isGenerating ? 'กำลังเตรียม...' : 'พิมพ์ / บันทึก PDF'}
          </Button>
        </div>
      </div>

      <div className="doc-print-grid grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="doc-print-side">
          <QuotationForm customer={customer} onCustomerChange={updateCustomer} />
          <div className="mt-4 flex items-center justify-between rounded-lg border border-royal/15 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <FileText className="h-4 w-4 text-royal dark:text-blue-300" />
              {items.length} รายการ
            </span>
            <span className="font-semibold text-royal dark:text-blue-300">
              ฿{formatCurrency(totals.grandTotal)}
            </span>
          </div>
        </div>

        <div className="doc-print-col rounded-lg bg-slate-200 p-4 dark:bg-slate-800">
          {/* แถบเลือกหน้าเอกสาร — ดูทีละหน้าเหมือนโปรแกรมอ่าน PDF */}
          {pageCount > 1 && (
            <div className="mb-3 flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="หน้าก่อนหน้า"
                disabled={pageSafe <= 1}
                onClick={() => goToPage(pageSafe - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>หน้า</span>
              <input
                type="number"
                min={1}
                max={pageCount}
                value={pageInput}
                aria-label="เลขหน้า"
                onChange={(event) => setPageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Go') {
                    goToPage(Number(pageInput) || 1);
                  }
                }}
                onBlur={() => goToPage(Number(pageInput) || pageSafe)}
                className="h-9 w-16 rounded-md border border-slate-300 bg-white text-center text-sm text-slate-800 shadow-sm focus:border-royal focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <span>/ {pageCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="หน้าถัดไป"
                disabled={pageSafe >= pageCount}
                onClick={() => goToPage(pageSafe + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="doc-print-area overflow-x-auto">
            <QuotationPreview
              ref={previewRef}
              customer={customer}
              items={items}
              totals={totals}
              pageToShow={pageSafe - 1}
              showAllPages={isGenerating || isPrinting}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
