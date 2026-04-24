'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
  startOfToday,
} from 'date-fns';
import { toast } from 'sonner';
import { useAppState, createSlot, deleteSlot, type Slot } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_DURATION = 60;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

const toKey = (d: Date) => format(d, 'yyyy-MM-dd');

export default function AvailabilityPage() {
  const state = useAppState();
  const router = useRouter();

  const today = useMemo(() => startOfToday(), []);
  const windowEnd = useMemo(() => addDays(today, 29), [today]);

  const [displayMonth, setDisplayMonth] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newSlotTime, setNewSlotTime] = useState<string>('');

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
      arr.sort((a, b) =>
        a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0
      );
    }
    return map;
  }, [state.slots, currentUser]);

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [displayMonth]);

  if (!currentUser) {
    return (
      <div className="p-6">
        Not signed in. <Link href="/" className="underline">Go to start</Link>.
      </div>
    );
  }
  if (currentUser.role !== 'tutor') {
    return (
      <div className="p-6">
        This page is for tutors. <Link href="/" className="underline">Go back</Link>.
      </div>
    );
  }

  const canPrev = isAfter(startOfMonth(displayMonth), startOfMonth(today));
  const canNext = isBefore(startOfMonth(displayMonth), startOfMonth(windowEnd));

  const inWindow = (d: Date) => !isBefore(d, today) && !isAfter(d, windowEnd);

  const selectedKey = selectedDate ? toKey(selectedDate) : null;
  const selectedSlots = selectedKey ? (slotsByDate.get(selectedKey) ?? []) : [];

  const handleDayClick = (d: Date) => {
    if (!inWindow(d)) return;
    setSelectedDate(d);
    setNewSlotTime('');
  };

  const handleAddSlot = () => {
    if (!selectedDate || !newSlotTime) return;
    const dateKey = toKey(selectedDate);
    const existing = slotsByDate.get(dateKey) ?? [];
    if (existing.some((s) => s.startTime === newSlotTime)) {
      toast.error('That time already has a slot.');
      return;
    }
    createSlot({
      tutorId: currentUser.id,
      date: dateKey,
      startTime: newSlotTime,
      durationMinutes: DEFAULT_DURATION,
    });
    setNewSlotTime('');
    toast.success(`Added ${newSlotTime} on ${format(selectedDate, 'd MMM')}`);
  };

  const handleDeleteSlot = (slot: Slot) => {
    if (slot.status === 'booked') {
      toast.error('Cancel the booking first — feature coming soon');
      return;
    }
    deleteSlot(slot.id);
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tutor')}>
          ← Back
        </Button>
        <h1 className="text-xl font-semibold">Edit availability</h1>
      </header>

      <div className="rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            disabled={!canPrev}
            onClick={() => setDisplayMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-medium">{format(displayMonth, 'MMMM yyyy')}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            disabled={!canNext}
            onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">{d}</div>
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
              <button
                key={key}
                type="button"
                disabled={!enabled}
                onClick={() => handleDayClick(d)}
                aria-label={format(d, 'd MMMM yyyy')}
                className={[
                  'relative flex h-12 flex-col items-center justify-center rounded-md text-sm',
                  enabled
                    ? 'hover:bg-accent cursor-pointer'
                    : 'cursor-not-allowed text-muted-foreground/40',
                  dim ? 'opacity-50' : '',
                  isToday && enabled ? 'ring-1 ring-primary' : '',
                ].join(' ')}
              >
                <span>{format(d, 'd')}</span>
                {count > 0 && (
                  <span
                    aria-label={`${count} slot${count === 1 ? '' : 's'}`}
                    className="absolute bottom-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!selectedDate}
        onOpenChange={(open) => { if (!open) setSelectedDate(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? format(selectedDate, 'EEEE, d MMMM') : ''}
            </DialogTitle>
          </DialogHeader>

          <div>
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots yet for this day.</p>
            ) : (
              <ul className="space-y-2">
                {selectedSlots.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{slot.startTime}</span>
                      {slot.status === 'booked' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          Booked
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete slot at ${slot.startTime}`}
                      onClick={() => handleDeleteSlot(slot)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Select value={newSlotTime} onValueChange={(v) => setNewSlotTime(v ?? '')}>
              <SelectTrigger className="flex-1" aria-label="Start time">
                <SelectValue placeholder="Pick a start time" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddSlot} disabled={!newSlotTime}>
              <Plus className="mr-1 h-4 w-4" /> Add slot
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}