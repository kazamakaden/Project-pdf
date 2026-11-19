import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBasketStore } from '@/store/basket';
import { useUiStore } from '@/store/ui';
import type { Product } from '@/types/product';
import { formatCurrency } from '@/utils/format';
import { baseNameOf, prettyThaiText } from '@/utils/text';

interface ProductCardProps {
  /** สินค้าตระกูลเดียวกัน (ต่างขนาด/รุ่น) — ตัวแรกคือค่าเริ่มต้น */
  variants: Product[];
}

/**
 * การ์ดสินค้าแบบข้อความล้วน — ไม่มีรูปภาพ
 * ถ้าสินค้าตระกูลเดียวกันมีหลายขนาด (เช่น กรรไกร 6/7/8 นิ้ว) จะรวมเป็นการ์ดเดียว
 * และให้เลือกขนาดจากรายการ เพื่อไม่ให้ขนาดไปปนอยู่ในชื่อ
 */
export function ProductCard({ variants }: ProductCardProps) {
  const addItem = useBasketStore((state) => state.addItem);
  const showToast = useUiStore((state) => state.showToast);
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? '');
  const [qty, setQty] = useState(1);

  const product = variants.find((v) => v.id === selectedId) ?? variants[0];
  if (!product) return null;

  const hasChoices = variants.length > 1;
  const onRequest = product.price <= 0;
  const baseName = baseNameOf(product.name, product.size);
  const quantity = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;

  const optionLabel = (v: Product) => {
    const bits = [v.size, v.model, v.brand].map((x) => prettyThaiText(x)).filter(Boolean);
    if (bits.length) return bits.join(' · ');
    // ไม่มีข้อมูลขนาด/รุ่นแยก: ตัดชื่อหลักออกจากชื่อเต็ม แล้วใช้ส่วนที่เหลือเป็นตัวเลือก
    const tail = prettyThaiText(v.name)
      .replace(baseName, '')
      .replace(/^[\s/]+/u, '')
      .trim();
    return tail || prettyThaiText(v.name);
  };

  const handleAdd = () => {
    addItem(product, quantity);
    showToast('เพิ่ม "' + prettyThaiText(product.name) + '" จำนวน ' + quantity + ' ' + product.unit + ' ลงตะกร้าแล้ว');
    setQty(1);
  };

  return (
    <article className="flex h-full flex-col rounded-lg border border-royal/15 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Badge variant="muted" className="shrink-0">
          {product.category}
        </Badge>
        <span className="text-xs text-slate-400">#{String(product.seq).padStart(3, '0')}</span>
      </div>

      <h3 className="text-base font-semibold leading-relaxed break-words text-slate-900 dark:text-slate-100">
        {baseName}
      </h3>

      <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {hasChoices ? (
          <label className="block">
            <span className="mb-1 block text-slate-400">เลือกขนาด / รุ่น ({variants.length} แบบ)</span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-royal focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {optionLabel(v)}
                  {v.price > 0 ? ` — ฿${formatCurrency(v.price)}` : ' — สอบถามราคา'}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="space-y-1">
            {product.size && (
              <div className="flex gap-1">
                <span className="shrink-0 text-slate-400">ขนาด</span>
                <span className="break-words">{prettyThaiText(product.size)}</span>
              </div>
            )}
            {product.model && (
              <div className="flex gap-1">
                <span className="shrink-0 text-slate-400">รุ่น</span>
                <span className="break-words">{prettyThaiText(product.model)}</span>
              </div>
            )}
            {product.brand && (
              <div className="flex gap-1">
                <span className="shrink-0 text-slate-400">ยี่ห้อ</span>
                <span className="break-words">{prettyThaiText(product.brand)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-1">
          <span className="shrink-0 text-slate-400">หน่วย</span>
          <span>{prettyThaiText(product.unit)}</span>
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div>
          {onRequest ? (
            <span className="text-sm font-semibold text-accent-hover">สอบถามราคา</span>
          ) : (
            <span className="text-lg font-bold text-royal dark:text-blue-300">
              ฿{formatCurrency(product.price)}
            </span>
          )}
          {!onRequest && <span className="ml-1 text-xs text-slate-400">/ {product.unit}</span>}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            จำนวน
            <input
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(event) => setQty(Number(event.target.value))}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={'จำนวน ' + prettyThaiText(product.name)}
              className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 focus:border-royal focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant={onRequest ? 'outline' : 'default'}
            onClick={handleAdd}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            เพิ่ม
          </Button>
        </div>
      </div>
    </article>
  );
}
