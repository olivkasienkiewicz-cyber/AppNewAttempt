'use client';

import { useState } from 'react';

type PayoutRow = {
  tutorId: string;
  tutorName: string;
  sessionCount: number;
  totalMinutes: number;
  amount: number;
  paid: boolean;
};

export function AdminPayoutsTable({ period, rows }: { period: string; rows: PayoutRow[] }) {
  const [data, setData] = useState(rows);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left border-b border-border">
          <th className="py-2 pr-4">Tutor</th>
          <th className="py-2 pr-4">Sessions</th>
          <th className="py-2 pr-4">Hours</th>
          <th className="py-2 pr-4">Amount due</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.tutorId} className="border-b border-border/50">
            <td className="py-2 pr-4">{row.tutorName}</td>
            <td className="py-2 pr-4">{row.sessionCount}</td>
            <td className="py-2 pr-4">{(row.totalMinutes / 60).toFixed(1)}</td>
            <td className="py-2 pr-4 font-medium">{row.amount.toFixed(2)} PLN</td>
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
        ))}
      </tbody>
    </table>
  );
}
