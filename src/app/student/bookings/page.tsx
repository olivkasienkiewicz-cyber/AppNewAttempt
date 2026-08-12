'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, refreshState, type Slot } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';
import { SlotRequestModal } from '@/components/SlotRequestModal';

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function startDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
function hoursUntil(date: string, time: string): number {
  return (startDateTime(date, time).getTime() - Date.now()) / (1000 * 60 * 60);
}
function formatDayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function StudentBookingsPage() {
  const hydrated = useHasHydrated();
  const state = useAppState();
  const router = useRouter();

  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const myBookings = useMemo<Slot[]>(() => {
    if (!currentUser) return [];
    const now = new Date();
    return Object.values(state.slots)
      .filter((s) => s.status === 'booked' && s.bookedByStudentId === currentUser.id)
      .filter((s) => startDateTime(s.date, s.startTime).getTime() > now.getTime())
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  }, [state.slots, currentUser]);

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [moveTarget, setMoveTarget] = useState<Slot | null>(null);
  const [proposeModalTutorId, setProposeModalTutorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const moveOptions = useMemo<Slot[]>(() => {
    if (!moveTarget) return [];
    const now = new Date();
    return Object.values(state.slots)
      .filter((s) => s.tutorId === moveTarget.tutorId && s.status === 'free' && s.id !== moveTarget.id)
      .filter((s) => startDateTime(s.date, s.startTime).getTime() > now.getTime())
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  }, [moveTarget, state.slots]);

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
        if (data?.error === 'new_slot_taken') {
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
        <Button variant="ghost" size="sm" onClick={() => router.push('/student')}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Your sessions</p>
        <h1 className="font-display text-4xl text-foreground">My bookings</h1>
      </div>

      {myBookings.length === 0 ? (
        <EmptyState>You don&apos;t have any upcoming sessions booked yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {myBookings.map((slot) => {
            const tutor = state.users[slot.tutorId];
            const withinDay = hoursUntil(slot.date, slot.startTime) < 24;
            return (
              <li key={slot.id} className="rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {formatDayLabel(slot.date)} · {slot.startTime}–{minutesToTime(toMinutes(slot.startTime) + slot.durationMinutes)}
                </p>
                <p className="text-xs text-muted-foreground">{tutor?.name ?? 'Tutor'}</p>
                {withinDay && (
                  <p className="mt-2 text-xs text-warning">
                    Less than 24 hours away — cancelling or moving now may still require payment per our policy.
                  </p>
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

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-2xl text-foreground">Cancel this session?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDayLabel(cancelTarget.date)} at {cancelTarget.startTime} with {state.users[cancelTarget.tutorId]?.name ?? 'your tutor'}.
            </p>
            {hoursUntil(cancelTarget.date, cancelTarget.startTime) < 24 && (
              <p className="mt-3 text-sm text-warning">
                This is less than 24 hours away. Per our cancellation policy, you may still be charged for this session even though you&apos;re cancelling now.
              </p>
            )}
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
              Currently {formatDayLabel(moveTarget.date)} at {moveTarget.startTime} with {state.users[moveTarget.tutorId]?.name ?? 'your tutor'}.
            </p>
            {hoursUntil(moveTarget.date, moveTarget.startTime) < 24 && (
              <p className="mt-3 text-sm text-warning">
                This is less than 24 hours away. Per our cancellation policy, you may still be charged even if you move it now.
              </p>
            )}

            {moveOptions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                This tutor has no other open slots right now.
              </p>
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

            <button
              type="button"
              onClick={() => { setProposeModalTutorId(moveTarget.tutorId); setMoveTarget(null); }}
              className="mt-4 text-sm font-medium text-[#16B8A7] hover:underline"
            >
              None of these work — propose a different time
            </button>

            <div className="mt-6">
              <Button variant="ghost" className="w-full" onClick={() => setMoveTarget(null)} disabled={busy}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {proposeModalTutorId && (
        <SlotRequestModal
          open={!!proposeModalTutorId}
          onOpenChange={(open) => { if (!open) setProposeModalTutorId(null); }}
          tutorId={proposeModalTutorId}
        />
      )}
    </main>
  );
}
