'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { getCurrentUser, updateTutorSubjects, useAppState } from '@/lib/store';
import {
  ALL_SUBJECTS,
  LEVEL_OPTIONS,
  MAX_DETAIL_LEN,
  subjectDetailRequired,
  subjectRequiresLevel,
  subjectSupportsDetail,
  type TutorSubject,
} from '@/lib/subjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/brand/page-header';

export default function TutorProfilePage() {
  const state = useAppState();
  const router = useRouter();
  const [subjects, setSubjects] = useState<TutorSubject[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // --- "add a subject" draft controls ---
  const [draftSubject, setDraftSubject] = useState<string | undefined>(undefined);
  const [draftLevel, setDraftLevel] = useState<string | undefined>(undefined);
  const [draftDetail, setDraftDetail] = useState('');

  useEffect(() => {
    if (!state.dataLoaded || initialized) return;
    const user = getCurrentUser();
    if (!user) return;
    if (user.role !== 'tutor') {
      router.replace('/student');
      return;
    }
    setSubjects(user.subjects);
    setInitialized(true);
  }, [state.dataLoaded, initialized, router]);

  const availableToAdd = ALL_SUBJECTS.filter(
    (s) => !subjects.some((existing) => existing.subject === s)
  );

  const resetDraft = () => {
    setDraftSubject(undefined);
    setDraftLevel(undefined);
    setDraftDetail('');
  };

  const handleAdd = () => {
    if (!draftSubject) return;
    if (subjectDetailRequired(draftSubject) && draftDetail.trim().length === 0) {
      toast.error('Please describe this subject.');
      return;
    }
    const entry: TutorSubject = {
      subject: draftSubject,
      level: subjectRequiresLevel(draftSubject) ? (draftLevel ?? null) : null,
      detail: subjectSupportsDetail(draftSubject) ? (draftDetail.trim() || null) : null,
    };
    setSubjects((prev) => [...prev, entry]);
    resetDraft();
  };

  const handleRemove = (subjectName: string) => {
    setSubjects((prev) => prev.filter((s) => s.subject !== subjectName));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await updateTutorSubjects(subjects);
      toast.success('Profile updated');
      router.push('/tutor');
    } catch {
      toast.error("Couldn't save your changes — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-8 pb-12 sm:px-6">
      <PageHeader />
      <div className="mb-8 space-y-1">
        <p className="eyebrow">Your profile</p>
        <h1 className="font-display text-4xl text-foreground">Subjects you tutor</h1>
        <p className="text-sm text-muted-foreground">
          This is what students see when they search and filter for a tutor. Add as many as you like.
        </p>
      </div>

      {!state.dataLoaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {subjects.length > 0 && (
            <ul className="space-y-2">
              {subjects.map((s) => (
                <li
                  key={s.subject}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.subject}
                      {s.level ? <span className="text-muted-foreground"> · {s.level}</span> : null}
                    </p>
                    {s.detail && (
                      <p className="truncate text-xs text-muted-foreground">{s.detail}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(s.subject)}
                    aria-label={`Remove ${s.subject}`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
            <Label className="text-sm">Add a subject</Label>
            <Select value={draftSubject} onValueChange={(value) => { setDraftSubject(value ?? undefined); setDraftLevel(undefined); setDraftDetail(''); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {draftSubject && subjectRequiresLevel(draftSubject) && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Level (optional)</Label>
                <Select value={draftLevel} onValueChange={(value) => setDraftLevel(value ?? undefined)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {draftSubject && subjectSupportsDetail(draftSubject) && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">
                  {draftSubject === 'Other' ? 'What subject? (required)' : 'Countries / universities (optional)'}
                </Label>
                <Input
                  value={draftDetail}
                  onChange={(e) => setDraftDetail(e.target.value)}
                  maxLength={MAX_DETAIL_LEN}
                  placeholder={draftSubject === 'Other' ? 'e.g. Latin' : 'e.g. UK, US, Canada'}
                  className="h-11 text-sm"
                />
              </div>
            )}

            <Button type="button" variant="outline" disabled={!draftSubject} onClick={handleAdd}>
              Add
            </Button>
          </div>

          <Button size="lg" disabled={submitting} onClick={handleSave} className="h-12 text-base">
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    </main>
  );
}
