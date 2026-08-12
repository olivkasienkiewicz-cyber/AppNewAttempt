'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getCurrentUser, updateTutorSubjects, useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/brand/page-header';

const MAX_SUBJECT_LEN = 60;
const MAX_LEVEL_LEN = 20;

export default function TutorProfilePage() {
  const state = useAppState();
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!state.dataLoaded || initialized) return;
    const user = getCurrentUser();
    if (!user) return;
    if (user.role !== 'tutor') {
      router.replace('/student');
      return;
    }
    setSubject(user.subject ?? '');
    setLevel(user.level ?? '');
    setInitialized(true);
  }, [state.dataLoaded, initialized, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateTutorSubjects(subject.trim() || null, level.trim() || null);
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
          This is what students see when they search and filter for a tutor.
        </p>
      </div>

      {!state.dataLoaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject" className="text-sm">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={MAX_SUBJECT_LEN}
              placeholder="e.g. Mathematics"
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="level" className="text-sm">Level(s)</Label>
            <Input
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              maxLength={MAX_LEVEL_LEN}
              placeholder="e.g. HL/SL"
              className="h-12 text-base"
            />
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="h-12 text-base">
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      )}
    </main>
  );
}
