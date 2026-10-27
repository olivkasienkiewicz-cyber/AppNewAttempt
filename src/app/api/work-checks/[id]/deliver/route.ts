import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';
import { workCheckLabel } from '@/lib/work-check';
import { feedbackReadyEmail } from '@/lib/work-check-email';
import { emailOrderParties, getWorkCheck, isOwnUploadUrl, notifyUser } from '@/lib/work-check-server';

export const dynamic = 'force-dynamic';

const MAX_SUMMARY_LEN = 4000;

// POST — the assigned tutor (or the admin) hands back the feedback.
// Body: { feedbackUrl, feedbackName, feedbackSummary }
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await context.params;
  const wc = await getWorkCheck(id);
  if (!wc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const isAdmin = session.user.email === ADMIN_EMAIL;
  if (!isAdmin && wc.tutorId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (wc.status !== 'paid') {
    return NextResponse.json({ error: 'not_in_review' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { feedbackUrl, feedbackName, feedbackSummary } = body;
  if (!isOwnUploadUrl(feedbackUrl, session.user.id)) {
    return NextResponse.json({ error: 'feedback_file_required' }, { status: 400 });
  }
  const name = typeof feedbackName === 'string' && feedbackName.trim() ? feedbackName.trim().slice(0, 200) : 'feedback';
  const summary =
    typeof feedbackSummary === 'string' && feedbackSummary.trim() ? feedbackSummary.trim().slice(0, MAX_SUMMARY_LEN) : null;

  const updated = await sql`
    UPDATE work_checks
    SET status = 'delivered', delivered_at = now(),
        feedback_url = ${feedbackUrl}, feedback_name = ${name}, feedback_summary = ${summary}
    WHERE id = ${id} AND status = 'paid'
    RETURNING id
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_in_review' }, { status: 409 });
  }

  const delivered = (await getWorkCheck(id))!;
  const label = workCheckLabel(delivered.product, 'en');
  await Promise.all([
    emailOrderParties(delivered, 'Studilly – informacja zwrotna gotowa / feedback ready', (n) => feedbackReadyEmail(delivered, n)),
    notifyUser(delivered.studentId, `Your ${label} feedback is ready — see Work checks.`),
    delivered.orderedById !== delivered.studentId
      ? notifyUser(delivered.orderedById, `${delivered.studentName ?? 'Your child'}'s ${label} feedback is ready.`)
      : Promise.resolve(),
  ]);

  return NextResponse.json({ check: delivered });
}
