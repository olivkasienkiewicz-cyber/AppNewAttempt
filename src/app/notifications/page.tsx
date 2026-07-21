'use client';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Link2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { markAllRead, useAppState, type Notification } from '@/lib/store';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';
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
  useEffect(() => {
    if (!hydrated || !state.dataLoaded || !currentUser) return;
    void markAllRead(currentUser.id).catch((err) => {
      console.error('Failed to mark notifications read:', err);
    });
  }, [hydrated, state.dataLoaded, currentUser]);
  const homeHref = currentUser?.role === 'tutor' ? '/tutor' : currentUser?.role === 'student' ? '/student' : '/';
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.push(homeHref)} aria-label="Back">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>
      <div className="mb-8 space-y-1">
        <p className="eyebrow">Inbox</p>
        <h1 className="font-display text-4xl text-foreground">Notifications</h1>
      </div>
      {!hydrated || !state.dataLoaded ? (
        <NotificationsSkeleton />
      ) : !currentUser ? (
        <p className="text-sm text-muted-foreground">
          Not signed in.{' '}
          <Link href="/" className="text-foreground underline underline-offset-4">Go to start</Link>.
        </p>
      ) : notifications.length === 0 ? (
        <EmptyState>No notifications yet.</EmptyState>
      ) : (
        <ul className="space-y-1.5" aria-label="Notifications">
          {notifications.map((n) => {
            const slot = n.relatedSlotId ? state.slots[n.relatedSlotId] : undefined;
            return (
              <li key={n.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <span aria-hidden className={
                  n.read
                    ? 'mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-transparent'
                    : 'mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success'
                } />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {relativeTime(n.createdAt)}
                    {!n.read && <span className="sr-only"> (unread)</span>}
                  </p>
                  {slot && slot.status === 'booked' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <PaymentPill status={slot.paymentStatus} />
                      {slot.meetingUrl ? (
                        <MeetingLinkTag url={slot.meetingUrl} />
                      ) : (
                        <span className="text-xs text-muted-foreground">No meeting link yet</span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
function MeetingLinkTag({ url }: { url: string }) {
  const linkProps = { href: url, target: '_blank', rel: 'noopener noreferrer' };
  return (
    <a {...linkProps} className="inline-flex items-center gap-1 text-xs text-foreground underline underline-offset-4">
      <Link2 className="h-3 w-3" /> Meeting link
    </a>
  );
}
function PaymentPill({ status }: { status: 'paid' | 'unpaid' }) {
  const tone = status === 'paid'
    ? 'bg-success-soft text-accent-foreground'
    : 'bg-warning-soft text-accent-foreground';
  const dot = status === 'paid' ? 'bg-success' : 'bg-warning';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status === 'paid' ? 'Paid' : 'Unpaid'}
    </span>
  );
}
function relativeTime(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); }
  catch { return ''; }
}
function NotificationsSkeleton() {
  return (
    <ul className="space-y-1.5" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Skeleton className="mt-2 h-1.5 w-1.5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}
