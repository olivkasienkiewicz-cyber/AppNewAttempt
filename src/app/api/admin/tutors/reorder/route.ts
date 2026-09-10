import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const orderedIds = body.orderedIds;

  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'number')) {
    return NextResponse.json({ error: 'orderedIds must be an array of numbers' }, { status: 400 });
  }

  await Promise.all(
    orderedIds.map((id: number, index: number) =>
      sql`UPDATE tutor_profiles SET display_order = ${index} WHERE id = ${id}`
    )
  );

  return NextResponse.json({ success: true });
}
