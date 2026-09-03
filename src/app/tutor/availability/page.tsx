'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight, X } from 'lucide-react';
import {
  addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isBefore, isAfter, startOfToday,
} from 'date-fns';
import { toast } from 'sonner';
import {
  useAppState, createSlot, deleteSlot, refreshState, createRecurringBookingForStudent,
  createAvailabilityWindow, deleteAvailabilityWindow, type Slot, type AvailabilityWindow,
} from '@/lib/store';
import { subjectDisplayLabel } from '@/lib/subjects';
import { TIMEZONE_OPTIONS, CANONICAL_TIMEZONE, convertWallTime, detectBrowserTimezone } from '@/lib/timezones';
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
const RECURRING_WEEKS = 12;
const MAX_STUDENT_RESULTS = 8;

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

// A new window only needs to avoid BOOKED slots (a real committed session)
// and other windows — a free, unbooked fixed slot sitting underneath is
// harmless, since those are being phased out in favor of windows anyway.
function wouldWindowOverlap(
  bookedSlots: Slot[],
  existingWindows: AvailabilityWindow[],
  startTime: string,
  endTime: string
): boolean {
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);
  const overlapsSlot = bookedSlots.some((s) => {
    const exStart = toMinutes(s.startTime);
    const exEnd = exStart + s.durationMinutes;
    return newStart < exEnd && exStart < newEnd;
  });
  const overlapsWindow = existingWindows.some((w) => {
    const exStart = toMinutes(w.startTime);
    const exEnd = toMinutes(w.endTime);
    return newStart < exEnd && exStart < newEnd;
  });
  return overlapsSlot || overlapsWindow;
}

function startDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function hoursUntil(date: string, time: string): number {
  return (startDateTime(date, time).getTime() - Date.now()) / (1000 * 60 * 60);
}

type EntryMode = 'window' | 'slot';

