import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useUiStore } from '@/store/ui';

export function Toast() {
  const message = useUiStore((state) => state.message);
  const token = useUiStore((state) => state.token);
  const clearToast = useUiStore((state) => state.clearToast);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => clearToast(), 2400);
    return () => window.clearTimeout(timer);
  }, [message, token, clearToast]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div className="pointer-events-auto flex animate-toast-in items-center gap-2 rounded-full bg-royal px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-accent-subtle" />
        <span>{message}</span>
      </div>
    </div>
  );
}