'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function AnnounceControls({ pending }: { pending: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'test' | 'all' | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = async (mode: 'test' | 'all') => {
    setBusy(mode);
    try {
      const res = await fetch('/api/admin/referrals/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (mode === 'test') {
        toast.success(`Sent ${data.testSent} test email(s) to your inbox`);
      } else {
        toast.success(`Sent ${data.sent} email(s)${data.failed ? `, ${data.failed} failed` : ''}`);
        setConfirming(false);
        router.refresh();
      }
    } catch {
      toast.error('Sending failed — try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" disabled={busy !== null} onClick={() => run('test')}>
        {busy === 'test' ? 'Sending…' : 'Send test to me'}
      </Button>
      {pending > 0 && !confirming && (
        <Button disabled={busy !== null} onClick={() => setConfirming(true)}>
          Send to all ({pending})
        </Button>
      )}
      {confirming && (
        <>
          <Button disabled={busy !== null} onClick={() => run('all')}>
            {busy === 'all' ? 'Sending… keep this tab open' : `Yes, email ${pending} people`}
          </Button>
          <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirming(false)}>Cancel</Button>
        </>
      )}
    </div>
  );
}
