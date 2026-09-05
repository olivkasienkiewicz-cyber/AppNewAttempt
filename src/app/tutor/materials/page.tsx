'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

export default function TutorMaterialsHubPage() {
  const state = useAppState();
  const router = useRouter();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const studentIds = useMemo(() => {
    if (!currentUser) return [];
    const set = new Set<string>();
    for (const s of Object.values(state.slots)) {
      if (s.tutorId === currentUser.id && s.bookedByStudentId) set.add(s.bookedByStudentId);
    }
    return Array.from(set);
  }, [state.slots, currentUser]);

  const students = studentIds.map((id) => state.users[id]).filter(Boolean);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.push('/tutor')}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Class resources</p>
        <h1 className="font-display text-4xl text-foreground">Materials</h1>
      </div>

      {students.length === 0 ? (
        <EmptyState>Once a student books with you, you can add materials for them here.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {students.map((student) => (
            <li key={student!.id}>
              <button
                type="button"
                onClick={() => router.push(`/tutor/materials/${student!.id}`)}
                className="w-full rounded-lg border border-border px-4 py-3 text-left text-sm font-medium text-foreground hover:border-[#16B8A7] hover:text-[#16B8A7]"
              >
                {student!.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
