import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';
import { AdminSubjectRequestsTable } from './AdminSubjectRequestsTable';

export default async function AdminSubjectRequestsPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    notFound();
  }

  const rows = await sql`
    SELECT
      sr.id,
      sr.subject,
      sr.level,
      sr.note,
      sr.status,
      sr.created_at,
      u.name AS requester_name,
      u.email AS requester_email,
      COUNT(*) OVER (PARTITION BY lower(sr.subject)) AS subject_count
    FROM subject_requests sr
    JOIN users u ON u.id = sr.user_id
    ORDER BY subject_count DESC, lower(sr.subject) ASC, sr.created_at ASC
  `;

  const requests = rows.map((row) => ({
    id: row.id as number,
    subject: row.subject as string,
    level: (row.level as string | null) ?? '',
    note: (row.note as string | null) ?? '',
    status: row.status as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    requesterName: row.requester_name as string,
    requesterEmail: row.requester_email as string,
    subjectCount: Number(row.subject_count),
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Subject Requests</h1>
      <AdminSubjectRequestsTable requests={requests} />
    </div>
  );
}
