import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, subject, bio, photoUrl, displayOrder } = body;

  if (!name || !bio) {
    return NextResponse.json({ error: 'Name and bio are required' }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO tutor_profiles (name, subject, bio, photo_url, display_order)
    VALUES (${name}, ${subject ?? null}, ${bio}, ${photoUrl ?? null}, ${displayOrder ?? 0})
    RETURNING id
  `;

  return NextResponse.json({ id: row.id });
}
