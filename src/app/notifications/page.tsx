'use client';

import { useEffect, useMemo } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAppState, markAllRead } from '@/lib/store';

export default function NotificationsPage() {
  const state = useAppState();
  const userId = state.currentUserId;

  useEffect(() => {
    if (userId) markAllRead(userId);
  }, [userId]);

  const items = useMemo(() => {
    if (!userId) return [];
    return Object.values(state.notifications)
      .filter((n) => n.recipientUserId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [state.notifications, userId]);

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Notifications</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <span
                aria-label={n.read ? undefined : 'Unread'}
                className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                  n.read ? 'bg-transparent' : 'bg-primary'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}