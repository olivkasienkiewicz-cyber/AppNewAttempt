'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import {
  bookSlot,
  setCurrentUser,
  useAppState,
  type Slot,
  type User,
} from '@/lib/store';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { BookingConfirmModal } from '@/components/student/booking-confirm-modal';

// ---------- helpers ----------

function isFutureSlot(slot: Slot, now = new Date()): boolean {
  const [y, m, d] = slot.date.split('-').map(Number);
  const [hh, mm] = slot.startTime.split(':').map(Number);
  const slotStart = new Date(y, m - 1, d, hh, mm);
  return slotStart.getTime() > now.getTime();
}

function formatDDMM(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

function formatWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
  });
}

// ---------- page ----------

export default function StudentBrowsePage() {
  const state = useAppState();
  const router = useRouter();

  const tutors = useMemo<User[]>(
    () =>
      Object.values(state.users)
        .filter((u) => u.role === 'tutor')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.users],
  );

  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  useEffect(() => {
    if (tutors.length === 0) {
      setSelectedTutorId(null);
      return;
    }
    if (!selectedTutorId || !tutors.some((t) => t.id === selectedTutorId)) {
      setSelectedTutorId(tutors[0].id);
    }
  }, [tutors, selectedTutorId]);

  const freeSlotsForTutor = useMemo<Slot[]>(() => {
    if (!selectedTutorId) return [];
    const now = new Date();
    return Object.values(state.slots)
      .filter(
        (s) =>
          s.tutorId === selectedTutorId &&
          s.status === 'free' &&
          isFutureSlot(s, now),
      )
      .sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date),
      );
  }, [state.slots, selectedTutorId]);

  const daysWithSlots = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const s of freeSlotsForTutor) set.add(s.date);
    return Array.from(set).sort();
  }, [freeSlotsForTutor]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  useEffect(() => {
    if (daysWithSlots.length === 0) {
      setSelectedDay(null);
      return;
    }
    if (!selectedDay || !daysWithSlots.includes(selectedDay)) {
      setSelectedDay(daysWithSlots[0]);
    }
  }, [daysWithSlots, selectedDay]);

  const currentDayIndex = selectedDay ? daysWithSlots.indexOf(selectedDay) : -1;
  const canGoPrev = currentDayIndex > 0;
  const canGoNext =
    currentDayIndex >= 0 && currentDayIndex < daysWithSlots.length - 1;

  const goPrev = () => {
    if (canGoPrev) setSelectedDay(daysWithSlots[currentDayIndex - 1]);
  };
  const goNext = () => {
    if (canGoNext) setSelectedDay(daysWithSlots[currentDayIndex + 1]);
  };

  const slotsOnDay = useMemo<Slot[]>(
    () =>
      selectedDay ? freeSlotsForTutor.filter((s) => s.date === selectedDay) : [],
    [freeSlotsForTutor, selectedDay],
  );

  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const selectedTutor = selectedTutorId ? state.users[selectedTutorId] : undefined;

  const handleConfirm = () => {
    if (!pendingSlot) return;
    if (!state.currentUserId) {
      toast.error('You need to be signed in to book a slot.');
      setPendingSlot(null);
      return;
    }
    const result = bookSlot(pendingSlot.id, state.currentUserId);
    if ('error' in result && result.error === 'slot_taken') {
      toast.error('That slot was just taken');
    } else {
      toast.success('Booking confirmed');
    }
    setPendingSlot(null);
  };

  const handleSwitchAccount = () => {
    setCurrentUser(null);
    router.push('/');
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Browse slots</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => router.push('/notifications')}
            className="h-11 w-11"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleSwitchAccount}
            className="h-11"
          >
            Switch account
          </Button>
        </div>
      </header>

      {tutors.length === 0 ? (
        <EmptyState>
          No tutors have joined yet. Switch to a tutor account to publish slots.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6">
            {tutors.length === 1 ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Tutor: </span>
                <span className="font-medium">{tutors[0].name}</span>
              </p>
            ) : (
              <label className="block">
                <span className="mb-1 block text-sm text-muted-foreground">
                  Tutor
                </span>
 <Select
  value={selectedTutorId ?? undefined}
  onValueChange={setSelectedTutorId}
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Choose a tutor">
      {selectedTutor?.name ?? 'Choose a tutor'}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    {tutors.map((t) => (
      <SelectItem key={t.id} value={t.id}>
        {t.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
              </label>
            )}
          </div>

          {selectedDay && (
            <div className="mb-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous day with free slots"
                disabled={!canGoPrev}
                onClick={goPrev}
                className="h-11 w-11"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </Button>
              <div className="text-center">
                <div className="text-2xl font-semibold tabular-nums">
                  {formatDDMM(selectedDay)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatWeekday(selectedDay)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next day with free slots"
                disabled={!canGoNext}
                onClick={goNext}
                className="h-11 w-11"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          )}

          {selectedDay && slotsOnDay.length === 0 ? (
            <EmptyState>No free slots on this day.</EmptyState>
          ) : !selectedDay ? (
            <EmptyState>No upcoming slots from this tutor.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {slotsOnDay.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setPendingSlot(slot)}
                  className="flex h-16 items-center justify-center rounded-lg border bg-card text-base font-medium shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <BookingConfirmModal
        open={pendingSlot !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSlot(null);
        }}
        tutorName={selectedTutor?.name ?? ''}
        slot={pendingSlot}
        onConfirm={handleConfirm}
      />
    </main>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}