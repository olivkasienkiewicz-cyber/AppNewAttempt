'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

type ConversationSummary = {
  otherUserId: string;
  lastMessageBody: string;
  lastMessageAt: string;
  lastMessageFromMe: boolean;
  unreadCount: number;
};

const POLL_MS = 8000;

export default function MessagesListPage() {
  const state = useAppState();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages/conversations');
      if (!res.ok) return;
      const data: ConversationSummary[] = await res.json();
      setConversations(data);
    } catch {
      // silent — the next poll will retry
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void fetchConversations();
    const interval = setInterval(() => { void fetchConversations(); }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Inbox</p>
        <h1 className="font-display text-4xl text-foreground">Messages</h1>
      </div>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : conversations.length === 0 ? (
        <EmptyState>No conversations yet.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {conversations.map((c) => {
            const other = state.users[c.otherUserId];
            return (
              <li key={c.otherUserId}>
                <Link
                  href={`/messages/${c.otherUserId}`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-[#16B8A7]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {other?.name ?? 'Unknown user'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.lastMessageFromMe ? 'You: ' : ''}{c.lastMessageBody}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="ml-3 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#16B8A7] px-1.5 text-xs font-semibold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
