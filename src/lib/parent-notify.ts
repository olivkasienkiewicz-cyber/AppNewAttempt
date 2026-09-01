import { sql } from '@/lib/db';
import { rowToUser } from '@/lib/db-mappers';
import { sendEmail } from '@/lib/email';

// Looks up the student's linked parent (if any) and emails them. Silently
// does nothing if the student has no parent or the parent has no email —
// callers don't need to check first.
export async function notifyLinkedParent(studentId: string, subject: string, html: string): Promise<void> {
  const studentRows = await sql`SELECT * FROM users WHERE id = ${studentId}`;
  const student = studentRows[0] ? rowToUser(studentRows[0]) : null;
  if (!student?.parentId) return;

  const parentRows = await sql`SELECT * FROM users WHERE id = ${student.parentId}`;
  const parentEmail = parentRows[0]?.email as string | undefined;
  if (!parentEmail) return;

  await sendEmail({ to: parentEmail, subject, html });
}
