import { create } from 'zustand';

interface ToastState {
  message: string | null;
  token: number;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<ToastState>((set) => ({
  message: null,
  token: 0,
  showToast: (message) => set((state) => ({ message, token: state.token + 1 })),
  clearToast: () => set({ message: null }),
}));