'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type LinkInfo = {
  direction: 'student_invites_parent' | 'parent_invites_student';
  inviteeEmail: string;
  initiatorName: string;
  expired: boolean;
  confirmed: boolean;
};

export default function ConfirmLinkPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">Loading…</p></main>}>
      <ConfirmLinkInner />
    </Suspense>
  );
}

function ConfirmLinkInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get('token') ?? '';

  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError('Missing link token.'); setLoading(false); return; }
    fetch(`/api/account-links/${token}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: LinkInfo) => setInfo(data))
      .catch(() => setError('This link is invalid or no longer exists.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSignIn = async () => {
    if (!info) return;
    await signIn('resend', { email: info.inviteeEmail, redirect: false, callbackUrl: `/confirm-link?token=${token}` });
    router.push('/login/check-email');
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/account-links/${token}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const messages: Record<string, string> = {
          already_confirmed: 'This link has already been used.',
          expired: 'This link has expired — ask them to send a new one.',
          wrong_account: "You're signed in with a different email than this invite was sent to.",
          role_conflict: "Your account's current role can't accept this kind of link.",
          already_linked: 'That account is already linked to someone else.',
        };
        setError(messages[(data as { error?: string })?.error ?? ''] ?? 'Something went wrong.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/post-login'), 1500);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading || status === 'loading') {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">Loading…</p></main>;
  }
  if (error) {
    return <main className="flex min-h-screen items-center justify-center px-6"><p className="text-sm text-destructive text-center">{error}</p></main>;
  }
  if (!info) return null;
  if (info.confirmed) {
    return <main className="flex min-h-screen items-center justify-center px-6"><p className="text-sm text-muted-foreground text-center">This link has already been confirmed.</p></main>;
  }
  if (info.expired) {
    return <main className="flex min-h-screen items-center justify-center px-6"><p className="text-sm text-muted-foreground text-center">This link has expired — ask them to send a new one.</p></main>;
  }
  if (done) {
    return <main className="flex min-h-screen items-center justify-center px-6"><p className="text-sm text-foreground text-center">Linked! Taking you to your account…</p></main>;
  }

  const description = info.direction === 'student_invites_parent'
    ? `${info.initiatorName} wants to link you as their parent, so you can handle payments for their sessions.`
    : `${info.initiatorName} wants to link your account as their student.`;

  const isSignedInAsInvitee =
    status === 'authenticated' &&
    session?.user?.email?.trim().toLowerCase() === info.inviteeEmail.trim().toLowerCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center gap-6">
      <h1 className="font-display text-3xl text-foreground">Confirm family link</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {isSignedInAsInvitee ? (
        <Button size="lg" disabled={confirming} onClick={() => void handleConfirm()}>
          {confirming ? 'Confirming…' : 'Confirm'}
        </Button>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Sign in as <strong>{info.inviteeEmail}</strong> to confirm.
          </p>
          <Button size="lg" onClick={() => void handleSignIn()}>Sign in to confirm</Button>
        </>
      )}
    </main>
  );
}
