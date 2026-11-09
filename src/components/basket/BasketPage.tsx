import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBasketStore } from '@/store/basket';
import type { AppView } from '@/types/navigation';
import { computeTotals } from '@/utils/calc';
import { formatCurrency } from '@/utils/format';

interface BasketPageProps {
  onNavigate: (view: AppView) => void;
}

export function BasketPage({ onNavigate }: BasketPageProps) {
  const items = useBasketStore((state) => state.items);
  const increment = useBasketStore((state) => state.increment);
  const decrement = useBasketStore((state) => state.decrement);
  const removeItem = useBasketStore((state) => state.removeItem);
  const clearBasket = useBasketStore((state) => state.clearBasket);
  const includeVat = useBasketStore((state) => state.includeVat);
  const setIncludeVat = useBasketStore((state) => state.setIncludeVat);

  const totals = computeTotals(items, includeVat);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">ตะกร้าสินค้า</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ตรวจสอบรายการและจำนวนก่อนสร้างใบขออนุมัติสั่งซื้อ
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearBasket} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
            <Trash2 className="h-4 w-4" /> ล้างตะกร้า
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-slate-300 py-20 text-center dark:border-slate-700">
          <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">ยังไม่มีสินค้าในตะกร้า</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              เริ่มเลือกสินค้าจากแคตตาล็อกได้เลย
            </p>
          </div>
          <Button onClick={() => onNavigate('catalog')}>ไปที่แคตตาล็อก</Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="overflow-hidden rounded-lg border border-royal/15 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead>รายการ</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                  <TableHead className="text-right">ราคา/หน่วย</TableHead>
                  <TableHead className="text-right">รวม</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.product.id}>
                    <TableCell>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.product.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {[item.product.size, item.product.model].filter(Boolean).join(' · ') || item.product.category}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="mx-auto flex w-fit items-center rounded-md border border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => decrement(item.product.id)} aria-label="ลดจำนวน" className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-9 text-center text-sm font-medium">{item.quantity}</span>
                        <button type="button" onClick={() => increment(item.product.id)} aria-label="เพิ่มจำนวน" className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-slate-600 dark:text-slate-300">
                      ฿{formatCurrency(item.product.price)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      ฿{formatCurrency(item.product.price * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <button type="button" onClick={() => removeItem(item.product.id)} aria-label="ลบสินค้า" className="flex h-8 w-8 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <aside className="h-fit space-y-4 rounded-lg border border-royal/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">สรุปยอด</h2>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>ยอดรวมสินค้า</span>
                <span>฿{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Switch checked={includeVat} onCheckedChange={setIncludeVat} aria-label="เปิด/ปิด VAT" />
                  VAT 7%
                </span>
                <span>฿{formatCurrency(totals.vat)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-royal dark:border-slate-700 dark:text-blue-300">
                <span>รวมทั้งสิ้น</span>
                <span>฿{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>
            <Button variant="accent" className="w-full" onClick={() => onNavigate('quotation')}>
              สร้างใบรายการขออนุมัติสั่งซื้อ <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onNavigate('catalog')}>
              เลือกสินค้าเพิ่ม
            </Button>
          </aside>
        </div>
      )}
    </section>
  );
}