import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { compressImageFile } from '@/lib/image';
import type { ProductDraft } from '@/store/products';
import { useUiStore } from '@/store/ui';
import type { Product } from '@/types/product';

interface ProductFormProps {
  initial?: Product | null;
  categories: string[];
  onSubmit: (draft: ProductDraft) => void;
  onCancel: () => void;
}

const EMPTY_DRAFT: ProductDraft = {
  name: '',
  category: '',
  size: '',
  model: '',
  brand: '',
  unit: 'ชิ้น',
  price: 0,
  note: '',
  imageUrl: '',
};

function toDraft(product?: Product | null): ProductDraft {
  if (!product) return { ...EMPTY_DRAFT };
  return {
    name: product.name,
    category: product.category,
    size: product.size,
    model: product.model,
    brand: product.brand,
    unit: product.unit,
    price: product.price,
    note: product.note,
    imageUrl: product.imageUrl ?? '',
  };
}

export function ProductForm({ initial, categories, onSubmit, onCancel }: ProductFormProps) {
  const showToast = useUiStore((state) => state.showToast);
  const [draft, setDraft] = useState<ProductDraft>(() => toDraft(initial));
  const [priceText, setPriceText] = useState<string>(String(initial?.price ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(toDraft(initial));
    setPriceText(String(initial?.price ?? 0));
    setError(null);
  }, [initial]);

  const setField = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      setField('imageUrl', dataUrl);
      showToast('อัปโหลดรูปสินค้าแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError('กรุณากรอกชื่อสินค้า');
      return;
    }
    const price = Number(priceText);
    if (!Number.isFinite(price) || price < 0) {
      setError('ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป (ใส่ 0 = สอบถามราคา)');
      return;
    }
    setError(null);
    onSubmit({ ...draft, name, price });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="product-name">ชื่อสินค้า *</Label>
          <Input
            id="product-name"
            value={draft.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="เช่น กระดาษ A4 80 แกรม"
            required
          />
        </div>

        <div>
          <Label htmlFor="product-category">ชนิด / หมวดหมู่</Label>
          <Input
            id="product-category"
            list="product-categories"
            value={draft.category}
            onChange={(event) => setField('category', event.target.value)}
            placeholder="เช่น เครื่องเขียน"
          />
          <datalist id="product-categories">
            {categories.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="product-size">ขนาด</Label>
          <Input
            id="product-size"
            value={draft.size}
            onChange={(event) => setField('size', event.target.value)}
            placeholder="เช่น A4, 12 นิ้ว, 40*60"
          />
        </div>

        <div>
          <Label htmlFor="product-model">รุ่น / แบบ</Label>
          <Input
            id="product-model"
            value={draft.model}
            onChange={(event) => setField('model', event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="product-brand">ยี่ห้อ</Label>
          <Input
            id="product-brand"
            value={draft.brand}
            onChange={(event) => setField('brand', event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="product-unit">หน่วยนับ</Label>
          <Input
            id="product-unit"
            value={draft.unit}
            onChange={(event) => setField('unit', event.target.value)}
            placeholder="ชิ้น / แพ็ค / กล่อง"
          />
        </div>

        <div>
          <Label htmlFor="product-price">ราคาต่อหน่วย (บาท)</Label>
          <Input
            id="product-price"
            type="number"
            min={0}
            step="0.01"
            value={priceText}
            onChange={(event) => setPriceText(event.target.value)}
            placeholder="0 = สอบถามราคา"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="product-note">หมายเหตุ</Label>
          <Input
            id="product-note"
            value={draft.note}
            onChange={(event) => setField('note', event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>รูปสินค้า</Label>
          <div className="mt-1 flex flex-wrap items-start gap-3">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              {draft.imageUrl ? (
                <img src={draft.imageUrl} alt="ตัวอย่างรูปสินค้า" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'กำลังประมวลผล...' : 'เลือกรูป'}
                </Button>
                {draft.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => setField('imageUrl', '')}
                  >
                    <Trash2 className="h-4 w-4" />
                    ลบรูป
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                รองรับไฟล์ JPG/PNG ระบบจะย่อขนาดและบีบอัดให้อัตโนมัติ
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={uploading}>
          {initial ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
