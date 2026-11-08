import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADMIN_EMAIL, GOOGLE_CLIENT_ID, IS_GOOGLE_CONFIGURED, SITE, isAdminEmail } from '@/config/site';
import {
  createLocalAdminProfile,
  getGoogleIdentity,
  loadGoogleIdentity,
  readGoogleCredential,
} from '@/lib/googleAuth';
import { useAuthStore } from '@/store/auth';

interface LoginPageProps {
  onBack?: () => void;
}

export function LoginPage({ onBack }: LoginPageProps) {
  const user = useAuthStore((state) => state.user);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(IS_GOOGLE_CONFIGURED);
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  // ปุ่มล็อกอินแบบโลคอลแสดงเฉพาะเมื่อเปิดเว็บบนเครื่องนี้ (localhost) — เว็บที่ deploy จริงจะไม่แสดง
  const isLocalHost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname);

  useEffect(() => {
    if (!IS_GOOGLE_CONFIGURED) return;
    let cancelled = false;

    void (async () => {
      try {
        await loadGoogleIdentity();
        if (cancelled) return;

        const identity = getGoogleIdentity();
        if (!identity) throw new Error('ไม่พบบริการ Google Identity');

        identity.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            try {
              if (!response.credential) throw new Error('ไม่ได้รับข้อมูลยืนยันตัวตนจาก Google');
              const profile = readGoogleCredential(response.credential, GOOGLE_CLIENT_ID);
              if (!isAdminEmail(profile.email)) {
                setError(
                  'บัญชี ' +
                    profile.email +
                    ' ไม่มีสิทธิ์แก้ไขข้อมูล (อนุญาตเฉพาะ ' +
                    ADMIN_EMAIL +
                    ')',
                );
                return;
              }
              setError(null);
              signIn(profile);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
            }
          },
        });

        if (!renderedRef.current && buttonRef.current) {
          buttonRef.current.innerHTML = '';
          identity.renderButton(buttonRef.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            locale: 'th',
            width: 300,
          });
          renderedRef.current = true;
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : 'โหลดบริการ Google ไม่สำเร็จ');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signIn]);

  const signedInAsAdmin = Boolean(user && isAdminEmail(user.email));

  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-royal/15 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-royal text-white">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">เข้าสู่ระบบผู้ดูแล</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{SITE.nameTh}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          ระบบอนุญาตให้แก้ไขข้อมูลสินค้าได้เฉพาะบัญชี Google ของเจ้าของเว็บเท่านั้น กรุณาเข้าสู่ระบบด้วยอีเมล{' '}
          <span className="font-semibold text-royal dark:text-blue-300">{ADMIN_EMAIL}</span>
        </p>

        {!IS_GOOGLE_CONFIGURED && (
          <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              ยังไม่ได้ตั้งค่า Google Client ID
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
              <li>สร้าง OAuth Client ID (Web application) ที่ Google Cloud Console</li>
              <li>เพิ่ม Authorized JavaScript origin เช่น http://localhost:5173</li>
              <li>สร้างไฟล์ .env แล้วกำหนด VITE_GOOGLE_CLIENT_ID และ VITE_ADMIN_EMAIL</li>
              <li>รีสตาร์ท dev server (npm run dev)</li>
            </ol>
          </div>
        )}

        {IS_GOOGLE_CONFIGURED && (
          <div className="mt-6">
            {signedInAsAdmin ? (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  เข้าสู่ระบบแล้ว
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{user?.email}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div ref={buttonRef} className="min-h-[44px]" />
                {loading && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    กำลังโหลดปุ่มลงชื่อเข้าใช้...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {isLocalHost && !signedInAsAdmin && (
          <div className="mt-5 rounded-lg border border-dashed border-royal/40 bg-royal/5 p-4 dark:border-blue-400/40 dark:bg-slate-800/60">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-royal dark:text-blue-300" />
              โหมดทดสอบ (เฉพาะเครื่องนี้)
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              เข้าใช้งานได้โดยไม่ต้องตั้งค่า Google OAuth — ใช้ได้เฉพาะเมื่อเปิดบนเครื่องนี้
              (localhost) และจะไม่แสดงบนเว็บที่ deploy แล้ว
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => {
                setError(null);
                signIn(createLocalAdminProfile(ADMIN_EMAIL));
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              เข้าสู่ระบบแบบโลคอล
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p className="max-w-[62%] text-[11px] leading-relaxed text-slate-400">
            การตรวจสอบสิทธิ์ทำในเบราว์เซอร์ เหมาะกับการใช้งานภายในหรือการสาธิต
          </p>
          {onBack && (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              กลับแคตตาล็อก
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
