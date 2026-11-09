import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBasketStore } from '@/store/basket';
import type { AppView } from '@/types/navigation';
import { computeTotals } from '@/utils/calc';
import { formatCurrency } from '@/utils/format';

interface BasketDrawerProps {
  onNavigate: (view: AppView) => void;
}

export function BasketDrawer({ onNavigate }: BasketDrawerProps) {
  const items = useBasketStore((state) => state.items);
  const isOpen = useBasketStore((state) => state.isDrawerOpen);
  const setDrawerOpen = useBasketStore((state) => state.setDrawerOpen);
  const increment = useBasketStore((state) => state.increment);
  const decrement = useBasketStore((state) => state.decrement);
  const removeItem = useBasketStore((state) => state.removeItem);
  const includeVat = useBasketStore((state) => state.includeVat);

  const totals = computeTotals(items, includeVat);

  const goTo = (view: AppView) => {
    setDrawerOpen(false);
    onNavigate(view);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-royal dark:text-blue-300" /> ตะกร้าสินค้า
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? 'ยังไม่มีสินค้าในตะกร้า'
              : 'ทั้งหมด ' + items.length + ' รายการ'}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-500 dark:text-slate-400">
              <ShoppingBag className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm">เลือกสินค้าจากแคตตาล็อกเพื่อเริ่มต้น</p>
              <Button size="sm" onClick={() => goTo('catalog')}>
                ไปที่แคตตาล็อก
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {[item.product.size, item.product.model].filter(Boolean).join(' · ') ||
                      item.product.category}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-royal dark:text-blue-300">
                    ฿{formatCurrency(item.product.price * item.quantity)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => decrement(item.product.id)}
                      aria-label="ลดจำนวน"
                      className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => increment(item.product.id)}
                      aria-label="เพิ่มจำนวน"
                      className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product.id)}
                    aria-label="ลบสินค้า"
                    className="flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>ยอดรวม</span>
                <span>฿{formatCurrency(totals.subtotal)}</span>
              </div>
              {includeVat && (
                <div className="flex justify-between">
                  <span>VAT 7%</span>
                  <span>฿{formatCurrency(totals.vat)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-royal dark:text-blue-300">
                <span>รวมทั้งสิ้น</span>
                <span>฿{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => goTo('basket')}>
                ดูตะกร้า
              </Button>
              <Button variant="accent" size="sm" onClick={() => goTo('quotation')}>
                สร้างใบขออนุมัติ
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}