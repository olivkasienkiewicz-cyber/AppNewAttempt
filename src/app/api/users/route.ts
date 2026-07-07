import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import type { Role } from '@/lib/store';

export async function GET() {
  const rows = await sql`SELECT * FROM users ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(rowToUser));
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { name, role } = (body ?? {}) as { name?: unknown; role?: unknown };

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 40) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (role !== 'tutor' && role !== 'student') {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  const trimmed = name.trim();
  const roleValue: Role = role;
  const rows = await sql`
    INSERT INTO users (name, role)
    VALUES (${trimmed}, ${roleValue})
    RETURNING *
  `;
  return NextResponse.json(rowToUser(rows[0]), { status: 201 });
}
