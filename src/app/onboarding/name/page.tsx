'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUser, setCurrentUser, type Role } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const canSubmit =
    role !== null && trimmed.length > 0 && trimmed.length <= MAX_LEN;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!role) {
      router.replace('/');
      return;
    }
    if (trimmed.length === 0) {
      setError('Please enter your name.');
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setError(`Name must be ${MAX_LEN} characters or fewer.`);
      return;
    }
    const user = createUser(trimmed, role);
    setCurrentUser(user.id);
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">What is your name?</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            maxLength={MAX_LEN}
            autoFocus
            autoComplete="given-name"
            placeholder="Your name"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'name-error' : undefined}
          />
          {error && (
            <p id="name-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={!canSubmit}>
          Continue
        </Button>
      </form>
    </main>
  );
}