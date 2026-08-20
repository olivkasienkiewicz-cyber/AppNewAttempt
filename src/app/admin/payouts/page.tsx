import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL, payoutForSlot } from '@/lib/payment';
import { AdminPayoutsTable } from './AdminPayoutsTable';

export const dynamic = 'force-dynamic';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
function periodBounds(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth = new Date(y, m, 1);
  const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, end };
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    notFound();
  }

  const { month } = await searchParams;
  const period = month && /^\d{4}-\d{2}$/.test(month) ? month : currentPeriod();
  const { start, end } = periodBounds(period);

  const rows = await sql`
    SELECT s.duration_minutes, s.subject, s.tutor_id, u.name AS tutor_name
    FROM slots s
    JOIN users u ON u.id = s.tutor_id
    WHERE s.status = 'booked' AND s.date >= ${start} AND s.date < ${end}
  `;

  const payoutRows = await sql`
    SELECT tutor_id, paid FROM tutor_payouts WHERE period = ${period}
  `;
  const paidMap = new Map<string, boolean>();
  for (const r of payoutRows) paidMap.set(r.tutor_id as string, r.paid as boolean);

  type Agg = { tutorId: string; tutorName: string; sessionCount: number; totalMinutes: number; amount: number };
  const byTutor = new Map<string, Agg>();
  for (const row of rows) {
    const tutorId = row.tutor_id as string;
    const durationMinutes = Number(row.duration_minutes);
    const subject = row.subject as string | null;
    const amount = payoutForSlot(durationMinutes, subject);
    const existing = byTutor.get(tutorId);
    if (existing) {
      existing.sessionCount += 1;
      existing.totalMinutes += durationMinutes;
      existing.amount += amount;
    } else {
      byTutor.set(tutorId, {
        tutorId,
        tutorName: row.tutor_name as string,
        sessionCount: 1,
        totalMinutes: durationMinutes,
        amount,
      });
    }
  }

  const tutorPayouts = Array.from(byTutor.values())
    .map((t) => ({ ...t, amount: Math.round(t.amount * 100) / 100, paid: paidMap.get(t.tutorId) ?? false }))
    .sort((a, b) => a.tutorName.localeCompare(b.tutorName));

  const totalAmount = tutorPayouts.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Tutor Payouts</h1>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/payouts?month=${shiftPeriod(period, -1)}`} className="text-sm text-[#16B8A7] hover:underline">
          ← Previous
        </Link>
        <span className="text-sm font-medium">{periodLabel(period)}</span>
        <Link href={`/admin/payouts?month=${shiftPeriod(period, 1)}`} className="text-sm text-[#16B8A7] hover:underline">
          Next →
        </Link>
      </div>
      {tutorPayouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No booked sessions in this month.</p>
      ) : (
        <>
          <AdminPayoutsTable period={period} rows={tutorPayouts} />
          <p className="mt-4 text-sm text-muted-foreground">
            Total for {periodLabel(period)}: <span className="font-semibold text-foreground">{totalAmount.toFixed(2)} PLN</span>
          </p>
        </>
      )}
    </div>
  );
}
