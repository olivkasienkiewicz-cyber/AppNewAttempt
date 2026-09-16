import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { rowToSlot, rowToUser } from '@/lib/db-mappers';
import { isValidOutcomeStatus } from '@/lib/slot-outcome';
import { sendEmail } from '@/lib/email';

const DISCOUNT_VALID_DAYS = 30;
const DISCOUNT_PERCENT = 10;

function generateDiscountCode(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WELCOME10-${random}`;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id: slotId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { outcomeStatus } = (body ?? {}) as { outcomeStatus?: unknown };
  if (typeof outcomeStatus !== 'string' || !isValidOutcomeStatus(outcomeStatus)) {
    return NextResponse.json({ error: 'invalid_outcome_status' }, { status: 400 });
  }

  // Only the tutor who owns this slot can set its outcome — no longer
  // requires the slot to have already ended.
  const updated = await sql`
    UPDATE slots
    SET outcome_status = ${outcomeStatus},
        outcome_set_by = 'tutor',
        outcome_set_at = now()
    WHERE id = ${slotId}
      AND tutor_id = ${session.user.id}
    RETURNING *
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
  }
  const slot = rowToSlot(updated[0]);

  if (outcomeStatus === 'completed' && slot.bookedByStudentId) {
    await maybeSendFirstClassDiscount(slot.bookedByStudentId, slot.subject);
  }

  return NextResponse.json(slot);
}

// Fires once per student, the first time any of their booked slots is
// marked completed — regardless of subject. The generated code excludes
// that same subject, nudging them toward booking a different one.
async function maybeSendFirstClassDiscount(studentId: string, completedSubject: string | null): Promise<void> {
  const studentRows = await sql`SELECT * FROM users WHERE id = ${studentId}`;
  if (studentRows.length === 0) return;
  const student = rowToUser(studentRows[0]);
  const studentEmail = studentRows[0].email as string | undefined;
  const alreadySent = studentRows[0].first_class_discount_sent_at !== null;
  if (alreadySent || !studentEmail) return;

  const [{ completed_count }] = await sql`
    SELECT COUNT(*)::int AS completed_count
    FROM slots
    WHERE booked_by_student_id = ${studentId} AND outcome_status = 'completed'
  `;
  if (Number(completed_count) !== 1) return; // not their first completed class

  const code = generateDiscountCode();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + DISCOUNT_VALID_DAYS);

  await sql`
    INSERT INTO discount_codes (code, discount_type, discount_value, applies_to, valid_until, single_use, excluded_subject)
    VALUES (${code}, 'percent', ${DISCOUNT_PERCENT}, 'both', ${validUntil.toISOString()}, false, ${completedSubject})
  `;

  // Mark as sent BEFORE emailing — an email failure shouldn't cause a
  // retry that creates a second code (sendEmail never throws, but this
  // keeps the guard correct even if that changes later).
  await sql`
    UPDATE users SET first_class_discount_sent_at = now() WHERE id = ${studentId}
  `;

  await sendEmail({
    to: studentEmail,
    subject: 'Prezent za pierwszą lekcję / A gift for your first class 🎉',
    html: firstClassDiscountEmailHtml({
      studentName: student.name,
      code,
      validUntilDdmm: formatDdmm(validUntil),
    }),
  });
}

function formatDdmm(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

function firstClassDiscountEmailHtml(args: {
  studentName: string;
  code: string;
  validUntilDdmm: string;
}): string {
  const { studentName, code, validUntilDdmm } = args;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="text-align: center; font-size: 32px; margin-bottom: 4px;">🇵🇱</div>
      <h2>Gratulacje z okazji pierwszej lekcji z Studilly!</h2>
      <p>Cześć ${studentName},</p>
      <p>Mamy nadzieję, że Twoja pierwsza lekcja bardzo Ci się podobała! Widzimy Twoje zaangażowanie i wierzymy, że możesz osiągnąć swoje wymarzone oceny — nasi korepetytorzy są tutaj, żeby Ci w tym pomóc.</p>
      <p>W ramach podziękowania mamy dla Ciebie prezent: kod <strong>${code}</strong> daje Ci 10% zniżki na kolejną lekcję lub pakiet z innego przedmiotu, albo na wsparcie w aplikacji na studia.</p>
      <p>Kod ważny do <strong>${validUntilDdmm}</strong>.</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

      <div style="text-align: center; font-size: 32px; margin-bottom: 4px;">🇬🇧</div>
      <h2>Congrats on your first class with Studilly!</h2>
      <p>Hi ${studentName},</p>
      <p>We hope you loved your first class! We can see your ambition, and we believe you can achieve your top grades — our tutors are here to help you get there.</p>
      <p>As a thank-you, we have a gift for you: code <strong>${code}</strong> gets you 10% off your next class or package in a different subject, or our university application support.</p>
      <p>Valid until <strong>${validUntilDdmm}</strong>.</p>
    </div>
  `;
}
