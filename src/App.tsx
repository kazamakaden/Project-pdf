import { useEffect, useState } from 'react';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { BasketDrawer } from '@/components/basket/BasketDrawer';
import { BasketPage } from '@/components/basket/BasketPage';
import { ProductCatalog } from '@/components/catalog/ProductCatalog';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PersonnelPage } from '@/components/personnel/PersonnelPage';
import { QuotationPDF } from '@/components/quotation/QuotationPDF';
import { Toast } from '@/components/ui/toast';
import { usePersonnelStore } from '@/store/personnel';
import { useProductStore } from '@/store/products';
import type { AppView } from '@/types/navigation';

export default function App() {
  const [view, setView] = useState<AppView>('catalog');

  // โหลดแคตตาล็อกจาก API ครั้งแรกที่เปิดเว็บ
  useEffect(() => {
    void useProductStore.getState().load();
    void usePersonnelStore.getState().load();
  }, []);


  return (
    <div className="flex min-h-screen flex-col">
      <Header view={view} onNavigate={setView} />
      <main className="flex-1">
        {view === 'catalog' && <ProductCatalog />}
        {view === 'basket' && <BasketPage onNavigate={setView} />}
        {view === 'quotation' && <QuotationPDF onNavigate={setView} />}
        {view === 'personnel' && <PersonnelPage />}
        {view === 'admin' && <AdminPanel onNavigate={setView} />}
      </main>
      <Footer />
      <BasketDrawer onNavigate={setView} />
      <Toast />
    </div>
  );
}