'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState, setCurrentUser, type User } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandMark } from '@/components/brand/brand-mark';

export default function HomePage() {
  const hydrated = useHasHydrated();
  const state = useAppState();
  const router = useRouter();
  const [forceNewProfile, setForceNewProfile] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const id = state.currentUserId;
    if (!id) return;
    const user = state.users[id];
    if (!user) return;
    router.replace(user.role === 'tutor' ? '/tutor' : '/student');
  }, [hydrated, state.currentUserId, state.users, router]);

  if (!hydrated) return <HomeSkeleton />;
  if (state.currentUserId && state.users[state.currentUserId]) return <HomeSkeleton />;

  const users = Object.values(state.users);
  const showRoleSelect = users.length === 0 || forceNewProfile;

  if (showRoleSelect) return <RoleSelect />;
  return <ProfilePicker users={users} onNewProfile={() => setForceNewProfile(true)} />;
}

function RoleSelect() {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
      <div className="mb-16 flex justify-center">
        <BrandMark size="md" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-3 text-center">
          <p className="eyebrow">Welcome</p>
          <h1 className="font-display text-5xl text-foreground">
            How would you like to begin?
          </h1>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">
            Studilly works for both sides of the table.
            Pick the one that brought you here.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button size="lg" className="h-14 text-base"
            onClick={() => router.push('/onboarding/name?role=student')}>
            I&apos;m a student
          </Button>
          <Button size="lg" variant="secondary" className="h-14 text-base"
            onClick={() => router.push('/onboarding/name?role=tutor')}>
            I&apos;m a tutor
          </Button>
        </div>
      </div>
    </main>
  );
}

function ProfilePicker({ users, onNewProfile }: { users: User[]; onNewProfile: () => void }) {
  const sorted = [...users].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-6 pt-10 pb-10">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <BrandMark size="md" />
      </header>
      <div className="space-y-1">
        <p className="eyebrow">Continue as</p>
        <h1 className="font-display text-4xl text-foreground">Choose a profile</h1>
      </div>
      <ul className="flex flex-col gap-2">
        {sorted.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => setCurrentUser(u.id)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium">{u.name}</span>
              <Badge variant={u.role === 'tutor' ? 'default' : 'secondary'}>{u.role}</Badge>
            </button>
          </li>
        ))}
      </ul>
      <Button variant="outline" onClick={onNewProfile} className="mt-auto">
        + New profile
      </Button>
    </main>
  );
}

function HomeSkeleton() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
      <div className="mb-16 flex justify-center">
        <Skeleton className="h-6 w-28 rounded" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-3 w-16" />
          <Skeleton className="mx-auto h-12 w-72" />
          <Skeleton className="mx-auto h-4 w-56" />
        </div>
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
