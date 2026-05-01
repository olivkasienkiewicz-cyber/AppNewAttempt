'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAppState } from '@/lib/store';

export function NotificationBell() {
  const state = useAppState();
  const userId = state.currentUserId;
  const count = userId
    ? Object.values(state.notifications).filter(
        (n) => n.recipientUserId === userId && !n.read,
      ).length
    : 0;

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <Badge
          className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs"
          aria-hidden
        >
          {count}
        </Badge>
      )}
    </Link>
  );
}