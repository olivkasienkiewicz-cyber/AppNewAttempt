'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/brand/page-header';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: 'Enter a valid email address.',
  self_invite: "That's your own email — enter the other person's instead.",
  already_linked: 'An account is already linked.',
  send_failed: "Couldn't send the confirmation email — try again.",
};

export default function AccountPage() {
  const hydrated = useHasHydrated();
  const state = useAppState();
  const router = useRouter();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const [parentEmail, setParentEmail] = useState('');
  const [sendingParent, setSendingParent] = useState(false);
  const [sentParent, setSentParent] = useState(false);

  const [childEmail, setChildEmail] = useState('');
  const [sendingChild, setSendingChild] = useState(false);
  const [sentChild, setSentChild] = useState(false);
  const [childInviteSkipped, setChildInviteSkipped] = useState(false);

  const linkedParent = currentUser?.parentId ? state.users[currentUser.parentId] : null;
  const linkedChild = currentUser
    ? Object.values(state.users).find((u) => u.role === 'student' && u.parentId === currentUser.id) ?? null
    : null;

  const handleInviteParent = async () => {
    const email = parentEmail.trim();
    if (!email) { toast.error("Enter your parent's email."); return; }
    setSendingParent(true);
    try {
      const res = await fetch('/api/account/parent-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(ERROR_MESSAGES[(data as { error?: string })?.error ?? ''] ?? 'Something went wrong — try again.');
        return;
      }
      toast.success('Confirmation email sent! Ask your parent to check their inbox.');
      setSentParent(true);
      setParentEmail('');
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSendingParent(false);
    }
  };

  const handleInviteChild = async () => {
    const email = childEmail.trim();
    if (!email) { toast.error("Enter your child's email."); return; }
    setSendingChild(true);
    try {
      const res = await fetch('/api/account/invite-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(ERROR_MESSAGES[(data as { error?: string })?.error ?? ''] ?? 'Something went wrong — try again.');
        return;
      }
      toast.success("Confirmation email sent! Ask your child to check their inbox.");
      setSentChild(true);
      setChildEmail('');
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSendingChild(false);
    }
  };

  if (!hydrated || !state.dataLoaded) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (!currentUser) {
    return <div className="p-6">Not signed in.</div>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Account</p>
        <h1 className="font-display text-4xl text-foreground">Settings</h1>
      </div>

      {currentUser.role === 'student' && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">Parent access</h2>
          {currentUser.parentId ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {linkedParent
                ? `${linkedParent.name} is linked to your account and handles payments.`
                : 'A parent is linked to your account and handles payments.'}
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a parent to let them handle payments for your sessions. You&apos;ll keep booking,
                messaging, and your schedule — just not payment details.
              </p>
              {sentParent ? (
                <p className="mt-3 text-sm text-foreground">Confirmation sent — ask them to check their email.</p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="h-10 flex-1"
                  />
                  <Button size="sm" disabled={sendingParent} onClick={() => void handleInviteParent()}>
                    {sendingParent ? 'Sending…' : 'Add a parent'}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {currentUser.role === 'parent' && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">Linked child</h2>
          {linkedChild ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {linkedChild.name} is linked to your account.
            </p>
          ) : childInviteSkipped ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">You can link your child&apos;s account anytime.</p>
              <button
                type="button"
                onClick={() => setChildInviteSkipped(false)}
                className="text-sm font-medium text-[#16B8A7] hover:underline"
              >
                Add now
              </button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Link your child&apos;s account so you can see their bookings and handle payments.
              </p>
              {sentChild ? (
                <p className="mt-3 text-sm text-foreground">Confirmation sent — ask them to check their email.</p>
              ) : (
                <>
                  <div className="mt-3 flex gap-2">
                    <Input
                      type="email"
                      value={childEmail}
                      onChange={(e) => setChildEmail(e.target.value)}
                      placeholder="child@example.com"
                      className="h-10 flex-1"
                    />
                    <Button size="sm" disabled={sendingChild} onClick={() => void handleInviteChild()}>
                      {sendingChild ? 'Sending…' : 'Add a child'}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChildInviteSkipped(true)}
                    className="mt-2 text-sm font-medium text-muted-foreground hover:underline"
                  >
                    Skip for now
                  </button>
                </>
              )}
            </>
          )}
        </section>
      )}

      {currentUser.role !== 'student' && currentUser.role !== 'parent' && (
        <p className="text-sm text-muted-foreground">Nothing to configure here yet.</p>
      )}
    </main>
  );
}
