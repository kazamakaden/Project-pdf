import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Person } from '@/types/person';

export interface PersonDraft {
  name: string;
  position: string;
}

export type PersonnelStatus = 'idle' | 'loading' | 'ready';

interface PersonnelState {
  people: Person[];
  status: PersonnelStatus;
  error: string | null;
  saving: boolean;
  load: (force?: boolean) => Promise<void>;
  createPerson: (draft: PersonDraft) => Promise<void>;
  updatePerson: (id: string, patch: Partial<PersonDraft>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
}

function sortPeople(items: Person[]): Person[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * ทำเนียบบุคลากร (เก็บในฐานข้อมูลกลาง)
 * ข้อมูลชุดนี้เป็นข้อมูลประกอบหน้าเว็บ — ถ้าโหลดไม่ได้จะแสดงรายการว่างโดยไม่ทำให้หน้าอื่นพัง
 */
export const usePersonnelStore = create<PersonnelState>()((set, get) => ({
  people: [],
  status: 'idle',
  error: null,
  saving: false,

  load: async (force = false) => {
    const { status } = get();
    if (!force && (status === 'loading' || status === 'ready')) return;

    set({ status: 'loading', error: null });
    try {
      const people = await api.listPersonnel();
      set({ people: sortPeople(people), status: 'ready', error: null });
    } catch (error) {
      set({
        people: [],
        status: 'ready',
        error: messageOf(error, 'โหลดทำเนียบบุคลากรไม่สำเร็จ'),
      });
    }
  },

  createPerson: async (draft) => {
    set({ saving: true });
    try {
      const created = await api.createPerson({
        name: draft.name.trim(),
        position: draft.position.trim(),
      });
      set((state) => ({ people: sortPeople([...state.people, created]), error: null }));
    } finally {
      set({ saving: false });
    }
  },

  updatePerson: async (id, patch) => {
    set({ saving: true });
    try {
      const updated = await api.updatePerson(id, patch);
      set((state) => ({
        people: sortPeople(state.people.map((item) => (item.id === id ? updated : item))),
        error: null,
      }));
    } finally {
      set({ saving: false });
    }
  },

  deletePerson: async (id) => {
    set({ saving: true });
    try {
      await api.deletePerson(id);
      set((state) => ({
        people: state.people.filter((item) => item.id !== id),
        error: null,
      }));
    } finally {
      set({ saving: false });
    }
  },
}));

/** รายชื่อบุคลากรเรียงตามลำดับ (ใช้ใน Footer และหน้าทำเนียบบุคลากร) */
export function usePersonnel(): Person[] {
  return usePersonnelStore((state) => state.people);
}
