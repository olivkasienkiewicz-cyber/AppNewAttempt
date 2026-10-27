import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { ADMIN_EMAIL } from '@/lib/payment';
import { resolveEffectiveUserId } from '@/lib/effective-user';
import { redeemDiscountCode } from '@/lib/discount';
import {
  WORK_CHECK_CONFIG,
  isWorkCheckProduct,
  rowToWorkCheck,
  workCheckLabel,
  workCheckPayout,
  workCheckPrice,
} from '@/lib/work-check';
import { adminNewOrderEmail, orderReceivedEmail } from '@/lib/work-check-email';
import { emailOrderParties, getWorkCheck, isOwnUploadUrl } from '@/lib/work-check-server';

export const dynamic = 'force-dynamic';

const MAX_NOTE_LEN = 1000;
const MAX_SUBJECT_LEN = 80;

// GET — the current user's Written Work Checks.
//   student → orders for them
//   parent  → orders for their linked student(s) or placed by them
//   tutor   → paid/delivered orders assigned to them
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const me = session.user.id;
  const [user] = await sql`SELECT role FROM users WHERE id = ${me}`;
  const role = user?.role as string | undefined;

  const rows =
    role === 'tutor'
      ? await sql`
          SELECT wc.*, st.name AS student_name, tu.name AS tutor_name
          FROM work_checks wc
          LEFT JOIN users st ON st.id = wc.student_id
          LEFT JOIN users tu ON tu.id = wc.tutor_id
          WHERE wc.tutor_id = ${me} AND wc.status IN ('paid', 'delivered')
          ORDER BY (wc.status = 'paid') DESC, wc.due_at ASC NULLS LAST, wc.created_at DESC
        `
      : await sql`
          SELECT wc.*, st.name AS student_name, tu.name AS tutor_name
          FROM work_checks wc
          LEFT JOIN users st ON st.id = wc.student_id
          LEFT JOIN users tu ON tu.id = wc.tutor_id
          WHERE wc.student_id = ${me}
             OR wc.ordered_by_id = ${me}
             OR wc.student_id IN (SELECT id FROM users WHERE parent_id = ${me})
          ORDER BY wc.created_at DESC
        `;

  const checks = rows.map(rowToWorkCheck).map((wc) =>
    // Students/parents don't see what the tutor is paid.
    role === 'tutor' ? wc : { ...wc, tutorPayout: null }
  );
  return NextResponse.json({ checks });
}

// POST — place a new Written Work Check order.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const me = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { product, subject, secondCheck, note, draftUrl, draftName, discountCode } = body;
  if (!isWorkCheckProduct(product)) {
    return NextResponse.json({ error: 'invalid_product' }, { status: 400 });
  }
  const cfg = WORK_CHECK_CONFIG[product];
  const subjectText = typeof subject === 'string' ? subject.trim().slice(0, MAX_SUBJECT_LEN) : '';
  if (cfg.needsSubject && !subjectText) {
    return NextResponse.json({ error: 'subject_required' }, { status: 400 });
  }
  if (!isOwnUploadUrl(draftUrl, me)) {
    return NextResponse.json({ error: 'draft_required' }, { status: 400 });
  }
  const fileName = typeof draftName === 'string' && draftName.trim() ? draftName.trim().slice(0, 200) : 'draft';
  const noteText = typeof note === 'string' && note.trim() ? note.trim().slice(0, MAX_NOTE_LEN) : null;
  const opts = { secondCheck: secondCheck === true };
  const codeText = typeof discountCode === 'string' && discountCode.trim() ? discountCode.trim().toUpperCase() : null;

  const [me_row] = await sql`SELECT id, name, email, role FROM users WHERE id = ${me}`;
  if (!me_row || me_row.role === 'tutor') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const studentId = await resolveEffectiveUserId(me);

  // "From" products wait for the admin to confirm the final price; the
  // discount code (if any) is stored and redeemed at that point instead.
  const status = cfg.fromPrice ? 'awaiting_quote' : 'awaiting_payment';
  const listPrice = cfg.fromPrice ? null : workCheckPrice(product, opts);
  const payout = cfg.fromPrice ? null : workCheckPayout(product, opts);

  const [inserted] = await sql`
    INSERT INTO work_checks (
      product, subject, second_check, status, amount, discount_code,
      student_id, ordered_by_id, tutor_payout, student_note, draft_url, draft_name
    ) VALUES (
      ${product}, ${cfg.needsSubject ? subjectText : null}, ${opts.secondCheck}, ${status},
      ${listPrice}, ${cfg.fromPrice ? codeText : null},
      ${studentId}, ${me}, ${payout}, ${noteText}, ${draftUrl}, ${fileName}
    )
    RETURNING id
  `;
  const id = inserted.id as string;

  // Discount is applied after the order exists, so a bad code never blocks
  // the order itself — same behaviour as single-session bookings.
  let discountError: string | null = null;
  if (!cfg.fromPrice && codeText && listPrice != null) {
    const result = await redeemDiscountCode(codeText, studentId, listPrice, 'single');
    if (result.ok) {
      await sql`UPDATE work_checks SET amount = ${result.discountedAmount}, discount_code = ${result.code} WHERE id = ${id}`;
    } else {
      discountError = result.error;
    }
  }

  const wc = (await getWorkCheck(id))!;

  await Promise.all([
    emailOrderParties(
      wc,
      wc.status === 'awaiting_quote'
        ? `Studilly – otrzymaliśmy Twoją pracę (${workCheckLabel(wc.product, 'pl')})`
        : `Studilly – dane do przelewu (${workCheckLabel(wc.product, 'pl')})`,
      (name) => orderReceivedEmail(wc, name)
    ),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New work check: ${workCheckLabel(wc.product, 'en')}${wc.subject ? ` – ${wc.subject}` : ''}`,
      html: adminNewOrderEmail(wc, (me_row.name as string) ?? '—', (me_row.email as string) ?? '—'),
    }),
  ]);

  return NextResponse.json({ check: { ...wc, tutorPayout: null }, discountError });
}
