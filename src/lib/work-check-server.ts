import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { rowToWorkCheck, type WorkCheck } from '@/lib/work-check';

// Server-only helpers for Written Work Check routes and pages.

export async function getWorkCheck(id: string): Promise<WorkCheck | null> {
  const rows = await sql`
    SELECT wc.*, st.name AS student_name, tu.name AS tutor_name
    FROM work_checks wc
    LEFT JOIN users st ON st.id = wc.student_id
    LEFT JOIN users tu ON tu.id = wc.tutor_id
    WHERE wc.id = ${id}
  `;
  return rows[0] ? rowToWorkCheck(rows[0]) : null;
}

// Emails everyone on the student's side of an order: the person who
// ordered it, the student (if different) and the student's linked parent.
// Each address gets one email, personalised with that person's name.
export async function emailOrderParties(
  wc: WorkCheck,
  subject: string,
  html: (name: string) => string
): Promise<void> {
  const rows = await sql`
    SELECT DISTINCT u.email, u.name
    FROM users u
    WHERE u.email IS NOT NULL AND (
      u.id = ${wc.orderedById}
      OR u.id = ${wc.studentId}
      OR u.id = (SELECT parent_id FROM users WHERE id = ${wc.studentId})
    )
  `;
  await Promise.all(
    rows.map((r) =>
      sendEmail({ to: r.email as string, subject, html: html(((r.name as string | null) ?? '').split(' ')[0] || 'there') })
    )
  );
}

export async function notifyUser(userId: string, message: string): Promise<void> {
  try {
    await sql`INSERT INTO notifications (recipient_user_id, message) VALUES (${userId}, ${message})`;
  } catch (err) {
    // A failed in-app notification must never break the order flow.
    console.error('work-check notifyUser failed', err);
  }
}

// Only accept draft/feedback URLs that point at a file the current user
// uploaded through /api/work-checks/upload.
export function isOwnUploadUrl(url: unknown, userId: string): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com') && u.pathname.startsWith(`/work-checks/${userId}/`);
  } catch {
    return false;
  }
}
