'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/brand/brand-mark';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email.'); return; }
    setSubmitting(true);
    setError(null);
    const result = await signIn('resend', {
      email: trimmed,
      redirect: false,
      callbackUrl: '/',
    });
    setSubmitting(false);
    if (result?.error) {
      setError("Couldn't send the link — check the address and try again.");
      return;
    }
    router.push('/login/check-email');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
      <header className="mb-10 flex justify-center border-b border-border pb-4">
        <BrandMark size="md" />
      </header>
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="space-y-2 text-center">
          <p className="eyebrow">Sign in</p>
          <h1 className="font-display text-4xl text-foreground">What&apos;s your email?</h1>
          <p className="text-sm text-muted-foreground">We&apos;ll send you a link — no password needed.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 text-base"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="h-12 text-base">
            {submitting ? 'Sending…' : 'Send me a link'}
          </Button>
        </form>
      </div>
    </main>
  );
}
