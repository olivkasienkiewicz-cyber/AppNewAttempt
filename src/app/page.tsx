'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandMark } from '@/components/brand/brand-mark';

export default function HomePage() {
  const { status } = useSession();
  const state = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!state.dataLoaded || !state.currentUserId) return;
    const user = state.users[state.currentUserId];
    if (!user) return; // this user's row hasn't loaded yet
    if (!user.role) { router.replace('/onboarding'); return; }
    router.replace(user.role === 'tutor' ? '/tutor' : '/student');
  }, [status, state.dataLoaded, state.currentUserId, state.users, router]);

  if (status === 'loading' || status === 'authenticated') return <HomeSkeleton />;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 pt-10 pb-10 text-center">
      <BrandMark size="md" />
      <div className="space-y-3">
        <p className="eyebrow">Welcome</p>
        <h1 className="font-display text-5xl text-foreground">A calmer way to book tutors</h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          Sign in with your email to get started — no password needed.
        </p>
      </div>
      <Button size="lg" className="h-14 w-full text-base" onClick={() => router.push('/login')}>
        Sign in
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
        </div>
      </div>
    </main>
  );
}
