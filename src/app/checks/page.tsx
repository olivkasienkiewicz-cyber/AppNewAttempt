'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';
import { useLanguage } from '@/context/LanguageContext';
import { BANK_DETAILS } from '@/lib/payment';
import { WORK_CHECK_CONFIG, workCheckStatusLabel, type WorkCheck } from '@/lib/work-check';

function formatDate(iso: string, locale: 'en' | 'pl'): string {
  return new Date(iso).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<string, string> = {
  awaiting_quote: 'bg-slate-100 text-slate-700',
  awaiting_payment: 'bg-amber-100 text-amber-800',
  paid: 'bg-sky-100 text-sky-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

// Written Work Checks for the logged-in student, or a parent's linked
// student. Shows payment details while unpaid and the feedback once ready.
export default function MyChecksPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const w = t.workCheck;
  const { data: session, status } = useSession();
  const [checks, setChecks] = useState<WorkCheck[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/work-checks')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { checks: WorkCheck[] }) => setChecks(d.checks))
      .catch(() => setLoadError(true));
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (session?.user?.role === 'tutor') router.replace('/tutor/checks');
  }, [status, session, router]);

  const isParent = session?.user?.role === 'parent';

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-24 sm:px-6">
      <PageHeader>
        <Button variant="ghost" onClick={() => router.push(isParent ? '/parent' : '/student/bookings')} className="h-10">
          My bookings
        </Button>
        <Button variant="ghost" onClick={() => router.push('/student')} className="h-10">
          Book a session
        </Button>
      </PageHeader>

      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="eyebrow">{w.eyebrow}</p>
          <h1 className="font-display text-4xl text-foreground">{w.myChecks}</h1>
        </div>
        <Button onClick={() => router.push('/written-work-check/order')} className="mt-1 h-9 shrink-0 px-4">
          {w.cta}
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">{w.genericError}</p>
      ) : checks === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : checks.length === 0 ? (
        <EmptyState>
          <p className="mb-4">{w.subtitle}</p>
          <Link href="/written-work-check" className="font-medium text-[#16B8A7] underline">
            {w.cta}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {checks.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">
                    {WORK_CHECK_CONFIG[c.product]?.label[locale] ?? c.product}
                    {c.subject ? ` – ${c.subject}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(c.createdAt, locale)}
                    {isParent && c.studentName ? ` · ${c.studentName}` : ''}
                    {c.secondCheck ? (locale === 'pl' ? ' · ponowne sprawdzenie' : ' · second check') : ''}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] ?? ''}`}>
                  {workCheckStatusLabel(c.status, c.tutorId != null, locale)}
                </span>
              </div>

              <a
                href={c.draftUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-3.5 w-3.5" />
                {c.draftName}
              </a>

              {c.status === 'awaiting_quote' && <p className="mt-3 text-sm text-muted-foreground">{w.totalFromNote}</p>}

              {c.status === 'awaiting_payment' && c.amount != null && (
                <div className="mt-4 rounded-md bg-muted/50 p-4 text-sm">
                  <p className="mb-2 font-medium">{w.paymentHeading}</p>
                  <dl className="space-y-1">
                    <PayRow label={w.accountHolderLabel} value={BANK_DETAILS.accountHolder} />
                    <PayRow label="IBAN" value={BANK_DETAILS.iban} />
                    <PayRow label={w.amountLabel} value={`${c.amount.toFixed(2)} PLN`} />
                    <PayRow label={w.referenceLabel} value={c.referenceCode} bold />
                  </dl>
                  {c.discountCode && <p className="mt-2 text-xs text-[#16B8A7]">{c.discountCode} ✓</p>}
                </div>
              )}

              {c.status === 'paid' && c.dueAt && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {locale === 'pl' ? 'Informacja zwrotna najpóźniej: ' : 'Feedback due by: '}
                  <span className="font-medium text-foreground">{formatDate(c.dueAt, locale)}</span>
                  {c.tutorName ? ` · ${c.tutorName}` : ''}
                </p>
              )}

              {c.status === 'delivered' && c.feedbackUrl && (
                <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
                  {c.tutorName && (
                    <p className="mb-1 text-xs text-green-800">
                      {locale === 'pl' ? 'Sprawdzone przez' : 'Reviewed by'} {c.tutorName}
                    </p>
                  )}
                  {c.feedbackSummary && (
                    <p className="mb-3 whitespace-pre-line text-sm text-foreground">{c.feedbackSummary}</p>
                  )}
                  <a
                    href={c.feedbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-[#16B8A7] px-3 py-2 text-sm font-medium text-white hover:bg-[#129888]"
                  >
                    <Download className="h-4 w-4" />
                    {c.feedbackName ?? 'Feedback'}
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function PayRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${bold ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}
