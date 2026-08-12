import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import type { Role } from '@/lib/store';

const MAX_NAME = 40;
const MAX_SUBJECT = 60;
const MAX_LEVEL = 20;

// Completes onboarding for the *currently signed-in* user, and also serves
// as the general "edit my profile" endpoint. All fields are optional on
// this call — any field omitted from the body keeps its existing value.
// There is no id in the request body — the row to update comes entirely
// from the session, so there's no way to edit someone else's account.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { name, role, subject, level } = (body ?? {}) as {
    name?: unknown;
    role?: unknown;
    subject?: unknown;
    level?: unknown;
  };

  const existingRows = await sql`SELECT * FROM users WHERE id = ${session.user.id}`;
  if (existingRows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const existing = rowToUser(existingRows[0]);

  let nextName = existing.name;
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > MAX_NAME) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    }
    nextName = name.trim();
  }

  let nextRole: Role = existing.role;
  if (role !== undefined) {
    if (role !== 'tutor' && role !== 'student') {
      return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
    }
    nextRole = role;
  }

  let nextSubject: string | null = existing.subject;
  if (subject !== undefined) {
    if (subject === null) {
      nextSubject = null;
    } else if (typeof subject === 'string') {
      const trimmedSubject = subject.trim();
      if (trimmedSubject.length > MAX_SUBJECT) {
        return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
      }
      nextSubject = trimmedSubject.length > 0 ? trimmedSubject : null;
    } else {
      return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
    }
  }

  let nextLevel: string | null = existing.level;
  if (level !== undefined) {
    if (level === null) {
      nextLevel = null;
    } else if (typeof level === 'string') {
      const trimmedLevel = level.trim();
      if (trimmedLevel.length > MAX_LEVEL) {
        return NextResponse.json({ error: 'invalid_level' }, { status: 400 });
      }
      nextLevel = trimmedLevel.length > 0 ? trimmedLevel : null;
    } else {
      return NextResponse.json({ error: 'invalid_level' }, { status: 400 });
    }
  }

  const rows = await sql`
    UPDATE users
    SET name = ${nextName}, role = ${nextRole}, subject = ${nextSubject}, level = ${nextLevel}
    WHERE id = ${session.user.id}
    RETURNING *
  `;

  return NextResponse.json(rowToUser(rows[0]));
}
