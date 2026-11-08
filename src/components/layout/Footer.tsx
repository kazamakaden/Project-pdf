import { FileText, Mail, MapPin, Phone, Printer } from 'lucide-react';
import { SITE } from '@/config/site';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="โลโก้วิทยาลัยเทคนิคอุดรธานี"
              className="h-12 w-auto object-contain"
            />
            <span className="text-lg font-semibold text-slate-900 dark:text-white">{SITE.nameTh}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {SITE.description}
          </p>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">ติดต่อเรา</h3>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-royal dark:text-blue-300" />
              <span>{SITE.address}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-royal dark:text-blue-300" />
              <span>โทร. {SITE.phone}</span>
            </li>
            <li className="flex gap-2">
              <Printer className="mt-0.5 h-4 w-4 shrink-0 text-royal dark:text-blue-300" />
              <span>โทรสาร {SITE.fax}</span>
            </li>
            <li className="flex gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-royal dark:text-blue-300" />
              <span>เลขประจำตัวผู้เสียภาษี {SITE.taxId}</span>
            </li>
          </ul>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">ผู้มีอำนาจลงนาม</h3>
          <p>{SITE.signatoryName}</p>
          <p className="text-slate-500 dark:text-slate-400">{SITE.signatoryTitle}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent-subtle px-3 py-1.5 text-xs font-medium text-accent-hover">
            <Mail className="h-3.5 w-3.5" /> ใบเสนอราคาพร้อมดาวน์โหลด PDF
          </p>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {year} {SITE.nameTh} — สงวนลิขสิทธิ์
      </div>
    </footer>
  );
}