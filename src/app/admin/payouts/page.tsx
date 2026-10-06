import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL, payoutForSlot } from '@/lib/payment';
import { isPayoutEligible, isValidOutcomeStatus, type OutcomeStatus } from '@/lib/slot-outcome';
import { AdminPayoutsTable, type PayoutRow, type PayoutClass } from './AdminPayoutsTable';

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

  // Every booked class in the month, with its outcome. Payout is only counted
  // for payout-eligible outcomes (see lib/slot-outcome.ts); everything else is
  // listed so the admin can see and fix class statuses.
  const rows = await sql`
    SELECT
      s.id,
      s.tutor_id,
      u.name AS tutor_name,
      st.name AS student_name,
      to_char(s.date, 'YYYY-MM-DD') AS date,
      s.start_time,
      s.duration_minutes,
      s.subject,
      s.payment_status,
      s.outcome_status,
      s.outcome_set_by,
      ((s.date + s.start_time::time + make_interval(mins => s.duration_minutes))
        AT TIME ZONE 'Europe/Warsaw') < now() AS has_ended
    FROM slots s
    JOIN users u ON u.id = s.tutor_id
    LEFT JOIN users st ON st.id = s.booked_by_student_id
    WHERE s.status = 'booked' AND s.date >= ${start} AND s.date < ${end}
    ORDER BY s.date, s.start_time
  `;

  const payoutRows = await sql`
    SELECT tutor_id, paid FROM tutor_payouts WHERE period = ${period}
  `;
  const paidMap = new Map<string, boolean>();
  for (const r of payoutRows) paidMap.set(r.tutor_id as string, r.paid as boolean);

  const byTutor = new Map<string, PayoutRow>();
  for (const row of rows) {
    const tutorId = row.tutor_id as string;
    const rawOutcome = row.outcome_status as string | null;
    const outcome: OutcomeStatus | null = rawOutcome && isValidOutcomeStatus(rawOutcome) ? rawOutcome : null;
    const durationMinutes = Number(row.duration_minutes);
    const cls: PayoutClass = {
      id: row.id as string,
      date: row.date as string,
      startTime: row.start_time as string,
      durationMinutes,
      subject: (row.subject as string | null) ?? '—',
      studentName: (row.student_name as string | null) ?? '—',
      paymentStatus: (row.payment_status as string | null) ?? 'unpaid',
      outcome,
      outcomeSetBy: (row.outcome_set_by as string | null) ?? null,
      hasEnded: Boolean(row.has_ended),
      payout: payoutForSlot(durationMinutes, row.subject as string | null),
    };

    let agg = byTutor.get(tutorId);
    if (!agg) {
      agg = {
        tutorId,
        tutorName: row.tutor_name as string,
        paid: paidMap.get(tutorId) ?? false,
        classes: [],
      };
      byTutor.set(tutorId, agg);
    }
    agg.classes.push(cls);
  }

  const tutorPayouts = Array.from(byTutor.values()).sort((a, b) => a.tutorName.localeCompare(b.tutorName));

  const all = tutorPayouts.flatMap((t) => t.classes);
  const needsStatus = all.filter((c) => c.hasEnded && !c.outcome).length;
  const upcoming = all.filter((c) => !c.hasEnded && !c.outcome).length;
  const totalDue = all.filter((c) => isPayoutEligible(c.outcome)).reduce((sum, c) => sum + c.payout, 0);

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
          <div className="mb-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <div className="text-muted-foreground">Due (eligible classes)</div>
              <div className="text-lg font-semibold">{totalDue.toFixed(2)} PLN</div>
            </div>
            <div className={`rounded-lg border p-3 ${needsStatus > 0 ? 'border-amber-300 bg-amber-50' : 'border-border'}`}>
              <div className="text-muted-foreground">Ended, status missing</div>
              <div className="text-lg font-semibold">{needsStatus}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-muted-foreground">Upcoming</div>
              <div className="text-lg font-semibold">{upcoming}</div>
            </div>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Only Completed, Student absence and Moved outside policy count toward payouts. Click a tutor to see each class and change its status.
          </p>
          <AdminPayoutsTable period={period} rows={tutorPayouts} />
        </>
      )}
    </div>
  );
}
