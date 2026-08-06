'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type SubjectRequestRow = {
  id: number;
  subject: string;
  level: string;
  note: string;
  status: string;
  createdAt: string;
  requesterName: string;
  requesterEmail: string;
  subjectCount: number;
};

const STATUS_OPTIONS = ['new', 'in_progress', 'fulfilled', 'declined'] as const;

export function AdminSubjectRequestsTable({ requests }: { requests: SubjectRequestRow[] }) {
  const [rows, setRows] = useState(requests);
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleStatusChange = async (id: number, status: string) => {
    setSavingId(id);
    const prev = rows;
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
    try {
      const res = await fetch(`/api/admin/subject-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setRows(prev);
      toast.error('Could not update status — try again.');
    } finally {
      setSavingId(null);
    }
  };

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No subject requests yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-4">Subject</th>
            <th className="py-2 pr-4">Level</th>
            <th className="py-2 pr-4">Requester</th>
            <th className="py-2 pr-4">Note</th>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border align-top">
              <td className="py-3 pr-4 font-medium">
                {row.subject}
                {row.subjectCount > 1 && (
                  <span className="ml-2 rounded-full bg-[#16B8A7]/15 px-2 py-0.5 text-xs font-semibold text-[#16B8A7]">
                    ×{row.subjectCount}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4">{row.level || '—'}</td>
              <td className="py-3 pr-4">
                <div>{row.requesterName}</div>
                <div className="text-xs text-muted-foreground">{row.requesterEmail}</div>
              </td>
              <td className="py-3 pr-4 max-w-xs whitespace-pre-wrap">{row.note || '—'}</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                {new Date(row.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 pr-4">
                <select
                  value={row.status}
                  disabled={savingId === row.id}
                  onChange={(e) => handleStatusChange(row.id, e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
