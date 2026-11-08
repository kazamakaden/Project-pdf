import type {
  ForwardRefExoticComponent,
  MouseEvent as ReactMouseEvent,
  Ref,
  RefObject,
  RefAttributes,
} from 'react';
import { useIconHover, type IconHandle } from '@animateicons/react';
import {
  FileTextIcon,
  LockIcon,
  MoonIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
  SunIcon,
} from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { SITE } from '@/config/site';
import { cn } from '@/lib/utils';
import { useBasketStore } from '@/store/basket';
import { useIsAdmin } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import type { AppView } from '@/types/navigation';
import { countItems } from '@/utils/calc';

interface HeaderProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

/** props ที่ไอคอนแอนิเมชันใน Header ใช้ร่วมกัน (size = พิกเซล) */
interface HeaderIconProps {
  size?: number;
  className?: string;
}

/** ไอคอนทุกตัวจาก @animateicons/react มี signature เดียวกัน (forwardRef + handle สั่งแอนิเมชัน) */
type HeaderIcon = ForwardRefExoticComponent<HeaderIconProps & RefAttributes<IconHandle>>;

/**
 * @animateicons/react พิมพ์ ref ของ `useIconHover` เป็น `RefObject<IconHandle | null>` (สไตล์ React 19)
 * แต่โปรเจกต์นี้ใช้ @types/react 18 ซึ่ง `Ref<T>` ต้องการ `RefObject<T>` ตรง ๆ
 * handle ของไอคอนทุกตัวมี shape เดียวกัน (startAnimation/stopAnimation) จึง cast ได้ปลอดภัย
 */
function iconRef(ref: RefObject<IconHandle | null>): Ref<IconHandle> {
  return ref as Ref<IconHandle>;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: HeaderIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'catalog', label: 'แคตตาล็อก', icon: StoreIcon },
  { id: 'basket', label: 'ตะกร้าสินค้า', icon: ShoppingCartIcon },
  { id: 'quotation', label: 'ใบเสนอราคา', icon: FileTextIcon },
  { id: 'admin', label: 'ผู้ดูแลระบบ', icon: LockIcon },
];

const AdminIcon: HeaderIcon = ShieldCheckIcon;
const CartIcon: HeaderIcon = ShoppingCartIcon;
const ThemeIcons: Record<'light' | 'dark', HeaderIcon> = { light: MoonIcon, dark: SunIcon };

interface NavButtonProps {
  item: NavItem;
  active: boolean;
  isAdmin: boolean;
  count: number;
  onNavigate: (view: AppView) => void;
}

/** ปุ่มเมนู 1 ปุ่ม — ไอคอนจะเล่นแอนิเมชันเมื่อเอาเมาส์ชี้หรือคลิกที่ปุ่ม */
function NavButton({ item, active, isAdmin, count, onNavigate }: NavButtonProps) {
  const { ref, triggerProps } = useIconHover({ trigger: 'both' });
  const isAdminItem = item.id === 'admin';
  const Icon = isAdminItem && isAdmin ? AdminIcon : item.icon;
  const label = isAdminItem && isAdmin ? 'หลังบ้าน' : item.label;

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    triggerProps.onClick?.(event);
    onNavigate(item.id);
  };

  return (
    <button
      type="button"
      onMouseEnter={triggerProps.onMouseEnter}
      onMouseLeave={triggerProps.onMouseLeave}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-4 py-2.5 text-base font-medium transition-colors',
        active ? 'bg-white text-royal shadow-sm' : 'text-blue-50 hover:bg-white/10',
      )}
    >
      <Icon ref={iconRef(ref)} size={20} />
      <span className="hidden sm:inline">{label}</span>
      {item.id === 'basket' && count > 0 && (
        <span className="ml-0.5 rounded-full bg-accent px-1.5 text-xs font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

export function Header({ view, onNavigate }: HeaderProps) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const items = useBasketStore((state) => state.items);
  const setDrawerOpen = useBasketStore((state) => state.setDrawerOpen);
  const count = countItems(items);
  const isAdmin = useIsAdmin();

  const themeIcon = useIconHover({ trigger: 'both' });
  const cartIcon = useIconHover({ trigger: 'both' });
  const ThemeIcon = ThemeIcons[theme];

  const handleToggleTheme = (event: ReactMouseEvent<HTMLButtonElement>) => {
    themeIcon.triggerProps.onClick?.(event);
    toggleTheme();
  };

  const handleOpenBasket = (event: ReactMouseEvent<HTMLButtonElement>) => {
    cartIcon.triggerProps.onClick?.(event);
    setDrawerOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-royal-hover/40 bg-royal text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <button type="button" onClick={() => onNavigate('catalog')} className="flex items-center gap-3 text-left">
          <img
            src="/logo.png"
            alt="โลโก้วิทยาลัยเทคนิคอุดรธานี"
            className="h-11 w-11 shrink-0 object-contain"
          />
          <span className="flex flex-col">
            <span className="text-lg font-semibold leading-tight tracking-tight">{SITE.nameTh}</span>
            <span className="text-xs text-blue-100">{SITE.tagline}</span>
          </span>
        </button>

        <nav className="flex items-center gap-1 self-start rounded-lg bg-white/10 p-1 lg:self-auto">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={view === item.id}
              isAdmin={isAdmin}
              count={count}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseEnter={themeIcon.triggerProps.onMouseEnter}
            onMouseLeave={themeIcon.triggerProps.onMouseLeave}
            onClick={handleToggleTheme}
            aria-label="สลับโหมดสว่าง/มืด"
            className="text-blue-50 hover:bg-white/10 hover:text-white"
          >
            <ThemeIcon ref={iconRef(themeIcon.ref)} size={20} />
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onMouseEnter={cartIcon.triggerProps.onMouseEnter}
            onMouseLeave={cartIcon.triggerProps.onMouseLeave}
            onClick={handleOpenBasket}
            className="gap-1.5"
          >
            <CartIcon ref={iconRef(cartIcon.ref)} size={16} />
            <span className="hidden sm:inline">ตะกร้า</span>
            <span className="rounded-full bg-white/25 px-1.5 text-xs font-semibold">{count}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}