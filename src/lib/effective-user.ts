import { sql } from '@/lib/db';

// Resolves a logged-in session's user id to the id whose data should
// actually be read/written — the parent's own id for tutors/students,
// or their linked student's id when the session belongs to a parent
// account acting on that student's behalf.
export async function resolveEffectiveUserId(sessionUserId: string): Promise<string> {
  const [me] = await sql`SELECT id, role FROM users WHERE id = ${sessionUserId}`;
  if (me?.role === 'parent') {
    const [linkedStudent] = await sql`
      SELECT id FROM users WHERE role = 'student' AND parent_id = ${sessionUserId}
    `;
    if (linkedStudent) return linkedStudent.id as string;
  }
  return sessionUserId;
}
