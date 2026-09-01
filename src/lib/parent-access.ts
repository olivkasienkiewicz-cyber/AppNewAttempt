import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';

// True if actorId is either studentId itself, or a parent linked to that
// student (users.parent_id = actorId, users.role = 'parent'). Used to
// authorize booking/cancelling/rescheduling on a student's behalf.
export async function isSelfOrLinkedParent(actorId: string, studentId: string): Promise<boolean> {
  if (actorId === studentId) return true;
  const [actorRows, studentRows] = await Promise.all([
    sql`SELECT * FROM users WHERE id = ${actorId}`,
    sql`SELECT * FROM users WHERE id = ${studentId}`,
  ]);
  const actor = actorRows[0] ? rowToUser(actorRows[0]) : null;
  const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
  return actor?.role === 'parent' && student?.parentId === actor.id;
}
