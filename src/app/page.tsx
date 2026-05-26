'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState, setCurrentUser, type User } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

  if (!hydrated) {
    return <HomeSkeleton />;
  }

  // If we're signed in we're about to redirect — render a skeleton instead
  // of flashing the role select on the way out.
  if (state.currentUserId && state.users[state.currentUserId]) {
    return <HomeSkeleton />;
  }

  const users = Object.values(state.users);
  const showRoleSelect = users.length === 0 || forceNewProfile;

  if (showRoleSelect) return <RoleSelect />;

  return (
    <ProfilePicker users={users} onNewProfile={() => setForceNewProfile(true)} />
  );
}

function RoleSelect() {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-center text-2xl font-semibold">
        Are you a student or tutor?
      </h1>
      <div className="flex w-full flex-col gap-4">
        <Button
          size="lg"
          className="h-20 text-lg"
          onClick={() => router.push('/onboarding/name?role=student')}
        >
          Student
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-20 text-lg"
          onClick={() => router.push('/onboarding/name?role=tutor')}
        >
          Tutor
        </Button>
      </div>
    </main>
  );
}

function ProfilePicker({
  users,
  onNewProfile,
}: {
  users: User[];
  onNewProfile: () => void;
}) {
  const sorted = [...users].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1
  );
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="mt-12 text-2xl font-semibold">Choose a profile</h1>
      <ul className="flex flex-col gap-3">
        {sorted.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => setCurrentUser(u.id)}
              className="flex w-full items-center justify-between rounded-md border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium">{u.name}</span>
              <Badge variant={u.role === 'tutor' ? 'default' : 'secondary'}>
                {u.role}
              </Badge>
            </button>
          </li>
        ))}
      </ul>
      <Button variant="outline" onClick={onNewProfile}>
        + New profile
      </Button>
    </main>
  );
}

function HomeSkeleton() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="flex w-full flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </main>
  );
}
