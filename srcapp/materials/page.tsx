'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

export default function MaterialsHubPage() {
  const state = useAppState();
  const router = useRouter();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const linkedStudent = useMemo(() => {
    if (!currentUser || currentUser.role !== 'parent') return null;
    return Object.values(state.users).find((u) => u.role === 'student' && u.parentId === currentUser.id) ?? null;
  }, [state.users, currentUser]);

  const effectiveStudentId = currentUser?.role === 'parent' ? (linkedStudent?.id ?? currentUser.id) : currentUser?.id;
  const homeHref = currentUser?.role === 'parent' ? '/parent' : '/student';

  const tutorIds = useMemo(() => {
    if (!effectiveStudentId) return [];
    const set = new Set<string>();
    for (const s of Object.values(state.slots)) {
      if (s.bookedByStudentId === effectiveStudentId) set.add(s.tutorId);
    }
    return Array.from(set);
  }, [state.slots, effectiveStudentId]);

  const tutors = tutorIds.map((id) => state.users[id]).filter(Boolean);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.push(homeHref)}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="ghost" size="icon" aria-label="Home" onClick={() => router.push(homeHref)} className="h-9 w-9">
          <Home className="h-4 w-4" />
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Class resources</p>
        <h1 className="font-display text-4xl text-foreground">Materials</h1>
      </div>

      {tutors.length === 0 ? (
        <EmptyState>Once you've booked a session with a tutor, their materials will show up here.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {tutors.map((tutor) => (
            <li key={tutor!.id}>
              <button
                type="button"
                onClick={() => router.push(`/materials/${tutor!.id}`)}
                className="w-full rounded-lg border border-border px-4 py-3 text-left text-sm font-medium text-foreground hover:border-[#16B8A7] hover:text-[#16B8A7]"
              >
                {tutor!.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
