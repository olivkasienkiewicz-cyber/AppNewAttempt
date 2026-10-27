import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';
import { rowToWorkCheck } from '@/lib/work-check';
import { AdminWorkChecksTable } from './AdminWorkChecksTable';

export const dynamic = 'force-dynamic';

// Every Written Work Check order: confirm "from" prices, confirm payments,
// assign a reviewing tutor and adjust their payout.
export default async function AdminWorkChecksPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    notFound();
  }

  const [rows, tutorRows] = await Promise.all([
    sql`
      SELECT wc.*, st.name AS student_name, tu.name AS tutor_name
      FROM work_checks wc
      LEFT JOIN users st ON st.id = wc.student_id
      LEFT JOIN users tu ON tu.id = wc.tutor_id
      ORDER BY wc.created_at DESC
    `,
    sql`SELECT id, name FROM users WHERE role = 'tutor' ORDER BY name`,
  ]);

  const checks = rows.map(rowToWorkCheck);
  const basePrices: Record<string, number | null> = {};
  for (const r of rows) basePrices[r.id as string] = r.base_price != null ? Number(r.base_price) : null;
  const tutors = tutorRows.map((t) => ({ id: t.id as string, name: t.name as string }));

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Written Work Checks</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/bookings" className="text-[#16B8A7] hover:underline">Bookings</Link>
          <Link href="/admin/payouts" className="text-[#16B8A7] hover:underline">Payouts</Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Delivered checks count toward the tutor&apos;s payout in the month they were delivered.
      </p>
      <AdminWorkChecksTable checks={checks} basePrices={basePrices} tutors={tutors} />
    </div>
  );
}
