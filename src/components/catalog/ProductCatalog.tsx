import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, PackageSearch } from 'lucide-react';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductFilters, type SortOption } from '@/components/catalog/ProductFilters';
import { useCatalogFacets, useCatalogProducts, useProductStore } from '@/store/products';

export function ProductCatalog() {
  const catalog = useCatalogProducts();
  const { categories, sizes } = useCatalogFacets();
  const status = useProductStore((state) => state.status);
  const source = useProductStore((state) => state.source);
  const catalogError = useProductStore((state) => state.error);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [size, setSize] = useState('all');
  const [sort, setSort] = useState<SortOption>('seq-asc');

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = catalog.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (size !== 'all' && product.size !== size) return false;
      if (!query) return true;
      const haystack = (product.name + ' ' + product.size + ' ' + product.model + ' ' + product.brand).toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'th');
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        default:
          return a.seq - b.seq;
      }
    });
    return sorted;
  }, [catalog, search, category, size, sort]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          แคตตาล็อกวัสดุสำนักงาน
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          สินค้าทั้งหมด {catalog.length} รายการ เลือกหยิบใส่ตะกร้าเพื่อออกใบเสนอราคา
        </p>
      </div>

      {source === 'seed' && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {catalogError
              ? 'กำลังแสดงข้อมูลสำรองที่ฝังมากับเว็บ เพราะเชื่อมต่อฐานข้อมูลไม่ได้ (' +
                catalogError +
                ')'
              : 'ยังไม่มีข้อมูลในฐานข้อมูล — กำลังแสดงข้อมูลตั้งต้นที่ฝังมากับเว็บ ผู้ดูแลระบบกด "นำเข้าข้อมูลตั้งต้น" ในหน้าผู้ดูแลระบบเพื่อเริ่มใช้งานได้'}
          </p>
        </div>
      )}

      {status === 'loading' && catalog.length === 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดรายการสินค้า...
        </div>
      )}

      <ProductFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        size={size}
        onSizeChange={setSize}
        sizes={sizes}
        sort={sort}
        onSortChange={setSort}
        resultCount={visible.length}
        totalCount={catalog.length}
      />

      {visible.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
          <PackageSearch className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm">ไม่พบสินค้าที่ตรงกับคำค้นหา</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}