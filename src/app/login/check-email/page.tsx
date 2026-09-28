'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/brand/brand-mark';

// Only allow redirects back into Studilly itself.
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/post-login';
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">Loading…</p></main>}>
      <CheckEmailInner />
    </Suspense>
  );
}

function CheckEmailInner() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') ?? '';
  const codeFromUrl = (searchParams.get('code') ?? '').replace(/\D/g, '').slice(0, 6);
  const next = safeNext(searchParams.get('next'));

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState(codeFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [resent, setResent] = useState(false);

  const cameFromEmailButton = codeFromUrl.length === 6;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().normalize('NFKC').toLowerCase();
    if (!trimmedEmail) { setError('Enter your email.'); return; }
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from the email.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/login-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === 'expired') {
          setError('This code has expired. Send yourself a new one.');
          setNeedsNewCode(true);
        } else if (data?.error === 'too_many_attempts') {
          setError('Too many wrong attempts. Send yourself a new code.');
          setNeedsNewCode(true);
        } else if (typeof data?.attemptsLeft === 'number') {
          setError(`That code isn't right. ${data.attemptsLeft} ${data.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`);
        } else {
          setError("That code isn't right — check the latest email and try again.");
        }
        setSubmitting(false);
        return;
      }

      // Code is valid — hand it to Auth.js, which signs in and redirects.
      const params = new URLSearchParams({ callbackUrl: next, token: code, email: trimmedEmail });
      window.location.href = `/api/auth/callback/resend?${params}`;
    } catch {
      setError("Couldn't reach the server — try again.");
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError('Enter your email first.'); return; }
    setResending(true);
    setError(null);
    const result = await signIn('resend', { email: trimmedEmail, redirect: false, callbackUrl: next });
    setResending(false);
    if (result?.error) {
      setError("Couldn't send a new code — try again.");
      return;
    }
    setCode('');
    setNeedsNewCode(false);
    setResent(true);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
      <header className="mb-10 flex justify-center border-b border-border pb-4">
        <BrandMark size="md" />
      </header>
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="space-y-2 text-center">
          <p className="eyebrow">{cameFromEmailButton ? 'Sign in' : 'Almost there'}</p>
          <h1 className="font-display text-4xl text-foreground">
            {cameFromEmailButton ? 'Confirm sign-in' : 'Check your email'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {cameFromEmailButton
              ? 'Your code is filled in — just press Sign in.'
              : emailFromUrl
                ? <>We sent a 6-digit code to <span className="font-medium text-foreground">{emailFromUrl}</span>.</>
                : 'We sent you a 6-digit code. Enter it below.'}
          </p>
          {resent && <p className="text-sm text-[#0F8077]">New code sent — check your inbox.</p>}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {!emailFromUrl && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 text-base"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="code" className="text-sm">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(null); }}
              autoFocus={!cameFromEmailButton}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              className="h-14 text-center text-2xl tracking-[0.5em]"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" size="lg" disabled={submitting || needsNewCode} className="h-12 text-base">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending}
            className={needsNewCode ? 'font-medium text-[#0F8077] hover:underline' : 'text-muted-foreground hover:text-foreground hover:underline'}
          >
            {resending ? 'Sending…' : 'Send a new code'}
          </button>
          <Link href="/login" className="text-muted-foreground hover:text-foreground hover:underline">
            Use a different email
          </Link>
        </div>
      </div>
    </main>
  );
}
