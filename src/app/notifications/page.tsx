'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

import {
  markAllRead,
  useAppState,
  type Notification,
} from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsPage() {
  const hydrated = useHasHydrated();
  const state = useAppState();
  const router = useRouter();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const notifications = useMemo<Notification[]>(() => {
    if (!currentUser) return [];
    return Object.values(state.notifications)
      .filter((n) => n.recipientUserId === currentUser.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [state.notifications, currentUser]);

  // Mark everything read as soon as the user lands here. Doing this in an effect
  // keeps it off the render path so we don't write during a render pass.
  useEffect(() => {
    if (!hydrated || !currentUser) return;
    markAllRead(currentUser.id);
  }, [hydrated, currentUser]);

  const homeHref =
    currentUser?.role === 'tutor'
      ? '/tutor'
      : currentUser?.role === 'student'
        ? '/student'
        : '/';

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back"
          onClick={() => router.push(homeHref)}
          className="h-11 w-11"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Button>
        <h1 className="text-xl font-semibold">Notifications</h1>
      </header>

      {!hydrated ? (
        <NotificationsSkeleton />
      ) : !currentUser ? (
        <p className="text-sm text-muted-foreground">
          Not signed in.{' '}
          <Link href="/" className="underline">
            Go to start
          </Link>
          .
        </p>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Notifications">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm"
            >
              <span
                aria-hidden
                className={
                  n.read
                    ? 'mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-transparent'
                    : 'mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary'
                }
              />
              <div className="flex-1">
                <p className="text-sm">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {relativeTime(n.createdAt)}
                  {!n.read && <span className="sr-only"> (unread)</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function NotificationsSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm"
        >
          <Skeleton className="mt-1.5 h-2 w-2 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}
