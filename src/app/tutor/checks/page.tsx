'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { upload } from '@vercel/blob/client';
import { ChevronLeft, Download, FileText, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';
import {
  WORK_CHECK_ACCEPT_ATTR,
  WORK_CHECK_ALLOWED_TYPES,
  WORK_CHECK_MAX_FILE_BYTES,
  workCheckLabel,
  type WorkCheck,
} from '@/lib/work-check';

function formatDue(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Written Work Checks assigned to the logged-in tutor: download the draft,
// upload the commented file plus a criteria summary, and hand it back.
export default function TutorChecksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [checks, setChecks] = useState<WorkCheck[] | null>(null);

  const load = useCallback(() => {
    fetch('/api/work-checks')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { checks: WorkCheck[] }) => setChecks(d.checks))
      .catch(() => toast.error("Couldn't load your work checks."));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') load();
    if (status === 'unauthenticated') router.push('/login');
  }, [status, load, router]);

  if (status === 'authenticated' && session.user.role !== 'tutor') {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        This page is for tutors. <Link href="/checks" className="text-foreground underline">See your checks</Link>.
      </div>
    );
  }

  const open = checks?.filter((c) => c.status === 'paid') ?? [];
  const done = checks?.filter((c) => c.status === 'delivered') ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-24 sm:px-6">
      <PageHeader>
        <Button variant="ghost" onClick={() => router.push('/tutor')} className="h-10">
          <ChevronLeft className="h-4 w-4" /> My week
        </Button>
      </PageHeader>

      <div className="mb-6 space-y-1">
        <p className="eyebrow">Written Work Check</p>
        <h1 className="font-display text-4xl text-foreground">Work checks</h1>
      </div>

      <div className="mb-8 flex gap-3 rounded-lg border border-[#16B8A7]/30 bg-[#7CD8C5]/10 p-4 text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#16B8A7]" />
        <p className="text-muted-foreground">
          Comment and assess only — don&apos;t rewrite or edit the student&apos;s text (IB academic integrity). Return
          the draft with your comments, plus a summary against each criterion and an estimated mark band.
        </p>
      </div>

      {checks === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : checks.length === 0 ? (
        <EmptyState>
          <p>No work checks assigned to you yet. You&apos;ll get an email when one is.</p>
        </EmptyState>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            To review ({open.length})
          </h2>
          {open.length === 0 ? (
            <p className="mb-8 text-sm text-muted-foreground">All done — nothing waiting.</p>
          ) : (
            <ul className="mb-10 space-y-4">
              {open.map((c) => (
                <OpenCheck key={c.id} check={c} userId={session!.user.id} onDelivered={load} />
              ))}
            </ul>
          )}

          {done.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Delivered</h2>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {done.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <span className="font-medium">{workCheckLabel(c.product)}</span>
                      {c.subject ? ` – ${c.subject}` : ''} · {c.studentName ?? '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.deliveredAt ? new Date(c.deliveredAt).toLocaleDateString('en-GB') : ''}
                      {c.tutorPayout != null ? ` · ${c.tutorPayout.toFixed(2)} PLN` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}

function OpenCheck({ check: c, userId, onDelivered }: { check: WorkCheck; userId: string; onDelivered: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const overdue = c.dueAt ? new Date(c.dueAt).getTime() < now : false;

  const pick = (f: File | null) => {
    if (!f) return setFile(null);
    if (!(WORK_CHECK_ALLOWED_TYPES as readonly string[]).includes(f.type)) return toast.error('Upload a PDF, DOC, DOCX or ODT file.');
    if (f.size > WORK_CHECK_MAX_FILE_BYTES) return toast.error('That file is larger than 20 MB.');
    setFile(f);
  };

  const deliver = async () => {
    if (!file) return toast.error('Add the file with your comments first.');
    if (!summary.trim()) return toast.error('Add a short summary against the criteria.');
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blob = await upload(`work-checks/${userId}/feedback-${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/work-checks/upload',
      });
      const res = await fetch(`/api/work-checks/${c.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackUrl: blob.url, feedbackName: file.name, feedbackSummary: summary }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      toast.success('Feedback sent to the student');
      onDelivered();
    } catch (err) {
      console.error('Deliver work check failed', err);
      toast.error("Couldn't send the feedback — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {workCheckLabel(c.product)}
            {c.subject ? ` – ${c.subject}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {c.studentName ?? '—'}
            {c.secondCheck ? ' · second check' : ''}
            {c.tutorPayout != null ? ` · ${c.tutorPayout.toFixed(2)} PLN` : ''}
          </p>
        </div>
        {c.dueAt && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            Due {formatDue(c.dueAt)}
          </span>
        )}
      </div>

      <a
        href={c.draftUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
      >
        <Download className="h-4 w-4" /> {c.draftName}
      </a>

      {c.studentNote && (
        <p className="mt-3 whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm">
          <span className="block text-xs font-medium text-muted-foreground">Note from the student</span>
          {c.studentNote}
        </p>
      )}

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border px-3 py-3 text-sm hover:border-[#16B8A7]">
          {file ? <FileText className="h-5 w-5 text-[#16B8A7]" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
          <span className="truncate">{file ? file.name : 'Upload the draft with your comments (PDF/Word)'}</span>
          <input
            type="file"
            accept={WORK_CHECK_ACCEPT_ATTR}
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder={'Summary against each criterion + estimated mark band, e.g.\nA – Focus: 3/4 …\nEstimated band: 18–21/30'}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
        <Button onClick={deliver} disabled={busy} className="h-9 px-4">
          {busy ? 'Sending…' : 'Send feedback to student'}
        </Button>
      </div>
    </li>
  );
}
