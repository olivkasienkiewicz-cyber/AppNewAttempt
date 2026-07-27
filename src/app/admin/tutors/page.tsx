import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';
import { AdminTutorsTable } from './AdminTutorsTable';

export default async function AdminTutorsPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    notFound();
  }

  const rows = await sql`
    SELECT id, name, subject, bio, photo_url, display_order
    FROM tutor_profiles
    ORDER BY display_order ASC, id ASC
  `;

  const tutors = rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    subject: (row.subject as string | null) ?? '',
    bio: row.bio as string,
    photoUrl: (row.photo_url as string | null) ?? '',
    displayOrder: row.display_order as number,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Manage Tutors</h1>
      <AdminTutorsTable tutors={tutors} />
    </div>
  );
}
