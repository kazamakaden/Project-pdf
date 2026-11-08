import { useMemo, useState } from 'react';
import {
  ImageIcon,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { LoginPage } from '@/components/admin/LoginPage';
import { ProductForm } from '@/components/admin/ProductForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ADMIN_EMAIL, SITE } from '@/config/site';
import { useAuthStore, useIsAdmin } from '@/store/auth';
import {
  SEED_PRODUCT_COUNT,
  useCatalogFacets,
  useCatalogProducts,
  useProductStore,
  type ProductDraft,
} from '@/store/products';
import { useUiStore } from '@/store/ui';
import type { AppView } from '@/types/navigation';
import type { Product } from '@/types/product';
import { formatCurrency } from '@/utils/format';

interface AdminPanelProps {
  onNavigate: (view: AppView) => void;
}

export function AdminPanel({ onNavigate }: AdminPanelProps) {
  const isAdmin = useIsAdmin();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const showToast = useUiStore((state) => state.showToast);

  const catalog = useCatalogProducts();
  const facets = useCatalogFacets();
  const source = useProductStore((state) => state.source);
  const catalogError = useProductStore((state) => state.error);
  const saving = useProductStore((state) => state.saving);
  const createProduct = useProductStore((state) => state.createProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const importSeedCatalog = useProductStore((state) => state.importSeedCatalog);
  const reloadCatalog = useProductStore((state) => state.load);

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return catalog;
    return catalog.filter((product) =>
      (product.name + ' ' + product.category + ' ' + product.size + ' ' + product.brand)
        .toLowerCase()
        .includes(keyword),
    );
  }, [catalog, query]);

  const closeForm = () => {
    setEditing(null);
    setFormOpen(false);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleSubmit = async (draft: ProductDraft) => {
    try {
      if (editing) {
        await updateProduct(editing.id, {
          name: draft.name,
          category: draft.category,
          size: draft.size,
          model: draft.model,
          brand: draft.brand,
          unit: draft.unit,
          price: draft.price,
          note: draft.note,
          imageUrl: draft.imageUrl ? draft.imageUrl : undefined,
        });
        showToast('บันทึกการแก้ไข "' + draft.name + '" แล้ว');
      } else {
        await createProduct(draft);
        showToast('เพิ่มสินค้าใหม่แล้ว');
      }
      closeForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'บันทึกข้อมูลไม่สำเร็จ');
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm('ต้องการลบ "' + product.name + '" ออกจากแคตตาล็อกหรือไม่?');
    if (!confirmed) return;
    try {
      await deleteProduct(product.id);
      showToast('ลบสินค้าแล้ว');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'ลบสินค้าไม่สำเร็จ');
    }
  };

  const handleImportSeed = async () => {
    const confirmed = window.confirm(
      'เขียนทับสินค้าทั้งหมดด้วยข้อมูลตั้งต้น ' +
        SEED_PRODUCT_COUNT +
        ' รายการ? สิ่งที่เพิ่ม/แก้ไข/ลบไว้จะหายไป',
    );
    if (!confirmed) return;
    try {
      const imported = await importSeedCatalog();
      closeForm();
      showToast('นำเข้าข้อมูลตั้งต้น ' + imported + ' รายการแล้ว');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'นำเข้าข้อมูลไม่สำเร็จ');
    }
  };

  if (!isAdmin) {
    return <LoginPage onBack={() => onNavigate('catalog')} />;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-royal/15 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
            <ShieldCheck className="h-5 w-5 text-royal dark:text-blue-300" />
            จัดการสินค้า
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {SITE.nameTh} · เข้าสู่ระบบด้วย {user?.email ?? ADMIN_EMAIL}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onNavigate('catalog')}>
            กลับแคตตาล็อก
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              signOut();
              onNavigate('catalog');
            }}
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </div>

      {source === 'seed' && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {catalogError
              ? 'เชื่อมต่อฐานข้อมูลไม่ได้: ' + catalogError
              : 'ฐานข้อมูลยังว่าง — ข้อมูลที่เห็นคือข้อมูลตั้งต้นที่ฝังมากับเว็บ'}
            {' '}กดปุ่มด้านขวาเพื่อเขียนข้อมูลตั้งต้น {SEED_PRODUCT_COUNT} รายการลงฐานข้อมูล
          </p>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleImportSeed()}>
              นำเข้าข้อมูลตั้งต้น
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void reloadCatalog(true)}
            >
              ลองเชื่อมต่อใหม่
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">สินค้าทั้งหมด</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{catalog.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">หมวดหมู่</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {facets.categories.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">มีรูปสินค้า</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {catalog.filter((product) => product.imageUrl).length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">ราคาสอบถาม</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {catalog.filter((product) => product.price <= 0).length}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาสินค้าที่ต้องการแก้ไข..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            เพิ่มสินค้าใหม่
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={saving}
            onClick={() => void handleImportSeed()}
          >
            <RotateCcw className="h-4 w-4" />
            คืนค่าตั้งต้น
          </Button>
        </div>
      </div>

      {formOpen && (
        <div className="mb-6 rounded-lg border border-royal/25 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            {editing ? 'แก้ไขสินค้า: ' + editing.name : 'เพิ่มสินค้าใหม่'}
          </h2>
          <ProductForm
            key={editing?.id ?? 'new'}
            initial={editing}
            categories={facets.categories}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="w-14 px-3 py-2">รูป</th>
                <th className="px-3 py-2">ชื่อสินค้า</th>
                <th className="w-40 px-3 py-2">ชนิด / ขนาด</th>
                <th className="w-28 px-3 py-2 text-right">ราคา</th>
                <th className="w-24 px-3 py-2 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                    ไม่พบสินค้าที่ตรงกับคำค้นหา
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const isCustom = !/^p\d+$/.test(product.id);
                  const isEdited = Boolean(product.updatedAt);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-3 py-2">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {product.name}
                          </span>
                          {isCustom && <Badge variant="accent">ใหม่</Badge>}
                          {isEdited && <Badge variant="outline">แก้ไข</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          #{String(product.seq).padStart(3, '0')}
                          {product.brand ? ' · ' + product.brand : ''}
                          {product.model ? ' · ' + product.model : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                        <p>{product.category || '-'}</p>
                        <p className="text-slate-400">{product.size || '-'}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {product.price > 0 ? (
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            ฿{formatCurrency(product.price)}
                          </span>
                        ) : (
                          <span className="text-xs text-accent-hover">สอบถาม</span>
                        )}
                        <p className="text-xs text-slate-400">/ {product.unit}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={'แก้ไข ' + product.name}
                            onClick={() => openEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={'ลบ ' + product.name}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span>
            แสดง {filtered.length} จาก {catalog.length} รายการ
            {source === 'api' ? ' · ข้อมูลจากฐานข้อมูลกลาง' : ' · ข้อมูลสำรอง (ยังไม่เชื่อมต่อ)'}
          </span>
          <span>ข้อมูลบันทึกในฐานข้อมูล MongoDB — ใช้ร่วมกันทุกอุปกรณ์</span>
        </div>
      </div>
    </section>
  );
}
