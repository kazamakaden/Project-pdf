import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsAdmin } from '@/store/auth';
import { usePersonnel, usePersonnelStore } from '@/store/personnel';
import { useUiStore } from '@/store/ui';
import type { Person } from '@/types/person';

const sectionClass =
  'rounded-lg border border-royal/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';

export function PersonnelPage() {
  const isAdmin = useIsAdmin();
  const people = usePersonnel();
  const saving = usePersonnelStore((state) => state.saving);
  const error = usePersonnelStore((state) => state.error);
  const createPerson = usePersonnelStore((state) => state.createPerson);
  const updatePerson = usePersonnelStore((state) => state.updatePerson);
  const deletePerson = usePersonnelStore((state) => state.deletePerson);
  const showToast = useUiStore((state) => state.showToast);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [editing, setEditing] = useState<Person | null>(null);

  const resetForm = () => {
    setName('');
    setPosition('');
    setEditing(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      showToast('กรุณากรอกชื่อ-นามสกุลบุคลากร');
      return;
    }
    try {
      if (editing) {
        await updatePerson(editing.id, { name: name.trim(), position: position.trim() });
        showToast('บันทึกการแก้ไข "' + name.trim() + '" แล้ว');
      } else {
        await createPerson({ name: name.trim(), position: position.trim() });
        showToast('เพิ่มบุคลากร "' + name.trim() + '" แล้ว');
      }
      resetForm();
    } catch (submitError) {
      showToast(submitError instanceof Error ? submitError.message : 'บันทึกข้อมูลไม่สำเร็จ');
    }
  };

  const startEdit = (person: Person) => {
    setEditing(person);
    setName(person.name);
    setPosition(person.position);
  };

  const handleDelete = async (person: Person) => {
    const confirmed = window.confirm('ต้องการลบ "' + person.name + '" ออกจากทำเนียบบุคลากรหรือไม่?');
    if (!confirmed) return;
    try {
      await deletePerson(person.id);
      if (editing?.id === person.id) resetForm();
      showToast('ลบบุคลากรแล้ว');
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : 'ลบข้อมูลไม่สำเร็จ');
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
          <Users className="h-6 w-6 text-royal dark:text-blue-300" />
          ทำเนียบบุคลากร
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          รายชื่อและตำแหน่งของบุคลากรงานพัสดุ ใช้แสดงในส่วนท้ายของเว็บ (Footer)
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      {isAdmin ? (
        <form onSubmit={handleSubmit} className={sectionClass + ' mb-4'}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            {editing ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="person-name">ชื่อ-นามสกุล</Label>
              <Input
                id="person-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="เช่น นายสมชาย ใจดี"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-position">ตำแหน่ง / หน้าที่</Label>
              <Input
                id="person-position"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                placeholder="เช่น หัวหน้างานพัสดุ"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" variant="accent" disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editing ? 'บันทึกการแก้ไข' : 'เพิ่มบุคลากร'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={resetForm} className="gap-1.5">
                <X className="h-4 w-4" /> ยกเลิก
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="mb-4 rounded-lg border border-royal/15 bg-royal/5 p-3 text-xs text-royal dark:border-slate-700 dark:bg-slate-900 dark:text-blue-200">
          เข้าสู่ระบบด้วยอีเมลผู้ดูแลระบบเพื่อเพิ่ม แก้ไข หรือลบรายชื่อบุคลากร
        </div>
      )}

      <div className={sectionClass}>
        {people.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            ยังไม่มีข้อมูลบุคลากรในฐานข้อมูล
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {people.map((person, index) => (
              <li key={person.id} className="flex items-center gap-3 py-3">
                <span className="w-7 shrink-0 text-center text-xs font-semibold text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {person.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {person.position || '-'}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={'แก้ไข ' + person.name}
                      onClick={() => startEdit(person)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={'ลบ ' + person.name}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => void handleDelete(person)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
