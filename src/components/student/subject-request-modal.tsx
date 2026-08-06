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
};

const LEVEL_OPTIONS = ['HL', 'SL', 'other'] as const;

export function SubjectRequestModal({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'duplicate' | 'error'>('idle');

  if (!open) return null;

  const reset = () => {
    setSubject('');
    setLevel(undefined);
    setNote('');
    setStatus('idle');
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const handleSubmit = async () => {
    if (!subject.trim()) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/subject-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          level: level ?? null,
          note: note.trim() || null,
        }),
      });
      if (res.status === 409) {
        setStatus('duplicate');
        return;
      }
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
            <h2 className="font-display text-2xl text-foreground">{t.subjectRequest.successTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.subjectRequest.successBody}</p>
            <Button className="mt-6 w-full" onClick={close}>{t.subjectRequest.close}</Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl text-foreground">{t.subjectRequest.modalTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.subjectRequest.modalIntro}</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.subjectRequest.subjectLabel}
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t.subjectRequest.subjectPlaceholder}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.subjectRequest.levelLabel}
                </span>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.subjectRequest.levelPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.subjectRequest.noteLabel}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.subjectRequest.notePlaceholder}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>

            {status === 'duplicate' && (
              <p className="mt-3 text-sm text-destructive">{t.subjectRequest.duplicateError}</p>
            )}
            {status === 'error' && (
              <p className="mt-3 text-sm text-destructive">{t.subjectRequest.genericError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={close}>
                {t.subjectRequest.cancel}
              </Button>
              <Button
                className="flex-1"
                disabled={!subject.trim() || status === 'submitting'}
                onClick={handleSubmit}
              >
                {t.subjectRequest.submit}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
