'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { completeOnboarding, type Role } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/brand/brand-mark';
const MAX_LEN = 40;
export default function OnboardingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  if (status === 'unauthenticated') {
    router.replace('/login');
    return null;
  }
  const trimmed = name.trim();
  const canSubmit = role !== null && trimmed.length > 0 && trimmed.length <= MAX_LEN && !submitting;
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) { setError('Choose one to continue.'); return; }
    if (trimmed.length === 0) { setError('Please enter your name.'); return; }
    if (trimmed.length > MAX_LEN) { setError(`Name must be ${MAX_LEN} characters or fewer.`); return; }
    setSubmitting(true);
    try {
      const user = await completeOnboarding(trimmed, role);
      if (user.role === 'tutor') {
        toast.info('Add the subjects you tutor from your dashboard.');
        router.replace('/tutor/profile');
      } else {
        router.replace('/student');
      }
    } catch {
      setSubmitting(false);
      setError("We couldn't save your profile — check your connection and try again.");
      toast.error("Couldn't reach the server to save your profile.");
    }
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
      <header className="mb-10 flex items-center justify-between border-b border-border pb-4">
        <BrandMark size="md" />
      </header>
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="space-y-2">
          <p className="eyebrow">One last step</p>
          <h1 className="font-display text-4xl text-foreground">Tell us about you</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">I am a</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={role === 'student' ? 'default' : 'outline'}
                className="h-12 flex-1"
                onClick={() => { setRole('student'); if (error) setError(null); }}
              >
                Student
              </Button>
              <Button
                type="button"
                variant={role === 'tutor' ? 'default' : 'outline'}
                className="h-12 flex-1"
                onClick={() => { setRole('tutor'); if (error) setError(null); }}
              >
                Tutor
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-sm">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
              maxLength={MAX_LEN}
              autoFocus
              autoComplete="given-name"
              placeholder="e.g. Anya Marek"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'name-error' : undefined}
              className="h-12 text-base"
            />
            {error && <p id="name-error" className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" size="lg" disabled={!canSubmit} className="h-12 text-base">
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </div>
    </main>
  );
}
