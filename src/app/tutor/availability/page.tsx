'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import {
  addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isBefore, isAfter, startOfToday,
} from 'date-fns';
import { toast } from 'sonner';
import { useAppState, createSlot, deleteSlot, refreshState, type Slot } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/brand/page-header';

const DEFAULT_DURATION = 60;
const DURATION_OPTIONS = [60, 90, 120];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) {
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return out;
})();

const toKey = (d: Date) => format(d, 'yyyy-MM-dd');

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function wouldOverlap(existing: Slot[], startTime: string, duration: number): boolean {
  const newStart = toMinutes(startTime);
  const newEnd = newStart + duration;
  return existing.some((s) => {
    const exStart = toMinutes(s.startTime);
    const exEnd = exStart + s.durationMinutes;
    return newStart < exEnd && exStart < newEnd;
  });
}

function startDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function hoursUntil(date: string, time: string): number {
  return (startDateTime(date, time).getTime() - Date.now()) / (1000 * 60 * 60);
}

export default function AvailabilityPage() {
  const hydrated = useHasHydrated();
  const state = useAppState();
  const router = useRouter();

  const today = useMemo(() => startOfToday(), []);
  const windowEnd = useMemo(() => addDays(today, 29), [today]);

  const [displayMonth, setDisplayMonth] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newSlotTime, setNewSlotTime] = useState<string>('');
  const [newSlotDuration, setNewSlotDuration] = useState<number>(DEFAULT_DURATION);

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [moveTarget, setMoveTarget] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    if (!currentUser) return map;
    for (const s of Object.values(state.slots)) {
      if (s.tutorId !== currentUser.id) continue;
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0);
    }
    return map;
  }, [state.slots, currentUser]);

  const moveOptions = useMemo<Slot[]>(() => {
    if (!moveTarget || !currentUser) return [];
    const now = new Date();
    return Object.values(state.slots)
      .filter((s) => s.tutorId === currentUser.id && s.status === 'free' && s.id !== moveTarget.id)
      .filter((s) => startDateTime(s.date, s.startTime).getTime() > now.getTime())
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  }, [moveTarget, currentUser, state.slots]);

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [displayMonth]);

  if (!hydrated) return <AvailabilitySkeleton />;

  if (!currentUser) {
    return (
      <div className="p-6">
        Not signed in. <Link href="/" className="text-foreground underline underline-offset-4">Go to start</Link>.
      </div>
    );
  }
  if (currentUser.role !== 'tutor') {
    return (
      <div className="p-6">
        This page is for tutors. <Link href="/" className="text-foreground underline underline-offset-4">Go back</Link>.
      </div>
    );
  }

  const canPrev = isAfter(startOfMonth(displayMonth), startOfMonth(today));
  const canNext = isBefore(startOfMonth(displayMonth), startOfMonth(windowEnd));
  const inWindow = (d: Date) => !isBefore(d, today) && !isAfter(d, windowEnd);
  const selectedKey = selectedDate ? toKey(selectedDate) : null;
  const selectedSlots = selectedKey ? (slotsByDate.get(selectedKey) ?? []) : [];
  const selectedIsToday = selectedDate ? isSameDay(selectedDate, today) : false;
  const nowHHMM = selectedIsToday ? format(new Date(), 'HH:mm') : null;
  const isPastTime = (t: string): boolean => nowHHMM !== null && t <= nowHHMM;

  const handleDayClick = (d: Date) => {
    if (!inWindow(d)) return;
    setSelectedDate(d);
    setNewSlotTime('');
    setNewSlotDuration(DEFAULT_DURATION);
  };

  const handleAddSlot = () => {
    if (!selectedDate || !newSlotTime) return;
    if (isPastTime(newSlotTime)) { toast.error('That time has already passed.'); return; }
    const dateKey = toKey(selectedDate);
    const existing = slotsByDate.get(dateKey) ?? [];
    if (wouldOverlap(existing, newSlotTime, newSlotDuration)) {
      toast.error('That overlaps with an existing slot on this day.');
      return;
    }
    createSlot({
      tutorId: currentUser.id,
      date: dateKey,
      startTime: newSlotTime,
      durationMinutes: newSlotDuration,
    });
    setNewSlotTime('');
    setNewSlotDuration(DEFAULT_DURATION);
    toast.success(`Added ${newSlotTime} (${newSlotDuration} min) on ${format(selectedDate, 'd MMM')}`);
  };

  const handleDeleteSlot = (slot: Slot) => {
    if (slot.status === 'booked') {
      setCancelTarget(slot);
      return;
    }
    deleteSlot(slot.id);
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

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.push('/tutor')}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Calendar</p>
        <h1 className="font-display text-4xl text-foreground">Edit availability</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month"
            disabled={!canPrev} onClick={() => setDisplayMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-medium tracking-tight">{format(displayMonth, 'MMMM yyyy')}</h2>
          <Button variant="ghost" size="icon" aria-label="Next month"
            disabled={!canNext} onClick={() => setDisplayMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {gridDays.map((d) => {
            const key = toKey(d);
            const count = slotsByDate.get(key)?.length ?? 0;
            const enabled = inWindow(d);
            const isToday = isSameDay(d, today);
            const dim = !isSameMonth(d, displayMonth);
            return (
              <button key={key} type="button" disabled={!enabled} onClick={() => handleDayClick(d)}
                aria-label={count > 0
                  ? `${format(d, 'd MMMM yyyy')}, ${count} slot${count === 1 ? '' : 's'}`
                  : format(d, 'd MMMM yyyy')}
                className={[
                  'group/day relative flex h-12 flex-col items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  enabled ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' : 'cursor-not-allowed text-muted-foreground/40',
                  dim ? 'opacity-50' : '',
                  isToday && enabled ? 'ring-1 ring-foreground' : '',
                ].join(' ')}>
                <span className="tabular-nums">{format(d, 'd')}</span>
                {count > 0 && (
                  <span aria-hidden className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-success" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {selectedDate ? format(selectedDate, 'EEEE, d MMMM') : ''}
            </DialogTitle>
          </DialogHeader>

          <div>
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots yet for this day.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedSlots.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {slot.startTime}–{minutesToTime(toMinutes(slot.startTime) + slot.durationMinutes)}
                      </span>
                      {slot.status === 'booked' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-accent-foreground">
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
                          Booked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {slot.status === 'booked' && (
                        <Button variant="ghost" size="icon" aria-label={`Move slot at ${slot.startTime}`}
                          onClick={() => setMoveTarget(slot)}>
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" aria-label={`Delete slot at ${slot.startTime}`}
                        onClick={() => handleDeleteSlot(slot)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Select value={newSlotTime} onValueChange={(v) => setNewSlotTime(v ?? '')}>
              <SelectTrigger className="min-w-[9rem] flex-1" aria-label="Start time">
                <SelectValue placeholder="Pick a start time" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t} disabled={isPastTime(t)}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(newSlotDuration)} onValueChange={(v) => setNewSlotDuration(Number(v))}>
              <SelectTrigger className="w-28" aria-label="Duration">
                <SelectValue>{(value: string) => `${value} min`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddSlot} disabled={!newSlotTime}>
              <Plus className="mr-1 h-4 w-4" /> Add slot
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-2xl text-foreground">Cancel this session?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {cancelTarget.date} at {cancelTarget.startTime} with {state.users[cancelTarget.bookedByStudentId ?? '']?.name ?? 'the student'}.
            </p>
            {hoursUntil(cancelTarget.date, cancelTarget.startTime) < 24 && (
              <p className="mt-3 text-sm text-warning">
                This is less than 24 hours away. Per our cancellation policy, the student may still be charged even though you&apos;re cancelling now.
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
              Currently {moveTarget.date} at {moveTarget.startTime} with {state.users[moveTarget.bookedByStudentId ?? '']?.name ?? 'the student'}.
            </p>
            {hoursUntil(moveTarget.date, moveTarget.startTime) < 24 && (
              <p className="mt-3 text-sm text-warning">
                This is less than 24 hours away. Per our cancellation policy, the student may still be charged even if you move it now.
              </p>
            )}
            {moveOptions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You don&apos;t have any other open slots to move this to yet.
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
                      {opt.date} · {opt.startTime}
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

function AvailabilitySkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <header className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-20" />
      </header>
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-72" />
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (<Skeleton key={`h-${i}`} className="h-5" />))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (<Skeleton key={i} className="h-12 rounded-md" />))}
        </div>
      </div>
    </main>
  );
}
