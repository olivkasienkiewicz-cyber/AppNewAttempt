'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OUTCOME_LABELS, OUTCOME_STATUSES, type OutcomeStatus } from '@/lib/slot-outcome';

export type AdminBooking = {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  tutorName: string;
  studentName: string;
  subject: string | null;
  amount: number;
  discountCode: string | null;
  paymentStatus: 'unpaid' | 'paid';
  outcome: OutcomeStatus | null;
  outcomeSetBy: string | null;
  hasEnded: boolean;
  batchId: string | null;
  batchStatus: string | null;
  reference: string;
};

// The student is charged for these outcomes (same rule as tutor payouts).
const CHARGEABLE: ReadonlySet<OutcomeStatus> = new Set([
  'completed',
  'student_absence',
  'moved_outside_policy',
]);

type Category = 'collect' | 'status' | 'refund' | 'upcoming' | 'settled' | 'nocharge';

function categorize(b: AdminBooking): Category {
  if (!b.outcome) {
    return b.hasEnded ? 'status' : 'upcoming';
  }
  if (CHARGEABLE.has(b.outcome)) {
    return b.paymentStatus === 'paid' ? 'settled' : 'collect';
  }
  return b.paymentStatus === 'paid' ? 'refund' : 'nocharge';
}

const CATEGORY_INFO: Record<Category, { title: string; hint: string; tone: string }> = {
  collect: {
    title: 'Payment to collect',
    hint: 'Class happened (or was cancelled late) and the student has not paid yet.',
    tone: 'bg-amber-100 text-amber-800',
  },
  status: {
    title: 'Status missing',
    hint: 'Class has ended but the tutor has not marked what happened.',
    tone: 'bg-orange-100 text-orange-800',
  },
  refund: {
    title: 'Refund / credit due',
    hint: 'Student paid, but the class was cancelled per policy or the tutor was absent.',
    tone: 'bg-red-100 text-red-700',
  },
  upcoming: {
    title: 'Upcoming',
    hint: 'Not happened yet.',
    tone: 'bg-slate-100 text-slate-700',
  },
  settled: {
    title: 'Paid',
    hint: 'Charged and paid.',
    tone: 'bg-green-100 text-green-700',
  },
  nocharge: {
    title: 'No charge',
    hint: 'Cancelled per policy or tutor absence, nothing paid.',
    tone: 'bg-slate-100 text-slate-500',
  },
};

type View = 'action' | 'upcoming' | 'done' | 'all';

const VIEW_CATEGORIES: Record<View, Category[]> = {
  action: ['collect', 'status', 'refund'],
  upcoming: ['upcoming'],
  done: ['settled', 'nocharge'],
  all: ['collect', 'status', 'refund', 'upcoming', 'settled', 'nocharge'],
};

const VIEW_LABELS: Record<View, string> = {
  action: 'Needs action',
  upcoming: 'Upcoming',
  done: 'Done',
  all: 'All',
};

function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPln(n: number) {
  return `${n.toFixed(2)} PLN`;
}

