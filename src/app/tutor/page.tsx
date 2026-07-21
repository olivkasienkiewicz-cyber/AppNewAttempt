'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Bell, MoreVertical, Link2, Pencil } from 'lucide-react';
import { parse, addMinutes, format } from 'date-fns';
import { toast } from 'sonner';
import { useAppState, setMeetingUrl, type Slot } from '@/lib/store';
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

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const startEditing = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setDraftUrl(slot.meetingUrl ?? '');
  };
  const cancelEditing = () => {
    setEditingSlotId(null);
    setDraftUrl('');
  };
  const saveMeetingUrl = async (slotId: string) => {
    setSaving(true);
    try {
      await setMeetingUrl(slotId, draftUrl.trim() || null);
      toast.success('Meeting link saved');
      cancelEditing();
    } catch {
      toast.error("Couldn't save the meeting link — check the URL and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || !state.dataLoaded) return <TutorHomeSkeleton />;
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
  const handleSwitchAccount = () => { void signOut({ callbackUrl: '/' }); };
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
                  const isEditing = editingSlotId === slot.id;
                  return (
                    <li key={slot.id} className="rounded-lg border border-border px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          {slot.startTime}–{end}
                        </span>
                        {slot.status === 'free' ? (
                          <StatusPill tone="neutral">Free</StatusPill>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <StatusPill tone="booked">Booked · {booker?.name ?? 'student'}</StatusPill>
                            <StatusPill tone={slot.paymentStatus === 'paid' ? 'paid' : 'unpaid'}>
                              {slot.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                            </StatusPill>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="url"
                            autoFocus
                            value={draftUrl}
                            onChange={(e) => setDraftUrl(e.target.value)}
                            placeholder="https://meet.google.com/..."
                            className="h-9 flex-1 rounded-md border border-border bg-background px-2.5 text-sm"
                          />
                          <Button size="sm" disabled={saving} onClick={() => void saveMeetingUrl(slot.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {slot.meetingUrl ? (
                            
                              href={slot.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-foreground underline underline-offset-4"
                            >
                              <Link2 className="h-3 w-3" /> Meeting link
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No meeting link yet</span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditing(slot)}
                            aria-label="Edit meeting link"
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
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
function StatusPill({ tone, children }: { tone: 'neutral' | 'booked' | 'paid' | 'unpaid'; children: React.ReactNode }) {
  const styles = {
    booked: 'bg-success-soft text-accent-foreground',
    paid: 'bg-success-soft text-accent-foreground',
    unpaid: 'bg-warning-soft text-accent-foreground',
    neutral: 'border border-border text-muted-foreground',
  } as const;
  const dot = {
    booked: 'bg-success',
    paid: 'bg-success',
    unpaid: 'bg-warning',
    neutral: 'bg-muted-foreground/50',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === 'neutral' ? '' : styles[tone]} ${tone === 'neutral' ? styles.neutral : ''}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
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
