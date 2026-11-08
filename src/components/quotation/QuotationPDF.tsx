import { useRef, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuotationForm } from '@/components/quotation/QuotationForm';
import { QuotationPreview } from '@/components/quotation/QuotationPreview';
import { useBasketStore } from '@/store/basket';
import { useUiStore } from '@/store/ui';
import type { AppView } from '@/types/navigation';
import type { CustomerInfo, QuotationMeta } from '@/types/quotation';
import { computeTotals } from '@/utils/calc';
import { formatCurrency, toIsoDate } from '@/utils/format';

interface QuotationPDFProps {
  onNavigate: (view: AppView) => void;
}

function buildDefaultQuotationNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return 'QT-' + y + m + d + '-001';
}

function buildDefaultMeta(): QuotationMeta {
  const today = new Date();
  const validUntil = new Date();
  validUntil.setDate(today.getDate() + 30);
  return {
    quotationNo: buildDefaultQuotationNo(),
    issueDate: toIsoDate(today),
    validUntil: toIsoDate(validUntil),
    reference: '',
    note: 'ราคาข้างต้นยังไม่รวมค่าขนส่ง (ถ้ามี)',
  };
}

export function QuotationPDF({ onNavigate }: QuotationPDFProps) {
  const items = useBasketStore((state) => state.items);
  const includeVat = useBasketStore((state) => state.includeVat);
  const setIncludeVat = useBasketStore((state) => state.setIncludeVat);
  const showToast = useUiStore((state) => state.showToast);

  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo>({
    contactName: '',
    organization: '',
    address: '',
    taxId: '',
  });
  const [meta, setMeta] = useState<QuotationMeta>(buildDefaultMeta);

  const totals = computeTotals(items, includeVat);

  const updateCustomer = (patch: Partial<CustomerInfo>) =>
    setCustomer((previous) => ({ ...previous, ...patch }));
  const updateMeta = (patch: Partial<QuotationMeta>) =>
    setMeta((previous) => ({ ...previous, ...patch }));

  const handleDownload = async () => {
    if (items.length === 0) {
      showToast('กรุณาเลือกสินค้าก่อนสร้างใบเสนอราคา');
      return;
    }
    const element = previewRef.current;
    if (!element) return;

    setIsGenerating(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;
      await html2pdf()
        .set({
          margin: 0,
          filename: (meta.quotationNo || 'quotation') + '.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
      showToast('ดาวน์โหลดใบเสนอราคาเรียบร้อย');
    } catch (error) {
      console.error(error);
      showToast('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">สร้างใบเสนอราคา</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            กรอกข้อมูลลูกค้า ตรวจสอบตัวอย่าง แล้วดาวน์โหลดเป็นไฟล์ PDF ขนาด A4
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('catalog')}>
            เลือกสินค้าเพิ่ม
          </Button>
          <Button variant="accent" onClick={handleDownload} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isGenerating ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div>
          <QuotationForm
            customer={customer}
            onCustomerChange={updateCustomer}
            meta={meta}
            onMetaChange={updateMeta}
            includeVat={includeVat}
            onIncludeVatChange={setIncludeVat}
          />
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

        <div className="overflow-x-auto rounded-lg bg-slate-200 p-4 dark:bg-slate-800">
          <QuotationPreview ref={previewRef} customer={customer} meta={meta} items={items} totals={totals} />
        </div>
      </div>
    </section>
  );
}