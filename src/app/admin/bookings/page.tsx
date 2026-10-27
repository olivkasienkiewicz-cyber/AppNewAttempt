import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL, amountForSlot, referenceCodeForSlot } from '@/lib/payment';
import { isValidOutcomeStatus, type OutcomeStatus } from '@/lib/slot-outcome';
import { AdminBookingsTable, type AdminBooking } from './AdminBookingsTable';

export const dynamic = 'force-dynamic';

// Every booked class, with the status the tutor (or admin) marked.
// Cancelled classes are freed by the cancel route, so they no longer appear;
// classes moved via the tutor's Reschedule show at their new date with the
// status cleared. The table groups classes by what the admin needs to do.
export default async function AdminBookingsPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    notFound();
  }

  const rows = await sql`
    SELECT
      s.id,
      to_char(s.date, 'YYYY-MM-DD') AS date,
      s.start_time,
      s.duration_minutes,
      s.subject,
      s.payment_status,
      s.amount,
      s.discount_code,
      s.outcome_status,
      s.outcome_set_by,
      s.payment_batch_id,
      pb.reference_code AS batch_reference,
      pb.status AS batch_status,
      tutor.name AS tutor_name,
      student.name AS student_name,
      ((s.date + s.start_time::time + make_interval(mins => s.duration_minutes))
        AT TIME ZONE 'Europe/Warsaw') < now() AS has_ended
    FROM slots s
    JOIN users tutor ON tutor.id = s.tutor_id
    LEFT JOIN users student ON student.id = s.booked_by_student_id
    LEFT JOIN payment_batches pb ON pb.id = s.payment_batch_id
    WHERE s.status = 'booked'
    ORDER BY s.date DESC, s.start_time DESC
  `;

  const bookings: AdminBooking[] = rows.map((row) => {
    const durationMinutes = Number(row.duration_minutes);
    const subject = (row.subject as string | null) ?? null;
    const rawOutcome = row.outcome_status as string | null;
    const outcome: OutcomeStatus | null =
      rawOutcome && isValidOutcomeStatus(rawOutcome) ? rawOutcome : null;
    const batchId = (row.payment_batch_id as string | null) ?? null;
    return {
      id: row.id as string,
      date: row.date as string,
      startTime: row.start_time as string,
      durationMinutes,
      tutorName: row.tutor_name as string,
      studentName: (row.student_name as string | null) ?? 'Unknown',
      subject,
      // What the student was actually charged (after discounts); list price for older slots
      amount: row.amount != null ? Number(row.amount) : amountForSlot(durationMinutes, subject),
      discountCode: (row.discount_code as string | null) ?? null,
      paymentStatus: row.payment_status === 'paid' ? 'paid' : 'unpaid',
      outcome,
      outcomeSetBy: (row.outcome_set_by as string | null) ?? null,
      hasEnded: Boolean(row.has_ended),
      batchId,
      batchStatus: (row.batch_status as string | null) ?? null,
      reference: batchId
        ? ((row.batch_reference as string | null) ?? 'Bundle')
        : referenceCodeForSlot(row.id as string),
    };
  });

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <Link href="/admin/work-checks" className="text-sm text-[#16B8A7] hover:underline">Work checks →</Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Students pay for Completed, Student absence and Moved outside policy. Tutor absence and Moved
        per policy are free for the student — if they already paid, the class shows under Refund / credit.
      </p>
      <AdminBookingsTable bookings={bookings} />
    </div>
  );
}
