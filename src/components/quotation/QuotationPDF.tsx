import { useRef, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuotationForm } from '@/components/quotation/QuotationForm';
import { QuotationPreview } from '@/components/quotation/QuotationPreview';
import { useBasketStore } from '@/store/basket';
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

  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo>({
    requesterName: '',
    department: '',
  });

  const totals = computeTotals(items, includeVat);

  const updateCustomer = (patch: Partial<CustomerInfo>) =>
    setCustomer((previous) => ({ ...previous, ...patch }));

  const handleDownload = async () => {
    if (items.length === 0) {
      showToast('กรุณาเลือกสินค้าก่อนสร้างใบขออนุมัติสั่งซื้อ');
      return;
    }
    const element = previewRef.current;
    if (!element) return;

    setIsGenerating(true);
    try {
      /**
       * ต้องรอฟอนต์ Sarabun โหลดครบก่อนจับภาพ
       * ไม่อย่างนั้น html2canvas จะวาดด้วยฟอนต์สำรอง ทำให้ตัวอักษรไทยใน PDF เพี้ยน/ล้นช่อง
       */
      if (document.fonts) {
        await document.fonts.load('13px Sarabun');
        await document.fonts.ready;
      }
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;

      /**
       * ตัว typings ของ html2pdf.js ยังไม่มีตัวเลือก pagebreak (แม้ตัวไลบรารีรองรับ)
       * จึงประกาศชนิดเพิ่มจากชนิดของ Worker ที่ไลบรารีให้มา เพื่อไม่ต้องใช้ any
       */
      type PdfWorker = InstanceType<typeof html2pdf.Worker>;
      type PdfOptions = Parameters<PdfWorker['set']>[0] & {
        pagebreak?: {
          mode?: string[];
          avoid?: string[];
        };
      };

      const options: PdfOptions = {
        margin: 0,
        filename: buildFileName(),
        // JPEG คุณภาพสูงที่ 288 dpi: ตัวอักษรยังคมชัดเมื่อพิมพ์ แต่ไฟล์ไม่ใหญ่จนส่งอีเมลไม่ได้
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          // 3 เท่า = ประมาณ 288 dpi เมื่อพิมพ์ A4 (ความละเอียดที่เครื่องพิมพ์ออฟฟิศอ่านออกสบาย)
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // กันการตัดกลางบรรทัด/กลางตาราง: ถ้าเนื้อหายาวเกิน 1 หน้า ให้ขึ้นหน้าใหม่ทั้งบล็อก
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.quotation-table > div'],
        },
      };

      await html2pdf().set(options).from(element).save();
      showToast('ดาวน์โหลดใบขออนุมัติสั่งซื้อเรียบร้อย');
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            สร้างใบรายการขออนุมัติสั่งซื้อ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            กรอกชื่อผู้ขอและหน่วยงาน ตรวจสอบตัวอย่าง แล้วดาวน์โหลดเป็นไฟล์ PDF ขนาด A4
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

        <div className="overflow-x-auto rounded-lg bg-slate-200 p-4 dark:bg-slate-800">
          <QuotationPreview ref={previewRef} customer={customer} items={items} totals={totals} />
        </div>
      </div>
    </section>
  );
}
