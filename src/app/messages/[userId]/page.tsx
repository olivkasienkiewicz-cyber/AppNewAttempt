'use client';
import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Paperclip, X, FileText } from 'lucide-react';
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
  attachmentUrl: string | null;
  attachmentType: string | null;
};

const POLL_MS = 4000;
const MAX_LEN = 2000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

export default function MessageThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherUserId } = use(params);
  const state = useAppState();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only images and PDFs can be attached.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('That file is too large (max 10MB).');
      return;
    }
    setPendingFile(file);
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed && !pendingFile) return;
    setSending(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;

      if (pendingFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', pendingFile);
        const uploadRes = await fetch('/api/messages/upload', { method: 'POST', body: formData });
        setUploading(false);
        if (!uploadRes.ok) {
          toast.error("Couldn't upload that file — try again.");
          return;
        }
        const uploaded = await uploadRes.json();
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.type;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: otherUserId, body: trimmed, attachmentUrl, attachmentType }),
      });
      if (!res.ok) {
        toast.error("Couldn't send that message — try again.");
        return;
      }
      setDraft('');
      setPendingFile(null);
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
            const isImage = m.attachmentType?.startsWith('image/');
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMine ? 'bg-[#16B8A7] text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  {m.attachmentUrl && isImage && (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={m.attachmentUrl}
                        alt="Attachment"
                        className="mb-1.5 max-h-64 rounded-md object-contain"
                      />
                    </a>
                  )}
                  {m.attachmentUrl && !isImage && (
                    
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mb-1.5 flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs ${
                        isMine ? 'border-white/40' : 'border-border'
                      }`}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">View PDF attachment</span>
                    </a>
                  )}
                  {m.body && <span>{m.body}</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {pendingFile && (
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          <span className="truncate">{pendingFile.name}</span>
          <button type="button" onClick={() => setPendingFile(null)} aria-label="Remove attachment">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploading}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
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
        <Button onClick={() => void handleSend()} disabled={sending || uploading || (!draft.trim() && !pendingFile)} className="h-10">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </main>
  );
}
