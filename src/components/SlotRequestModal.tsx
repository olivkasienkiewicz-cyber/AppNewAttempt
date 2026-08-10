'use client';

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorId: string;
};

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 7; h < 22; h++) for (let m = 0; m < 60; m += 30) {
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return out;
})();

const todayStr = () => new Date().toISOString().slice(0, 10);

export function SlotRequestModal({ open, onOpenChange, tutorId }: Props) {
  const { t } = useLanguage();
  const [date, setDate] = useState('');
  const [time, setTime] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  if (!open) return null;

  const reset = () => {
    setDate('');
    setTime(undefined);
    setNote('');
    setStatus('idle');
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const handleSubmit = async () => {
    if (!date || !time) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/slot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId,
          requestedDate: date,
          requestedTime: time,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        {status === 'success' ? (
          <>
            <h2 className="font-display text-2xl text-foreground">{t.slotRequest.successTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.slotRequest.successBody}</p>
            <Button className="mt-6 w-full" onClick={close}>{t.slotRequest.close}</Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl text-foreground">{t.slotRequest.modalTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.slotRequest.modalIntro}</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.slotRequest.dateLabel}
                </span>
                <input
                  type="date"
                  value={date}
                  min={todayStr()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.slotRequest.timeLabel}
                </span>
                <Select value={time} onValueChange={(value) => setTime(value ?? undefined)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.slotRequest.timePlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.slotRequest.noteLabel}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.slotRequest.notePlaceholder}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>

            {status === 'error' && (
              <p className="mt-3 text-sm text-destructive">{t.slotRequest.genericError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={close}>
                {t.slotRequest.cancel}
              </Button>
              <Button
                className="flex-1"
                disabled={!date || !time || status === 'submitting'}
                onClick={handleSubmit}
              >
                {t.slotRequest.submit}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
