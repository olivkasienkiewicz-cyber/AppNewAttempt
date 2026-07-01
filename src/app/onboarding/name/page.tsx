'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUser, setCurrentUser, getState, type Role } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/brand/brand-mark';

const MAX_LEN = 40;

export default function NameEntryPage() {
  return (
    <Suspense fallback={null}>
      <NameEntryForm />
    </Suspense>
  );
}

function NameEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const role: Role | null =
    roleParam === 'tutor' || roleParam === 'student' ? roleParam : null;

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = role !== null && trimmed.length > 0 && trimmed.length <= MAX_LEN;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!role) { router.replace('/'); return; }
    if (trimmed.length === 0) { setError('Please enter your name.'); return; }
    if (trimmed.length > MAX_LEN) { setError(`Name must be ${MAX_LEN} characters or fewer.`); return; }
    const user = createUser(trimmed, role);
    setCurrentUser(user.id);

    const confirmed = getState();
    if (confirmed.currentUserId !== user.id || !confirmed.users[user.id]) {
      setError(
        "Your browser blocked local storage, so we couldn't save your profile. " +
        "Try leaving private/incognito mode, or open this app in its own browser tab " +
        "instead of an embedded preview."
      );
      toast.error("Couldn't save your profile — storage is blocked in this browser context.");
      return;
    }

    router.replace(role === 'tutor' ? '/tutor' : '/student');
  };

  if (!role) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">Missing role.</p>
        <Button onClick={() => router.replace('/')}>Back to start</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
      <header className="mb-10 flex items-center justify-between border-b border-border pb-4">
        <BrandMark size="md" />
        <Button variant="ghost" size="sm" onClick={() => router.replace('/')}>Cancel</Button>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="space-y-2">
          <p className="eyebrow">
            {role === 'tutor' ? 'Tutor sign-in' : 'Student sign-in'}
          </p>
          <h1 className="font-display text-4xl text-foreground">What should we call you?</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-sm">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
              maxLength={MAX_LEN}
              autoFocus
              autoComplete="given-name"
              placeholder="e.g. Anya Marek"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'name-error' : undefined}
              className="h-12 text-base"
            />
            {error && (
              <p id="name-error" className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <Button type="submit" size="lg" disabled={!canSubmit} className="h-12 text-base">
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}
