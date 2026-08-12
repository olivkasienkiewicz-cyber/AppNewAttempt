'use client';
import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';

type Message = {
  id: number;
  senderId: string;
  recipientId: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 4000;
const MAX_LEN = 2000;

export default function MessageThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherUserId } = use(params);
  const state = useAppState();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const otherUser = state.users[otherUserId];

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?with=${otherUserId}`);
      if (!res.ok) return;
      const data: Message[] = await res.json();
      setMessages(data);
    } catch {
      // silent — the next poll will retry
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void fetchMessages();
    const interval = setInterval(() => { void fetchMessages(); }, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: otherUserId, body: trimmed }),
      });
      if (!res.ok) {
        toast.error("Couldn't send that message — try again.");
        return;
      }
      setDraft('');
      await fetchMessages();
    } catch {
      toast.error("Couldn't reach the server — check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col px-4 pt-8 pb-4 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.push('/messages')}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-4">
        <p className="eyebrow">Conversation</p>
        <h1 className="font-display text-3xl text-foreground">{otherUser?.name ?? '…'}</h1>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-border bg-card p-4">
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === state.currentUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMine ? 'bg-[#16B8A7] text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          maxLength={MAX_LEN}
          rows={2}
          placeholder="Write a message…"
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={() => void handleSend()} disabled={sending || !draft.trim()} className="h-10">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </main>
  );
}
