import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await params;

  const rows = await sql`SELECT tutor_id FROM availability_windows WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (rows[0].tutor_id !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await sql`DELETE FROM availability_windows WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
