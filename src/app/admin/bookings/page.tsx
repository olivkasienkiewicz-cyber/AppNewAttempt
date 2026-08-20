import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL, amountForSlot } from '@/lib/payment';
import { AdminBookingsTable } from './AdminBookingsTable';
export default async function AdminBookingsPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    notFound();
  }
  const rows = await sql`
    SELECT
      s.id,
      s.date,
      s.start_time,
      s.duration_minutes,
      s.subject,
      s.payment_status,
      tutor.name AS tutor_name,
      student.name AS student_name
    FROM slots s
    JOIN users tutor ON tutor.id = s.tutor_id
    LEFT JOIN users student ON student.id = s.booked_by_student_id
    WHERE s.status = 'booked'
    ORDER BY s.date DESC, s.start_time DESC
  `;
  const bookings = rows.map((row) => ({
    id: row.id as string,
    date: String(row.date).slice(0, 10),
    startTime: row.start_time as string,
    tutorName: row.tutor_name as string,
    studentName: (row.student_name as string | null) ?? 'Unknown',
    subject: (row.subject as string | null) ?? null,
    amount: amountForSlot(Number(row.duration_minutes), (row.subject as string | null) ?? null),
    paymentStatus: row.payment_status as 'unpaid' | 'paid',
  }));
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">All Bookings</h1>
      <AdminBookingsTable bookings={bookings} />
    </div>
  );
}
