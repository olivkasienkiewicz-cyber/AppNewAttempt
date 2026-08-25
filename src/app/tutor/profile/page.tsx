'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { getCurrentUser, updateTutorSubjects, useAppState } from '@/lib/store';
import {
  ALL_SUBJECTS,
  EGZAMIN_OSMOKLASISTY_SUBJECTS,
  POLSKA_MATURA_SUBJECTS,
  LEVEL_OPTIONS,
  MAX_DETAIL_LEN,
  isMultiInstanceSubject,
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

  // Multi-instance subjects always stay selectable; every other subject
  // drops off the list once the tutor already has it.
  const availableToAdd = ALL_SUBJECTS.filter(
    (s) => isMultiInstanceSubject(s) || !subjects.some((existing) => existing.subject === s)
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
    // For multi-instance subjects, guard against adding the exact same
    // (subject, detail) combination twice (case-insensitive, trimmed),
    // since the backend can't catch this via a plain subject-name check.
    if (isMultiInstanceSubject(draftSubject)) {
      const normalizedNew = draftDetail.trim().toLowerCase();
      const alreadyExists = subjects.some(
        (s) => s.subject === draftSubject && (s.detail ?? '').trim().toLowerCase() === normalizedNew
      );
      if (alreadyExists) {
        toast.error('You already added that subject.');
        return;
      }
    }
    const entry: TutorSubject = {
      subject: draftSubject,
      level: subjectRequiresLevel(draftSubject) ? (draftLevel ?? null) : null,
      detail: subjectSupportsDetail(draftSubject) ? (draftDetail.trim() || null) : null,
    };
    setSubjects((prev) => [...prev, entry]);
    resetDraft();
  };

  // Removing a non-multi-instance subject is unambiguous by name. Removing
  // a multi-instance entry needs to target the specific one the tutor
  // clicked, since there can be several — matched by identity
  // (subject + detail), removing only the first match.
  const handleRemove = (target: TutorSubject) => {
    setSubjects((prev) => {
      if (!isMultiInstanceSubject(target.subject)) {
        return prev.filter((s) => s.subject !== target.subject);
      }
      let removed = false;
      return prev.filter((s) => {
        if (removed || s.subject !== target.subject || s.detail !== target.detail) return true;
        removed = true;
        return false;
      });
    });
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
              {subjects.map((s, i) => (
                <li
                  // Non-multi-instance subjects are unique by name;
                  // multi-instance entries are not, so fall back to index
                  // for a stable-enough key.
                  key={isMultiInstanceSubject(s.subject) ? `${s.subject}-${i}-${s.detail ?? ''}` : s.subject}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.subject === 'Other' ? (s.detail || 'Other') : s.subject}
                      {s.level ? <span className="text-muted-foreground"> · {s.level}</span> : null}
                    </p>
                    {s.subject !== 'Other' && s.detail && (
                      <p className="truncate text-xs text-muted-foreground">{s.detail}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(s)}
                    aria-label={`Remove ${s.subject === 'Other' ? (s.detail || 'Other') : s.subject}`}
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
                  {draftSubject === 'Other'
                    ? 'What subject? (required)'
                    : draftSubject === 'Egzamin ósmoklasisty'
                    ? 'Which subject? (required)'
                    : draftSubject === 'Polska Matura'
                    ? 'Which subject and level? (required)'
                    : 'Countries / universities (optional)'}
                </Label>
                {draftSubject === 'Egzamin ósmoklasisty' ? (
                  <Select value={draftDetail || undefined} onValueChange={(value) => setDraftDetail(value ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {EGZAMIN_OSMOKLASISTY_SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : draftSubject === 'Polska Matura' ? (
                  <Select value={draftDetail || undefined} onValueChange={(value) => setDraftDetail(value ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select subject and level" />
                    </SelectTrigger>
                    <SelectContent>
                      {POLSKA_MATURA_SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={draftDetail}
                    onChange={(e) => setDraftDetail(e.target.value)}
                    maxLength={MAX_DETAIL_LEN}
                    placeholder={draftSubject === 'Other' ? 'e.g. Latin' : 'e.g. UK, US, Canada'}
                    className="h-11 text-sm"
                  />
                )}
                {draftSubject === 'University Application Support' && (
                  <p className="text-xs text-muted-foreground">
                    Separate multiple countries or universities with commas — each one becomes its own searchable option for students.
                  </p>
                )}
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
