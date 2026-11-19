import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBasketStore } from '@/store/basket';
import { useUiStore } from '@/store/ui';
import type { Product } from '@/types/product';
import { formatCurrency } from '@/utils/format';

interface ProductCardProps {
  product: Product;
}

/**
 * การ์ดสินค้าแบบข้อความล้วน — ไม่มีรูปภาพ ตามคำสั่ง Kamin (ลูกค้าไม่ต้องการรูป)
 * และใส่จำนวนได้เองก่อนกด "เพิ่ม" เพื่อลดการกดซ้ำทีละชิ้น
 */
export function ProductCard({ product }: ProductCardProps) {
  const addItem = useBasketStore((state) => state.addItem);
  const showToast = useUiStore((state) => state.showToast);
  const [qty, setQty] = useState(1);

  const onRequest = product.price <= 0;
  const meta = [product.size, product.model].filter(Boolean).join(' · ');
  const quantity = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;

  const handleAdd = () => {
    addItem(product, quantity);
    showToast('เพิ่ม "' + product.name + '" จำนวน ' + quantity + ' ' + product.unit + ' ลงตะกร้าแล้ว');
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

      <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {product.name}
      </h3>
      {meta && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{meta}</p>}

      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {product.brand && <span>ยี่ห้อ: {product.brand}</span>}
        <span>หน่วย: {product.unit}</span>
      </div>

      {product.note && <p className="mt-1 text-xs italic text-accent-hover">{product.note}</p>}

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
              aria-label={'จำนวน ' + product.name}
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
