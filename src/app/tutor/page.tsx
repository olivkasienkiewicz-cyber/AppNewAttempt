'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, MoreVertical } from 'lucide-react';
import { parse, addMinutes, format } from 'date-fns';
import { useAppState, setCurrentUser, type Slot } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

function endTime(startTime: string, durationMinutes: number): string {
  const start = parse(startTime, 'HH:mm', new Date());
  return format(addMinutes(start, durationMinutes), 'HH:mm');
}
function dayHeader(isoDate: string): string {
  return format(parse(isoDate, 'yyyy-MM-dd', new Date()), 'EEE, d MMM');
}

export default function TutorHomePage() {
  const hydrated = useHasHydrated();
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

  if (!hydrated) return <TutorHomeSkeleton />;

  if (!currentUser) {
    return (
      <div className="p-6 space-y-4">
        <p>
          Not signed in. <Link href="/" className="text-foreground underline underline-offset-4">Go to start</Link>.
        </p>
        <div className="rounded-md border border-border bg-muted p-3 text-xs space-y-3">
          <p className="font-medium">Temporary debug info (remove after fixing):</p>
          <p>
            page URL: {typeof window !== 'undefined' ? window.location.href : 'no window'}
          </p>
          <p>currentUserId: {JSON.stringify(state.currentUserId)}</p>
          <p>known user ids: {JSON.stringify(Object.keys(state.users))}</p>
          <p>raw stored value:</p>
          <pre className="whitespace-pre-wrap break-all">
            {typeof window !== 'undefined'
              ? window.localStorage.getItem('tutor_app_state_v1')
              : 'no window'}
          </pre>
          <LiveStorageTest />
        </div>
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

  const handleSwitchAccount = () => { setCurrentUser(null); router.push('/'); };

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Link href="/notifications" aria-label="Notifications"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Bell className="h-[18px] w-[18px]" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Account menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <MoreVertical className="h-[18px] w-[18px]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/tutor/availability')} className="cursor-pointer">
              Edit availability
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSwitchAccount} className="cursor-pointer">
              Switch account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Your week</p>
        <h1 className="font-display text-4xl text-foreground">Hi, {currentUser.name}.</h1>
      </div>

      {groups.length === 0 ? (
        <EmptyState>
          <p className="mb-4">
            You haven&apos;t published any slots yet. Start by setting your availability for the weeks ahead.
          </p>
          <Button onClick={() => router.push('/tutor/availability')}>Edit availability</Button>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {groups.map(([date, slots]) => (
            <section key={date}>
              <h2 className="eyebrow mb-3">{dayHeader(date)}</h2>
              <ul className="space-y-1.5">
                {slots.map((slot) => {
                  const end = endTime(slot.startTime, slot.durationMinutes);
                  const booker = slot.bookedByStudentId ? state.users[slot.bookedByStudentId] : null;
                  return (
                    <li key={slot.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {slot.startTime}–{end}
                      </span>
                      {slot.status === 'free' ? (
                        <StatusPill tone="neutral">Free</StatusPill>
                      ) : (
                        <StatusPill tone="booked">Booked · {booker?.name ?? 'student'}</StatusPill>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function LiveStorageTest() {
  const [result, setResult] = useState<string>('Not tested yet.');

  const runTest = () => {
    try {
      const testKey = 'tutor_app_debug_probe';
      const testValue = 'probe-' + Date.now();
      window.localStorage.setItem(testKey, testValue);
      const readBack = window.localStorage.getItem(testKey);
      if (readBack === testValue) {
        setResult('✅ Storage write+read worked: ' + readBack);
      } else {
        setResult('⚠️ Wrote "' + testValue + '" but read back "' + readBack + '"');
      }
    } catch (err) {
      setResult('❌ Threw an error: ' + String(err));
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Button size="sm" variant="outline" onClick={runTest}>Run live storage test</Button>
      <p>{result}</p>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: 'neutral' | 'booked'; children: React.ReactNode }) {
  return (
    <span className={
      tone === 'booked'
        ? 'inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-accent-foreground'
        : 'inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
    }>
      <span aria-hidden className={
        tone === 'booked' ? 'h-1.5 w-1.5 rounded-full bg-success' : 'h-1.5 w-1.5 rounded-full bg-muted-foreground/50'
      } />
      {children}
    </span>
  );
}

function TutorHomeSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <header className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <Skeleton className="h-6 w-28" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </header>
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <section key={i}>
            <Skeleton className="mb-3 h-3 w-28" />
            <div className="space-y-1.5">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
