'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState, setCurrentUser } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function TutorHomePage() {
  const state = useAppState();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = state.currentUserId ? state.users[state.currentUserId] : null;

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (user.role !== 'tutor') {
      router.replace('/student');
    }
  }, [mounted, user, router]);

  if (!mounted || !user || user.role !== 'tutor') return null;

  const handleSwitch = () => {
    setCurrentUser(null);
    router.replace('/');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="mt-12 text-2xl font-semibold">Hi, {user.name}</h1>
      <p className="text-sm text-muted-foreground">Tutor home (placeholder)</p>
      <div className="mt-auto">
        <Button variant="outline" className="w-full" onClick={handleSwitch}>
          Switch account
        </Button>
      </div>
    </main>
  );
}