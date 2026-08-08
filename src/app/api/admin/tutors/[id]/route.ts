import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { id } = await params;
  const tutorId = Number(id);
  if (!Number.isInteger(tutorId)) {
    return NextResponse.json({ error: 'Invalid tutor id' }, { status: 400 });
  }

  const body = await req.json();
  const { name, subject, bio, photoUrl, displayOrder } = body;

  if (!name || !bio) {
    return NextResponse.json({ error: 'Name and bio are required' }, { status: 400 });
  }

  const [row] = await sql`
    UPDATE tutor_profiles
    SET name = ${name},
        subject = ${subject ?? null},
        bio = ${bio},
        photo_url = ${photoUrl ?? null},
        display_order = ${displayOrder ?? 0}
    WHERE id = ${tutorId}
    RETURNING id
  `;

  if (!row) {
    return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
  }

  return NextResponse.json({ id: row.id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { id } = await params;
  const tutorId = Number(id);
  if (!Number.isInteger(tutorId)) {
    return NextResponse.json({ error: 'Invalid tutor id' }, { status: 400 });
  }

  const [row] = await sql`
    DELETE FROM tutor_profiles
    WHERE id = ${tutorId}
    RETURNING id
  `;

  if (!row) {
    return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
