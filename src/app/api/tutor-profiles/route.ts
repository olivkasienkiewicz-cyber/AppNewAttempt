import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`
    SELECT id, name, subject, photo_url
    FROM tutor_profiles
    ORDER BY display_order ASC, id ASC
    LIMIT 8
  `;
  const tutors = rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    subject: (row.subject as string | null) ?? '',
    photoUrl: (row.photo_url as string | null) ?? null,
  }));
  return NextResponse.json(tutors);
}
