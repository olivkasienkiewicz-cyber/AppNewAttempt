'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, MoreVertical } from 'lucide-react';
import { parse, addMinutes, format } from 'date-fns';
import { useAppState, setCurrentUser, type Slot } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function endTime(startTime: string, durationMinutes: number): string {
  const start = parse(startTime, 'HH:mm', new Date());
  return format(addMinutes(start, durationMinutes), 'HH:mm');
}

function dayHeader(isoDate: string): string {
  return format(parse(isoDate, 'yyyy-MM-dd', new Date()), 'EEE, d MMM');
}

export default function TutorHomePage() {
  const state = useAppState();
  const router = useRouter();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const groups = useMemo<Array<[string, Slot[]]>>(() => {
    if (!currentUser) return [];
    const mine = Object.values(state.slots)
      .filter((s) => s.tutorId === currentUser.id)
      .sort((a, b) =>
        a.date !== b.date
          ? a.date < b.date ? -1 : 1
          : a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0
      );
    const map = new Map<string, Slot[]>();
    for (const s of mine) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return Array.from(map.entries());
  }, [state.slots, currentUser]);

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

  const handleSwitchAccount = () => {
    setCurrentUser(null);
    router.push('/');
  };
  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Hi, {currentUser.name}</h1>
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent outline-none"
            >
              <MoreVertical className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push('/tutor/availability')}
                className="cursor-pointer"
              >
                Edit availability
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSwitchAccount}
                className="cursor-pointer"
              >
                Switch account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            You haven&apos;t published any slots yet. Start by editing your availability.
          </p>
          <Button onClick={() => router.push('/tutor/availability')}>
            Edit availability
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, slots]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                {dayHeader(date)}
              </h2>
              <ul className="space-y-2">
                {slots.map((slot) => {
                  const end = endTime(slot.startTime, slot.durationMinutes);
                  const booker = slot.bookedByStudentId
                    ? state.users[slot.bookedByStudentId]
                    : null;
                  return (
                    <li
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="font-mono text-sm">
                        {slot.startTime}–{end}
                      </span>
                      {slot.status === 'free' ? (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-700">
                          Free
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
                          Booked by {booker?.name ?? 'student'}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
