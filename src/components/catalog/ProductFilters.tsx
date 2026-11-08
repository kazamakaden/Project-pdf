import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_11rem_11rem_11rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ค้นหาชื่อสินค้า ขนาด หรือยี่ห้อ..."
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          aria-label="ชนิด/หมวดหมู่สินค้า"
        >
          <option value="all">ทุกชนิด / หมวดหมู่</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          value={size}
          onChange={(event) => onSizeChange(event.target.value)}
          aria-label="ขนาดสินค้า"
        >
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
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        พบ {resultCount} รายการ จากทั้งหมด {totalCount} รายการ
      </p>
    </div>
  );
}