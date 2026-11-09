import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SortOption = 'seq-asc' | 'name-asc' | 'price-asc' | 'price-desc';

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  size: string;
  onSizeChange: (value: string) => void;
  sizes: string[];
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  resultCount: number;
  totalCount: number;
}

interface CategoryTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** ปุ่มเลือกหมวดหมู่แบบแท็บ (คลิกครั้งเดียวเห็นผล ไม่ต้องเปิด dropdown) */
function CategoryTab({ label, active, onClick }: CategoryTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-royal bg-royal text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:border-royal/50 hover:text-royal dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/60 dark:hover:text-blue-200',
      )}
    >
      {label}
    </button>
  );
}

export function ProductFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  size,
  onSizeChange,
  sizes,
  sort,
  onSortChange,
  resultCount,
  totalCount,
}: ProductFiltersProps) {
  return (
    <div className="rounded-lg border border-royal/15 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ค้นหาชื่อสินค้า ขนาด หรือยี่ห้อ..."
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:w-[24rem]">
          <Select value={size} onChange={(event) => onSizeChange(event.target.value)} aria-label="ขนาดสินค้า">
            <option value="all">ทุกขนาด</option>
            {sizes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            aria-label="เรียงลำดับ"
          >
            <option value="seq-asc">ตามลำดับรายการ</option>
            <option value="name-asc">ชื่อ ก-ฮ</option>
            <option value="price-asc">ราคา น้อย-มาก</option>
            <option value="price-desc">ราคา มาก-น้อย</option>
          </Select>
        </div>
      </div>

      <div
        role="group"
        aria-label="ชนิด/หมวดหมู่สินค้า"
        className="mt-3 flex gap-1.5 overflow-x-auto pb-1"
      >
        <CategoryTab
          label={'ทั้งหมด (' + totalCount + ')'}
          active={category === 'all'}
          onClick={() => onCategoryChange('all')}
        />
        {categories.map((item) => (
          <CategoryTab
            key={item}
            label={item}
            active={category === item}
            onClick={() => onCategoryChange(item)}
          />
        ))}
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        พบ {resultCount} รายการ จากทั้งหมด {totalCount} รายการ
      </p>
    </div>
  );
}
