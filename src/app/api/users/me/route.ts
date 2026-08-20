import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import type { Role } from '@/lib/store';
import {
  ALL_SUBJECTS,
  LEVEL_OPTIONS,
  MAX_DETAIL_LEN,
  isMultiInstanceSubject,
  subjectDetailRequired,
  subjectRequiresLevel,
  subjectSupportsDetail,
  type TutorSubject,
} from '@/lib/subjects';

const MAX_NAME = 40;
const MAX_SUBJECTS = 20;

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

  const { name, role, subjects } = (body ?? {}) as {
    name?: unknown;
    role?: unknown;
    subjects?: unknown;
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

  let nextSubjects: TutorSubject[] = existing.subjects;
  if (subjects !== undefined) {
    if (!Array.isArray(subjects)) {
      return NextResponse.json({ error: 'invalid_subjects' }, { status: 400 });
    }
    if (subjects.length > MAX_SUBJECTS) {
      return NextResponse.json({ error: 'too_many_subjects' }, { status: 400 });
    }

    const validated: TutorSubject[] = [];
    const seen = new Set<string>();

    for (const item of subjects) {
      if (typeof item !== 'object' || item === null) {
        return NextResponse.json({ error: 'invalid_subjects' }, { status: 400 });
      }
      const subjectName = (item as Record<string, unknown>).subject;
      const level = (item as Record<string, unknown>).level;
      const detail = (item as Record<string, unknown>).detail;

      if (typeof subjectName !== 'string' || !(ALL_SUBJECTS as readonly string[]).includes(subjectName)) {
        return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
      }

      let normalizedLevel: string | null = null;
      if (subjectRequiresLevel(subjectName)) {
        if (level !== null && level !== undefined) {
          if (typeof level !== 'string' || !(LEVEL_OPTIONS as readonly string[]).includes(level)) {
            return NextResponse.json({ error: 'invalid_level' }, { status: 400 });
          }
          normalizedLevel = level;
        }
      } else if (level !== null && level !== undefined) {
        return NextResponse.json({ error: 'invalid_level' }, { status: 400 });
      }

      let normalizedDetail: string | null = null;
      if (subjectSupportsDetail(subjectName)) {
        if (typeof detail === 'string') {
          const trimmedDetail = detail.trim();
          if (trimmedDetail.length > MAX_DETAIL_LEN) {
            return NextResponse.json({ error: 'invalid_detail' }, { status: 400 });
          }
          normalizedDetail = trimmedDetail.length > 0 ? trimmedDetail : null;
        }
        if (subjectDetailRequired(subjectName) && !normalizedDetail) {
          return NextResponse.json({ error: 'detail_required' }, { status: 400 });
        }
      } else if (detail !== null && detail !== undefined) {
        return NextResponse.json({ error: 'invalid_detail' }, { status: 400 });
      }

      // Dedup key: for multi-instance subjects, include the normalized
      // detail so distinct entries (different custom subjects, different
      // exam components) don't collide; for everything else, the subject
      // name alone is still the unique identity.
      const dedupKey = isMultiInstanceSubject(subjectName)
        ? `${subjectName}:${(normalizedDetail ?? '').toLowerCase()}`
        : subjectName;
      if (seen.has(dedupKey)) {
        return NextResponse.json({ error: 'duplicate_subject' }, { status: 400 });
      }
      seen.add(dedupKey);

      validated.push({ subject: subjectName, level: normalizedLevel, detail: normalizedDetail });
    }

    nextSubjects = validated;
  }

  const rows = await sql`
    UPDATE users
    SET name = ${nextName}, role = ${nextRole}, subjects = ${JSON.stringify(nextSubjects)}::jsonb
    WHERE id = ${session.user.id}
    RETURNING *
  `;

  return NextResponse.json(rowToUser(rows[0]));
}
