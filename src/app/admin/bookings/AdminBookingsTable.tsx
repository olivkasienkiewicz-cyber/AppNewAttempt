'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Booking = {
  id: string;
  date: string;
  startTime: string;
  tutorName: string;
  studentName: string;
  amount: number;
  paymentStatus: 'unpaid' | 'paid';
};

export function AdminBookingsTable({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function markPaid(id: string) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/slots/${id}/mark-paid`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark paid');
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left border-b">
          <th className="py-2">Student</th>
          <th className="py-2">Tutor</th>
          <th className="py-2">Date</th>
          <th className="py-2">Amount</th>
          <th className="py-2">Status</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => (
          <tr key={b.id} className="border-b">
            <td className="py-2">{b.studentName}</td>
            <td className="py-2">{b.tutorName}</td>
            <td className="py-2">{b.date} {b.startTime}</td>
            <td className="py-2">{b.amount.toFixed(2)} PLN</td>
            <td className="py-2">{b.paymentStatus}</td>
            <td className="py-2">
              {b.paymentStatus === 'unpaid' && (
                <button
                  onClick={() => markPaid(b.id)}
                  disabled={pendingId === b.id}
                  className="px-3 py-1 rounded bg-black text-white text-xs disabled:opacity-50"
                >
                  {pendingId === b.id ? 'Marking...' : 'Mark paid'}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