export function AdminBookingsTable({ bookings }: { bookings: AdminBooking[] }) {
  const router = useRouter();
  const [data, setData] = useState(bookings);
  const [view, setView] = useState<View>('action');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pick up fresh server data after router.refresh()
  useEffect(() => setData(bookings), [bookings]);

  const withCategory = useMemo(
    () => data.map((b) => ({ ...b, category: categorize(b) })),
    [data]
  );

  const batchSizes = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of data) if (b.batchId) m.set(b.batchId, (m.get(b.batchId) ?? 0) + 1);
    return m;
  }, [data]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { collect: 0, status: 0, refund: 0, upcoming: 0, settled: 0, nocharge: 0 };
    for (const b of withCategory) c[b.category]++;
    return c;
  }, [withCategory]);

  const totals = useMemo(() => {
    let toCollect = 0;
    let toRefund = 0;
    for (const b of withCategory) {
      if (b.category === 'collect') toCollect += b.amount;
      if (b.category === 'refund') toRefund += b.amount;
    }
    return { toCollect, toRefund };
  }, [withCategory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withCategory;
    return withCategory.filter((b) =>
      [b.studentName, b.tutorName, b.subject ?? '', b.reference].some((s) => s.toLowerCase().includes(q))
    );
  }, [withCategory, query]);

  function viewCount(v: View) {
    return VIEW_CATEGORIES[v].reduce((sum, c) => sum + counts[c], 0);
  }

  async function run(id: string, url: string, init: RequestInit, errorMsg: string, apply?: () => void) {
    setBusyId(id);
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error('failed');
      apply?.();
      router.refresh();
    } catch {
      alert(errorMsg);
    } finally {
      setBusyId(null);
    }
  }

  function setPayment(b: AdminBooking, paid: boolean) {
    const url = paid ? `/api/admin/slots/${b.id}/mark-paid` : `/api/admin/slots/${b.id}/mark-unpaid`;
    return run(b.id, url, { method: 'POST' }, "Couldn't update payment — try again.", () =>
      setData((prev) => prev.map((x) => (x.id === b.id ? { ...x, paymentStatus: paid ? 'paid' : 'unpaid' } : x)))
    );
  }

  function confirmBatch(b: AdminBooking) {
    if (!b.batchId) return;
    const batchId = b.batchId;
    return run(b.id, `/api/payment-batches/${batchId}/confirm`, { method: 'POST' }, "Couldn't confirm the bundle — try again.", () =>
      setData((prev) =>
        prev.map((x) => (x.batchId === batchId ? { ...x, paymentStatus: 'paid', batchStatus: 'paid' } : x))
      )
    );
  }

  function setOutcome(b: AdminBooking, outcomeStatus: OutcomeStatus) {
    return run(
      b.id,
      `/api/admin/slots/${b.id}/outcome`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomeStatus }),
      },
      "Couldn't update class status — try again.",
      () => setData((prev) => prev.map((x) => (x.id === b.id ? { ...x, outcome: outcomeStatus, outcomeSetBy: 'admin' } : x)))
    );
  }

  function renderActions(b: AdminBooking & { category: Category }) {
    const busy = busyId === b.id;
    const btn = 'px-3 py-1 rounded text-xs font-medium disabled:opacity-50';
    const link = 'text-xs text-muted-foreground hover:underline disabled:opacity-50';

    if (b.category === 'refund') {
      return (
        <button type="button" disabled={busy} onClick={() => setPayment(b, false)} className={`${btn} bg-red-600 text-white`}>
          {busy ? 'Saving…' : 'Refunded / credited'}
        </button>
      );
    }
    if (b.paymentStatus === 'paid') {
      return (
        <button type="button" disabled={busy} onClick={() => setPayment(b, false)} className={link}>
          Mark unpaid
        </button>
      );
    }
    if (b.category === 'nocharge') return null;
    // Unpaid and chargeable (or not marked yet — students may pay before class)
    if (b.batchId && b.batchStatus === 'unpaid') {
      const size = batchSizes.get(b.batchId) ?? 1;
      return (
        <button type="button" disabled={busy} onClick={() => confirmBatch(b)} className={`${btn} bg-[#16B8A7] text-white`}>
          {busy ? 'Confirming…' : `Confirm bundle (${size} ${size === 1 ? 'class' : 'classes'})`}
        </button>
      );
    }
    return (
      <button type="button" disabled={busy} onClick={() => setPayment(b, true)} className={`${btn} bg-black text-white`}>
        {busy ? 'Saving…' : 'Mark paid'}
      </button>
    );
  }

  function renderCard(b: AdminBooking & { category: Category }) {
    const info = CATEGORY_INFO[b.category];
    const chargeable = b.outcome ? CHARGEABLE.has(b.outcome) : true;
    return (
      <li key={b.id} className="rounded-lg border border-border p-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium">
              {b.studentName} <span className="text-muted-foreground font-normal">with</span> {b.tutorName}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(b.date)}, {b.startTime} · {b.durationMinutes} min{b.subject ? ` · ${b.subject}` : ''}
            </div>
          </div>
          <div className="text-right">
            <div className={chargeable ? 'font-medium' : 'font-medium text-muted-foreground line-through'}>
              {formatPln(b.amount)}
            </div>
            <div className="text-xs text-muted-foreground">
              {b.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'} · {b.reference}
              {b.discountCode ? ` · ${b.discountCode}` : ''}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.tone}`}>{info.title}</span>
            <select
              value={b.outcome ?? ''}
              disabled={busyId === b.id}
              onChange={(e) => e.target.value && setOutcome(b, e.target.value as OutcomeStatus)}
              className="rounded border border-border bg-background px-1 py-0.5 text-xs disabled:opacity-50"
              aria-label="Class status"
            >
              <option value="" disabled>
                Class status: not marked
              </option>
              {OUTCOME_STATUSES.map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABELS[o]}
                </option>
              ))}
            </select>
            {b.outcomeSetBy && (
              <span className="text-xs text-muted-foreground">by {b.outcomeSetBy === 'admin' ? 'admin' : 'tutor'}</span>
            )}
          </div>
          {renderActions(b)}
        </div>
      </li>
    );
  }

  const categoriesInView = VIEW_CATEGORIES[view];

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className={`rounded-lg border p-3 ${counts.collect > 0 ? 'border-amber-300 bg-amber-50' : 'border-border'}`}>
          <div className="text-muted-foreground">To collect</div>
          <div className="text-lg font-semibold">{formatPln(totals.toCollect)}</div>
          <div className="text-xs text-muted-foreground">{counts.collect} classes</div>
        </div>
        <div className={`rounded-lg border p-3 ${counts.status > 0 ? 'border-orange-300 bg-orange-50' : 'border-border'}`}>
          <div className="text-muted-foreground">Status missing</div>
          <div className="text-lg font-semibold">{counts.status}</div>
          <div className="text-xs text-muted-foreground">ended, not marked</div>
        </div>
        <div className={`rounded-lg border p-3 ${counts.refund > 0 ? 'border-red-300 bg-red-50' : 'border-border'}`}>
          <div className="text-muted-foreground">Refund / credit due</div>
          <div className="text-lg font-semibold">{formatPln(totals.toRefund)}</div>
          <div className="text-xs text-muted-foreground">{counts.refund} classes</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={
              view === v
                ? 'rounded-full bg-[#0B1F3A] px-3 py-1 text-xs font-medium text-white'
                : 'rounded-full border border-border px-3 py-1 text-xs font-medium'
            }
          >
            {VIEW_LABELS[v]} ({viewCount(v)})
          </button>
        ))}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search student, tutor, subject, reference"
          className="ml-auto w-full rounded border border-border bg-background px-2 py-1 text-sm sm:w-72"
        />
      </div>

      {categoriesInView.map((cat) => {
        const items = filtered.filter((b) => b.category === cat);
        if (cat === 'upcoming') items.reverse(); // soonest first
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mb-6">
            <h2 className="text-sm font-semibold">
              {CATEGORY_INFO[cat].title} <span className="text-muted-foreground font-normal">({items.length})</span>
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">{CATEGORY_INFO[cat].hint}</p>
            <ul className="space-y-2">{items.map(renderCard)}</ul>
          </section>
        );
      })}

      {categoriesInView.every((cat) => !filtered.some((b) => b.category === cat)) && (
        <p className="text-sm text-muted-foreground">
          {view === 'action' ? 'Nothing needs your attention right now.' : 'No bookings here.'}
        </p>
      )}
    </div>
  );
}
