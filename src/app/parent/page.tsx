'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { useAppState, refreshState, createPaymentBatch, type Slot } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';
import { referenceCodeForSlot, amountForSlot, BANK_DETAILS } from '@/lib/payment';

const BATCH_SIZES = [1, 4, 12] as const;

function startDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
function formatDayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function ParentDashboardPage() {
  const hydrated = useHasHydrated();
  const state = useAppState();
  const router = useRouter();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const linkedStudent = useMemo(() => {
    if (!currentUser) return null;
    return Object.values(state.users).find((u) => u.role === 'student' && u.parentId === currentUser.id) ?? null;
  }, [state.users, currentUser]);

  const effectiveBookingOwnerId = linkedStudent?.id ?? currentUser?.id ?? null;
  const bookingOwnerName = linkedStudent?.name ?? currentUser?.name ?? 'Your';

  const bookings = useMemo<Slot[]>(() => {
    if (!effectiveBookingOwnerId) return [];
    const now = new Date();
    return Object.values(state.slots)
      .filter((s) => s.status === 'booked' && s.bookedByStudentId === effectiveBookingOwnerId)
      .filter((s) => startDateTime(s.date, s.startTime).getTime() > now.getTime())
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  }, [state.slots, effectiveBookingOwnerId]);

  const eligibleOrdered = useMemo(
    () => bookings.filter((s) => s.paymentStatus === 'unpaid' && !s.paymentBatchId),
    [bookings]
  );

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [moveTarget, setMoveTarget] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [creatingBatchSize, setCreatingBatchSize] = useState<number | null>(null);
  const [batchPayment, setBatchPayment] = useState<{ referenceCode: string; amount: number; currency: string; discountApplied?: boolean; discountCode?: string | null } | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);

  const moveOptions = useMemo<Slot[]>(() => {
    if (!moveTarget) return [];
    const now = new Date();
    return Object.values(state.slots)
      .filter((s) => s.tutorId === moveTarget.tutorId && s.status === 'free' && s.id !== moveTarget.id)
      .filter((s) => startDateTime(s.date, s.startTime).getTime() > now.getTime())
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  }, [moveTarget, state.slots]);

  const handlePayBatch = async (size: number) => {
    if (!effectiveBookingOwnerId || eligibleOrdered.length < size) return;
    const slotIds = eligibleOrdered.slice(0, size).map((s) => s.id);
    setCreatingBatchSize(size);
    setDiscountError(null);
    try {
      const result = await createPaymentBatch(slotIds, effectiveBookingOwnerId, discountCode.trim() || undefined);
      setBatchPayment(result.payment);
      if (discountCode.trim() && result.payment.discountApplied) {
        toast.success(`Code ${result.payment.discountCode} applied`);
      }
      setDiscountCode('');
      await refreshState();
    } catch (err) {
      const messages: Record<string, string> = {
        discount_code_not_found: "That code isn't valid.",
        discount_code_already_used: 'That code has already been used.',
        discount_code_not_valid_for_batches: "That code can't be used on combined payments.",
      };
      const errorCode = (err as { body?: { error?: string } })?.body?.error;
      if (errorCode && messages[errorCode]) {
        setDiscountError(messages[errorCode]);
      } else {
        toast.error("Couldn't create the payment — try again.");
      }
    } finally {
      setCreatingBatchSize(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/slots/${cancelTarget.id}/cancel`, { method: 'POST' });
      if (!res.ok) { toast.error("Couldn't cancel that session — try again."); return; }
      toast.success('Session cancelled');
      await refreshState();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setBusy(false);
      setCancelTarget(null);
    }
  };

  const confirmMove = async (newSlotId: string) => {
    if (!moveTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/slots/${moveTarget.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSlotId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if ((data as { error?: string })?.error === 'new_slot_taken') {
          toast.error('That time was just taken — pick another.');
        } else {
          toast.error("Couldn't move that session — try again.");
        }
        return;
      }
      toast.success('Session moved');
      await refreshState();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setBusy(false);
      setMoveTarget(null);
    }
  };

  const handleSwitchAccount = () => { void signOut({ callbackUrl: '/' }); };

  const header = (
    <PageHeader>
      <Button variant="ghost" onClick={() => router.push('/student')} className="h-10">Book a session</Button>
      <Button variant="ghost" onClick={() => router.push('/account')} className="h-10">Account</Button>
      <Button variant="ghost" onClick={handleSwitchAccount} className="h-10">Switch account</Button>
    </PageHeader>
  );

  if (!hydrated || !state.dataLoaded) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
        {header}
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (!currentUser || currentUser.role !== 'parent') {
    return <div className="p-6">This page is for linked parents.</div>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      {header}

      <div className="mb-8 space-y-1">
        <p className="eyebrow">{bookingOwnerName}&apos;s sessions</p>
        <h1 className="font-display text-4xl text-foreground">Bookings &amp; payments</h1>
        {!linkedStudent && (
          <p className="text-sm text-muted-foreground">
            No student is linked to your account yet — sessions booked under your own account show up here.
          </p>
        )}
      </div>

      {eligibleOrdered.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-sm text-muted-foreground">Pay for upcoming sessions in a bundle:</p>
          <div className="flex gap-2">
            {BATCH_SIZES.map((size) => {
              const enough = eligibleOrdered.length >= size;
              return (
                <Button
                  key={size}
                  size="sm"
                  variant={enough ? 'default' : 'outline'}
                  disabled={!enough || creatingBatchSize !== null}
                  onClick={() => void handlePayBatch(size)}
                >
                  {creatingBatchSize === size ? 'Creating…' : `Pay ${size}`}
                </Button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              type="text"
              value={discountCode}
              onChange={(e) => { setDiscountCode(e.target.value); if (discountError) setDiscountError(null); }}
              placeholder="Discount code (optional)"
              className="h-9 flex-1 text-sm"
            />
          </div>
          {discountError && <p className="mt-1 text-xs text-destructive">{discountError}</p>}
        </div>
      )}

      {bookings.length === 0 ? (
        <EmptyState>No upcoming sessions booked yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {bookings.map((slot) => {
            const tutor = state.users[slot.tutorId];
            const isRevealed = revealedId === slot.id;
            const displayAmount = slot.amount ?? amountForSlot(slot.durationMinutes, slot.subject);
            return (
              <li key={slot.id} className="rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {formatDayLabel(slot.date)} · {slot.startTime}
                </p>
                <p className="text-xs text-muted-foreground">{tutor?.name ?? 'Tutor'}</p>
                {slot.subject && <p className="text-xs text-muted-foreground">{slot.subject}</p>}
                <p className="mt-1 text-xs">
                  {slot.paymentStatus === 'paid' ? (
                    <span className="text-success">Paid</span>
                  ) : slot.paymentBatchId ? (
                    <span className="text-muted-foreground">Included in a pending batch payment</span>
                  ) : (
                    <span className="text-warning">Unpaid</span>
                  )}
                </p>

                {slot.paymentStatus === 'unpaid' && !slot.paymentBatchId && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setRevealedId(isRevealed ? null : slot.id)}
                      className="text-xs font-medium text-[#16B8A7] hover:underline"
                    >
                      {isRevealed ? 'Hide payment details' : 'View payment details'}
                    </button>
                    {isRevealed && (
                      <div className="mt-2 space-y-1 rounded-md border border-border p-3 text-xs">
                        <p><span className="text-muted-foreground">Reference: </span>{referenceCodeForSlot(slot.id)}</p>
                        <p><span className="text-muted-foreground">Amount: </span>{displayAmount} PLN</p>
                        <p><span className="text-muted-foreground">Account holder: </span>{BANK_DETAILS.accountHolder}</p>
                        <p><span className="text-muted-foreground">IBAN: </span>{BANK_DETAILS.iban}</p>
                        <p><span className="text-muted-foreground">Bank: </span>{BANK_DETAILS.bankName}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMoveTarget(slot)}>Move</Button>
                  <Button variant="ghost" size="sm" onClick={() => setCancelTarget(slot)}>Cancel</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {batchPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h2 className="font-display text-2xl text-foreground">Payment created</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please transfer payment using the details below to cover the selected sessions.
            </p>
            {batchPayment.discountApplied && (
              <p className="mt-2 text-sm text-[#16B8A7]">Discount code {batchPayment.discountCode} applied!</p>
            )}
            <div className="mt-4 space-y-2 rounded-lg border border-border p-4 text-sm">
              <p><span className="text-muted-foreground">Reference: </span>{batchPayment.referenceCode}</p>
              <p><span className="text-muted-foreground">Amount: </span>{batchPayment.amount} {batchPayment.currency}</p>
              <p><span className="text-muted-foreground">Account holder: </span>{BANK_DETAILS.accountHolder}</p>
              <p><span className="text-muted-foreground">IBAN: </span>{BANK_DETAILS.iban}</p>
              <p><span className="text-muted-foreground">Bank: </span>{BANK_DETAILS.bankName}</p>
            </div>
            <Button className="mt-6 w-full" onClick={() => setBatchPayment(null)}>Done</Button>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-2xl text-foreground">Cancel this session?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDayLabel(cancelTarget.date)} at {cancelTarget.startTime} with {state.users[cancelTarget.tutorId]?.name ?? 'the tutor'}.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setCancelTarget(null)} disabled={busy}>
                Keep session
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void confirmCancel()}>
                {busy ? 'Cancelling…' : 'Cancel session'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-2xl text-foreground">Move this session</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Currently {formatDayLabel(moveTarget.date)} at {moveTarget.startTime} with {state.users[moveTarget.tutorId]?.name ?? 'the tutor'}.
            </p>
            {moveOptions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">This tutor has no other open slots right now.</p>
            ) : (
              <ul className="mt-4 max-h-48 space-y-1.5 overflow-y-auto">
                {moveOptions.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void confirmMove(opt.id)}
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:border-[#16B8A7] hover:text-[#16B8A7]"
                    >
                      {formatDayLabel(opt.date)} · {opt.startTime}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <Button variant="ghost" className="w-full" onClick={() => setMoveTarget(null)} disabled={busy}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
