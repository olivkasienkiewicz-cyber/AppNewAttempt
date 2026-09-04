'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function PostLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.replace('/login'); return; }
    const role = (session?.user as { role?: 'tutor' | 'student' | 'parent' | null } | undefined)?.role;
    if (role === 'tutor') router.replace('/tutor');
    else if (role === 'student') router.replace('/student');
    else if (role === 'parent') router.replace('/parent');
    else router.replace('/onboarding');
  }, [status, session, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </main>
  );
}
