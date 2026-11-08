import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isAdminEmail } from '@/config/site';
import type { GoogleProfile } from '@/lib/googleAuth';

interface AuthState {
  user: GoogleProfile | null;
  expiresAt: number | null;
  denialMessage: string | null;
  signIn: (profile: GoogleProfile) => void;
  signOut: () => void;
  setDenialMessage: (message: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      expiresAt: null,
      denialMessage: null,
      signIn: (profile) => set({ user: profile, expiresAt: profile.expiresAt, denialMessage: null }),
      signOut: () => set({ user: null, expiresAt: null, denialMessage: null }),
      setDenialMessage: (message) => set({ denialMessage: message }),
    }),
    {
      name: 'udtc-auth',
      partialize: (state) => ({ user: state.user, expiresAt: state.expiresAt }),
    },
  ),
);

/** true เฉพาะอีเมลเจ้าของเว็บที่กำหนดไว้ใน src/config/site.ts และเซสชันยังไม่หมดอายุ */
export function useIsAdmin(): boolean {
  const user = useAuthStore((state) => state.user);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  if (!user) return false;
  if (expiresAt !== null && expiresAt <= Date.now()) return false;
  return isAdminEmail(user.email);
}
