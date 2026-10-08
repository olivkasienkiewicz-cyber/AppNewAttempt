'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OUTCOME_LABELS, OUTCOME_STATUSES, isPayoutEligible, type OutcomeStatus } from '@/lib/slot-outcome';

export type PayoutClass = {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  subject: string;
  studentName: string;
  paymentStatus: string;
  outcome: OutcomeStatus | null;
  outcomeSetBy: string | null;
  hasEnded: boolean;
  payout: number;
};

export type PayoutRow = {
  tutorId: string;
  tutorName: string;
  rateNote?: string | null; // custom payout rate, if this tutor has one
  paid: boolean;
  classes: PayoutClass[];
};

function summarize(classes: PayoutClass[]) {
  const eligible = classes.filter((c) => isPayoutEligible(c.outcome));
  return {
    eligibleCount: eligible.length,
    eligibleMinutes: eligible.reduce((s, c) => s + c.durationMinutes, 0),
    amount: Math.round(eligible.reduce((s, c) => s + c.payout, 0) * 100) / 100,
    needsStatus: classes.filter((c) => c.hasEnded && !c.outcome).length,
    upcoming: classes.filter((c) => !c.hasEnded && !c.outcome).length,
  };
}

function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function OutcomePill({ c }: { c: PayoutClass }) {
  if (!c.outcome) {
    return c.hasEnded ? (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Needs status</span>
    ) : (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Upcoming</span>
    );
  }
  const eligible = isPayoutEligible(c.outcome);
  return (
    <span
      className={
        eligible
          ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
          : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
      }
    >
      {OUTCOME_LABELS[c.outcome]}
    </span>
  );
}

export function AdminPayoutsTable({ period, rows }: { period: string; rows: PayoutRow[] }) {
  const router = useRouter();
  const [data, setData] = useState(rows);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);
  const [openTutorId, setOpenTutorId] = useState<string | null>(null);

  // Pick up fresh server data after router.refresh()
  useEffect(() => setData(rows), [rows]);

  async function togglePaid(tutorId: string, nextPaid: boolean) {
    setUpdatingId(tutorId);
    try {
      const res = await fetch('/api/admin/payouts/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId, period, paid: nextPaid }),
      });
      if (!res.ok) throw new Error('failed');
      setData((prev) => prev.map((r) => (r.tutorId === tutorId ? { ...r, paid: nextPaid } : r)));
    } catch {
      alert("Couldn't update payout status — try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function setOutcome(tutorId: string, slotId: string, outcomeStatus: OutcomeStatus) {
    setSavingSlotId(slotId);
    try {
      const res = await fetch(`/api/admin/slots/${slotId}/outcome`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomeStatus }),
      });
      if (!res.ok) throw new Error('failed');
      setData((prev) =>
        prev.map((r) =>
          r.tutorId === tutorId
            ? {
                ...r,
                classes: r.classes.map((c) =>
                  c.id === slotId ? { ...c, outcome: outcomeStatus, outcomeSetBy: 'admin' } : c
                ),
              }
            : r
        )
      );
      router.refresh(); // update the month totals at the top
    } catch {
      alert("Couldn't update class status — try again.");
    } finally {
      setSavingSlotId(null);
    }
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left border-b border-border">
          <th className="py-2 pr-4">Tutor</th>
          <th className="py-2 pr-4">Paid classes</th>
          <th className="py-2 pr-4">Hours</th>
          <th className="py-2 pr-4">Amount due</th>
          <th className="py-2 pr-4">Class status</th>
          <th className="py-2 pr-4">Payout</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const s = summarize(row.classes);
          const isOpen = openTutorId === row.tutorId;
          return (
            <Fragment key={row.tutorId}>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => setOpenTutorId(isOpen ? null : row.tutorId)}
                    className="font-medium hover:underline"
                  >
                    {isOpen ? '▾' : '▸'} {row.tutorName}
                  </button>
                  {row.rateNote && (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {row.rateNote}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {s.eligibleCount}
                  <span className="text-muted-foreground"> / {row.classes.length}</span>
                </td>
                <td className="py-2 pr-4">{(s.eligibleMinutes / 60).toFixed(1)}</td>
                <td className="py-2 pr-4 font-medium">{s.amount.toFixed(2)} PLN</td>
                <td className="py-2 pr-4 text-xs">
                  {s.needsStatus > 0 ? (
                    <span className="font-medium text-amber-700">{s.needsStatus} need status</span>
                  ) : s.upcoming > 0 ? (
                    <span className="text-muted-foreground">{s.upcoming} upcoming</span>
                  ) : (
                    <span className="text-green-700">All marked</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      row.paid
                        ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                        : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'
                    }
                  >
                    {row.paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    disabled={updatingId === row.tutorId}
                    onClick={() => togglePaid(row.tutorId, !row.paid)}
                    className="text-xs font-medium text-[#16B8A7] hover:underline disabled:opacity-50"
                  >
                    {row.paid ? 'Mark unpaid' : 'Mark paid'}
                  </button>
                </td>
              </tr>

              {isOpen && (
                <tr className="border-b border-border/50 bg-muted/30">
                  <td colSpan={7} className="px-2 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-1 pr-3">Date</th>
                          <th className="py-1 pr-3">Student</th>
                          <th className="py-1 pr-3">Subject</th>
                          <th className="py-1 pr-3">Student paid</th>
                          <th className="py-1 pr-3">Status</th>
                          <th className="py-1 pr-3">Payout</th>
                          <th className="py-1">Change status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.classes.map((c) => (
                          <tr key={c.id} className="border-t border-border/40">
                            <td className="py-1.5 pr-3 whitespace-nowrap">
                              {formatDate(c.date)}, {c.startTime} · {c.durationMinutes} min
                            </td>
                            <td className="py-1.5 pr-3">{c.studentName}</td>
                            <td className="py-1.5 pr-3">{c.subject}</td>
                            <td className="py-1.5 pr-3">{c.paymentStatus === 'paid' ? 'Yes' : 'No'}</td>
                            <td className="py-1.5 pr-3">
                              <OutcomePill c={c} />
                              {c.outcomeSetBy === 'admin' && (
                                <span className="ml-1 text-muted-foreground">(admin)</span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 whitespace-nowrap">
                              {isPayoutEligible(c.outcome) ? `${c.payout.toFixed(2)} PLN` : '—'}
                            </td>
                            <td className="py-1.5">
                              <select
                                value={c.outcome ?? ''}
                                disabled={savingSlotId === c.id}
                                onChange={(e) =>
                                  e.target.value && setOutcome(row.tutorId, c.id, e.target.value as OutcomeStatus)
                                }
                                className="rounded border border-border bg-background px-1 py-0.5 disabled:opacity-50"
                              >
                                <option value="" disabled>
                                  Not marked
                                </option>
                                {OUTCOME_STATUSES.map((o) => (
                                  <option key={o} value={o}>
                                    {OUTCOME_LABELS[o]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