export default function AvailabilityPage() {
  const hydrated = useHasHydrated();
  const state = useAppState();
  const router = useRouter();

  const today = useMemo(() => startOfToday(), []);
  const windowEnd = useMemo(() => addDays(today, 29), [today]);

  const [displayMonth, setDisplayMonth] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [entryMode, setEntryMode] = useState<EntryMode>('window');
  const [newSlotTime, setNewSlotTime] = useState<string>('');
  const [newSlotDuration, setNewSlotDuration] = useState<number>(DEFAULT_DURATION);
  const [newWindowStart, setNewWindowStart] = useState<string>('');
  const [newWindowEnd, setNewWindowEnd] = useState<string>('');
  const [entryTimezone, setEntryTimezone] = useState<string>(CANONICAL_TIMEZONE);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [adding, setAdding] = useState(false);

  const [assignToStudent, setAssignToStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [moveTarget, setMoveTarget] = useState<Slot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Slot | null>(null);
  const [deleteWindowTarget, setDeleteWindowTarget] = useState<AvailabilityWindow | null>(null);
  const [busy, setBusy] = useState(false);

  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const subjectOptions = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.subjects.map((s) => subjectDisplayLabel(s));
  }, [currentUser]);

  const matchingStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (q.length === 0) return [];
    return Object.values(state.users)
      .filter((u) => u.role === 'student' && u.name.toLowerCase().includes(q))
      .slice(0, MAX_STUDENT_RESULTS);
  }, [state.users, studentSearch]);

  const selectedStudent = selectedStudentId ? state.users[selectedStudentId] : null;

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

  const windowsByDate = useMemo(() => {
    const map = new Map<string, AvailabilityWindow[]>();
    if (!currentUser) return map;
    for (const w of Object.values(state.availabilityWindows)) {
      if (w.tutorId !== currentUser.id) continue;
      if (!map.has(w.date)) map.set(w.date, []);
      map.get(w.date)!.push(w);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0);
    }
    return map;
  }, [state.availabilityWindows, currentUser]);

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
  const selectedWindows = selectedKey ? (windowsByDate.get(selectedKey) ?? []) : [];

  const endTimeOptions = newWindowStart
    ? TIME_OPTIONS.filter((t) => toMinutes(t) > toMinutes(newWindowStart))
    : TIME_OPTIONS;

  const resetAddForm = () => {
    setNewSlotTime('');
    setNewSlotDuration(DEFAULT_DURATION);
    setNewWindowStart('');
    setNewWindowEnd('');
    setEntryTimezone(CANONICAL_TIMEZONE);
    setRepeatWeekly(false);
    setAssignToStudent(false);
    setStudentSearch('');
    setSelectedStudentId(null);
    setSelectedSubject(undefined);
    setEntryMode('window');
  };

  const handleDayClick = (d: Date) => {
    if (!inWindow(d)) return;
    setSelectedDate(d);
    resetAddForm();
  };

  const handleAddWindow = async () => {
    if (!selectedDate || !newWindowStart || !newWindowEnd) return;
    const dateKey = toKey(selectedDate);

    const startConverted = convertWallTime(dateKey, newWindowStart, entryTimezone, CANONICAL_TIMEZONE);
    const endConverted = convertWallTime(dateKey, newWindowEnd, entryTimezone, CANONICAL_TIMEZONE);

    if (startConverted.date !== endConverted.date) {
      toast.error("Windows can't cross midnight — pick an end time on the same day.");
      return;
    }
    if (startDateTime(startConverted.date, startConverted.time).getTime() <= Date.now()) {
      toast.error('That start time has already passed in Poland time.');
      return;
    }
    if (toMinutes(endConverted.time) <= toMinutes(startConverted.time)) {
      toast.error('End time must be after start time.');
      return;
    }

    const dayBookedSlots = (slotsByDate.get(startConverted.date) ?? []).filter((s) => s.status === 'booked');
    const dayWindows = windowsByDate.get(startConverted.date) ?? [];
    if (wouldWindowOverlap(dayBookedSlots, dayWindows, startConverted.time, endConverted.time)) {
      toast.error('That overlaps with a booked session or another window on this day (Poland time).');
      return;
    }

    setAdding(true);
    try {
      await createAvailabilityWindow({
        tutorId: currentUser.id,
        date: startConverted.date,
        startTime: startConverted.time,
        endTime: endConverted.time,
      });
      toast.success(`Added ${startConverted.time}–${endConverted.time} (Poland time) as open availability`);
      resetAddForm();
    } catch {
      toast.error("Couldn't add that window — try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleAddSlot = async () => {
    if (!selectedDate || !newSlotTime) return;
    const dateKey = toKey(selectedDate);

    // The date/time chosen in the dialog are wall-clock values in
    // `entryTimezone` — convert to Poland time before any validation or
    // submission, since that's what's actually stored and compared.
    const { date: warsawDate, time: warsawTime } = convertWallTime(
      dateKey, newSlotTime, entryTimezone, CANONICAL_TIMEZONE
    );

    if (startDateTime(warsawDate, warsawTime).getTime() <= Date.now()) {
      toast.error('That time has already passed in Poland time.');
      return;
    }
    if (assignToStudent && !selectedStudentId) { toast.error('Pick a student first.'); return; }

    const existing = slotsByDate.get(warsawDate) ?? [];
    if (wouldOverlap(existing, warsawTime, newSlotDuration)) {
      toast.error('That overlaps with an existing slot on this day (Poland time).');
      return;
    }

    setAdding(true);
    try {
      if (assignToStudent && selectedStudentId) {
        const result = await createRecurringBookingForStudent({
          studentId: selectedStudentId,
          date: warsawDate,
          startTime: warsawTime,
          durationMinutes: newSlotDuration,
          subject: selectedSubject ?? null,
          repeatWeekly,
        });
        const skipped = result.skippedDates.length;
        const madeCount = result.created.length;
        const studentName = selectedStudent?.name ?? 'the student';
        if (skipped > 0) {
          toast.success(`Booked ${madeCount} session${madeCount === 1 ? '' : 's'} with ${studentName} — skipped ${skipped} date${skipped === 1 ? '' : 's'} due to a conflict.`);
        } else if (repeatWeekly) {
          toast.success(`Booked ${madeCount} weekly sessions with ${studentName}`);
        } else {
          toast.success(`Booked a session with ${studentName} on ${warsawDate}`);
        }
      } else {
        const result = await createSlot(
          {
            tutorId: currentUser.id,
            date: warsawDate,
            startTime: warsawTime,
            durationMinutes: newSlotDuration,
          },
          { repeatWeekly }
        );
        if ('created' in result) {
          const skipped = result.skippedDates.length;
          const madeCount = result.created.length;
          if (skipped > 0) {
            toast.success(`Added ${madeCount} weekly slot${madeCount === 1 ? '' : 's'} — skipped ${skipped} date${skipped === 1 ? '' : 's'} that already had a slot.`);
          } else {
            toast.success(`Added ${warsawTime} (Poland time) weekly for ${RECURRING_WEEKS} weeks`);
          }
        } else {
          toast.success(`Added ${warsawTime} (Poland time), ${newSlotDuration} min, on ${warsawDate}`);
        }
      }
      resetAddForm();
    } catch {
      toast.error("Couldn't add that slot — try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = (slot: Slot) => {
    if (slot.status === 'booked') {
      setCancelTarget(slot);
      return;
    }
    if (slot.recurrenceId) {
      setDeleteTarget(slot);
      return;
    }
    void deleteSlot(slot.id, 'only');
  };

  const confirmDelete = async (scope: 'only' | 'all_future') => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteSlot(deleteTarget.id, scope);
      toast.success(scope === 'all_future' ? 'Deleted this and all future occurrences' : 'Deleted that slot');
    } catch {
      toast.error("Couldn't delete that slot — try again.");
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  };

  const confirmDeleteWindow = async () => {
    if (!deleteWindowTarget) return;
    setBusy(true);
    try {
      await deleteAvailabilityWindow(deleteWindowTarget.id);
      toast.success('Removed that window');
    } catch {
      toast.error("Couldn't remove that window — try again.");
    } finally {
      setBusy(false);
      setDeleteWindowTarget(null);
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
        <Button variant="ghost" size="sm" className="h-11 px-3" onClick={() => router.push('/tutor')}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Calendar</p>
        <h1 className="font-display text-4xl text-foreground">Edit availability</h1>
        <p className="text-xs text-muted-foreground">All times are stored and shown to students in Poland time. Use the timezone picker below only if you're entering a time from somewhere else.</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Previous month"
            disabled={!canPrev} onClick={() => setDisplayMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-medium tracking-tight">{format(displayMonth, 'MMMM yyyy')}</h2>
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Next month"
            disabled={!canNext} onClick={() => setDisplayMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-5 w-5" />
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
            const slotCount = slotsByDate.get(key)?.length ?? 0;
            const windowCount = windowsByDate.get(key)?.length ?? 0;
            const count = slotCount + windowCount;
            const enabled = inWindow(d);
            const isToday = isSameDay(d, today);
            const dim = !isSameMonth(d, displayMonth);
            return (
              <button key={key} type="button" disabled={!enabled} onClick={() => handleDayClick(d)}
                aria-label={count > 0
                  ? `${format(d, 'd MMMM yyyy')}, ${count} entr${count === 1 ? 'y' : 'ies'}`
                  : format(d, 'd MMMM yyyy')}
                className={[
                  'group/day relative flex h-12 min-h-[44px] flex-col items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
            {selectedWindows.length === 0 && selectedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing set for this day yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedWindows.map((w) => (
                  <li key={`w-${w.id}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {w.startTime}–{w.endTime}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#16B8A7]/30 bg-[#16B8A7]/10 px-2 py-0.5 text-xs text-[#16B8A7]">
                        Open window
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Remove window ${w.startTime}–${w.endTime}`}
                      onClick={() => setDeleteWindowTarget(w)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </li>
                ))}
                {selectedSlots.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
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
                      {slot.recurrenceId && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          Weekly
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {slot.status === 'booked' && (
                        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Move slot at ${slot.startTime}`}
                          onClick={() => setMoveTarget(slot)}>
                          <ArrowLeftRight className="h-5 w-5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Delete slot at ${slot.startTime}`}
                        onClick={() => handleDeleteSlot(slot)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {!assignToStudent && (
              <div className="flex rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => setEntryMode('window')}
                  className={[
                    'h-11 flex-1 rounded-md text-sm font-medium transition-colors',
                    entryMode === 'window' ? 'bg-[#16B8A7] text-white' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  Open window
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('slot')}
                  className={[
                    'h-11 flex-1 rounded-md text-sm font-medium transition-colors',
                    entryMode === 'slot' ? 'bg-[#16B8A7] text-white' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  Exact slot
                </button>
              </div>
            )}

            {entryMode === 'window' && !assignToStudent ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Give a block of time you're free — students will pick a 60/90/120 min session inside it themselves.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={newWindowStart} onValueChange={(v) => setNewWindowStart(v ?? '')}>
                    <SelectTrigger className="h-11 min-w-[9rem] flex-1" aria-label="Window start time">
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newWindowEnd} onValueChange={(v) => setNewWindowEnd(v ?? '')}>
                    <SelectTrigger className="h-11 min-w-[9rem] flex-1" aria-label="Window end time">
                      <SelectValue placeholder="End time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {endTimeOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Entering this time in</label>
                  <Select value={entryTimezone} onValueChange={(v) => setEntryTimezone(v ?? CANONICAL_TIMEZONE)}>
                    <SelectTrigger className="h-11 w-full" aria-label="Timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => void handleAddWindow()} disabled={!newWindowStart || !newWindowEnd || adding} className="h-12 w-full text-base">
                  <Plus className="mr-1 h-5 w-5" /> {adding ? 'Adding…' : 'Add window'}
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={newSlotTime} onValueChange={(v) => setNewSlotTime(v ?? '')}>
                    <SelectTrigger className="h-11 min-w-[9rem] flex-1" aria-label="Start time">
                      <SelectValue placeholder="Pick a start time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(newSlotDuration)} onValueChange={(v) => setNewSlotDuration(Number(v))}>
                    <SelectTrigger className="h-11 w-28" aria-label="Duration">
                      <SelectValue>{(value: string) => `${value} min`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Entering this time in</label>
                  <Select value={entryTimezone} onValueChange={(v) => setEntryTimezone(v ?? CANONICAL_TIMEZONE)}>
                    <SelectTrigger className="h-11 w-full" aria-label="Timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {entryTimezone !== CANONICAL_TIMEZONE && newSlotTime && selectedDate && (
                    <p className="text-xs text-muted-foreground">
                      That's {(() => {
                        const c = convertWallTime(toKey(selectedDate), newSlotTime, entryTimezone, CANONICAL_TIMEZONE);
                        return `${c.time} on ${c.date}`;
                      })()} in Poland time.
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={repeatWeekly}
                    onChange={(e) => setRepeatWeekly(e.target.checked)}
                    className="h-5 w-5 rounded border-border"
                  />
                  Repeat weekly for {RECURRING_WEEKS} weeks
                </label>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={assignToStudent}
                    onChange={(e) => {
                      setAssignToStudent(e.target.checked);
                      if (!e.target.checked) {
                        setStudentSearch('');
                        setSelectedStudentId(null);
                        setSelectedSubject(undefined);
                      }
                    }}
                    className="h-5 w-5 rounded border-border"
                  />
                  Assign to a specific student
                </label>

                {assignToStudent && (
                  <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                    {selectedStudent ? (
                      <div className="flex items-center justify-between rounded-md bg-accent px-3 py-2 text-sm">
                        <span className="font-medium text-foreground">{selectedStudent.name}</span>
                        <button
                          type="button"
                          onClick={() => { setSelectedStudentId(null); setStudentSearch(''); }}
                          aria-label="Clear selected student"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Search students by name…"
                          className="h-11 rounded-md border border-border bg-background px-2.5 text-sm"
                        />
                        {matchingStudents.length > 0 && (
                          <ul className="max-h-32 space-y-1 overflow-y-auto">
                            {matchingStudents.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedStudentId(s.id); setStudentSearch(''); }}
                                  className="w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"
                                >
                                  {s.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}

                    {subjectOptions.length > 0 && (
                      <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject(v ?? undefined)}>
                        <SelectTrigger className="h-11 w-full" aria-label="Subject">
                          <SelectValue placeholder="Subject (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectOptions.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This books the session directly — the student won&apos;t need to reserve it themselves. They&apos;ll choose how to pay afterward.
                    </p>
                  </div>
                )}

                <Button onClick={() => void handleAddSlot()} disabled={!newSlotTime || adding} className="h-12 w-full text-base">
                  <Plus className="mr-1 h-5 w-5" /> {adding ? 'Adding…' : 'Add slot'}
                </Button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setSelectedDate(null)}>Done</Button>
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
              <Button variant="ghost" className="h-11 flex-1" onClick={() => setCancelTarget(null)} disabled={busy}>
                Keep session
              </Button>
              <Button variant="outline" className="h-11 flex-1" disabled={busy} onClick={() => void confirmCancel()}>
                {busy ? 'Cancelling…' : 'Cancel session'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-2xl text-foreground">Delete this slot?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {deleteTarget.date} at {deleteTarget.startTime} is part of a weekly series.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="outline" className="h-11" disabled={busy} onClick={() => void confirmDelete('only')}>
                {busy ? 'Deleting…' : 'Delete just this one'}
              </Button>
              <Button variant="outline" className="h-11" disabled={busy} onClick={() => void confirmDelete('all_future')}>
                {busy ? 'Deleting…' : 'Delete this and all future occurrences'}
              </Button>
              <Button variant="ghost" className="h-11" disabled={busy} onClick={() => setDeleteTarget(null)}>
                Keep it
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteWindowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-2xl text-foreground">Remove this window?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {deleteWindowTarget.date}, {deleteWindowTarget.startTime}–{deleteWindowTarget.endTime}. Students won&apos;t be able to book new sessions in this range anymore.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="ghost" className="h-11 flex-1" onClick={() => setDeleteWindowTarget(null)} disabled={busy}>
                Keep it
              </Button>
              <Button variant="outline" className="h-11 flex-1" disabled={busy} onClick={() => void confirmDeleteWindow()}>
                {busy ? 'Removing…' : 'Remove window'}
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
                      className="w-full rounded-md border border-border px-3 py-2.5 text-left text-sm hover:border-[#16B8A7] hover:text-[#16B8A7]"
                    >
                      {opt.date} · {opt.startTime}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <Button variant="ghost" className="h-11 w-full" onClick={() => setMoveTarget(null)} disabled={busy}>
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
