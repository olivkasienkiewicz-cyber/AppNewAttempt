import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { ADMIN_EMAIL } from '@/lib/payment';
import { redeemDiscountCode } from '@/lib/discount';
import { workCheckDueDate, workCheckLabel, workCheckPayout, workCheckPrice } from '@/lib/work-check';
import { paymentConfirmedEmail, quoteReadyEmail, tutorAssignedEmail } from '@/lib/work-check-email';
import { emailOrderParties, getWorkCheck, notifyUser } from '@/lib/work-check-server';

export const dynamic = 'force-dynamic';

// PATCH — admin actions on a Written Work Check.
// Body: { action, ...args }
//   set_price   { basePrice }  "from" products: confirm the base price → awaiting_payment
//   mark_paid                  payment received → paid, due date set
//   mark_unpaid                undo mark_paid
//   assign      { tutorId }    assign (or with null, unassign) the reviewing tutor
//   set_payout  { payout }     override what the tutor is paid
//   cancel                     cancel the order (no payout)
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  const wc = await getWorkCheck(id);
  if (!wc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const opts = { secondCheck: wc.secondCheck };

  switch (body.action) {
    case 'set_price': {
      const basePrice = Number(body.basePrice);
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
      }
      if (wc.status !== 'awaiting_quote' && wc.status !== 'awaiting_payment') {
        return NextResponse.json({ error: 'already_paid' }, { status: 409 });
      }
      const listPrice = workCheckPrice(wc.product, opts, basePrice);
      let amount = listPrice;
      let code: string | null = null;
      // A code typed at order time is redeemed once the price is known.
      // Re-pricing an order that already had its code applied keeps the code
      // without redeeming it twice.
      if (wc.discountCode && wc.status === 'awaiting_quote') {
        const result = await redeemDiscountCode(wc.discountCode, wc.studentId, listPrice, 'single');
        if (result.ok) {
          amount = result.discountedAmount;
          code = result.code;
        }
      } else if (wc.discountCode && wc.amount != null) {
        code = wc.discountCode;
      }
      const payout = workCheckPayout(wc.product, opts, basePrice);
      const wasQuote = wc.status === 'awaiting_quote';
      await sql`
        UPDATE work_checks
        SET base_price = ${basePrice}, amount = ${amount}, discount_code = ${code},
            tutor_payout = ${payout}, status = 'awaiting_payment'
        WHERE id = ${id}
      `;
      const priced = (await getWorkCheck(id))!;
      await emailOrderParties(
        priced,
        `Studilly – ${wasQuote ? 'cena potwierdzona' : 'zaktualizowana cena'} (${workCheckLabel(priced.product, 'pl')})`,
        (n) => quoteReadyEmail(priced, n)
      );
      return NextResponse.json({ check: priced });
    }

    case 'mark_paid': {
      if (wc.status !== 'awaiting_payment') {
        return NextResponse.json({ error: 'not_awaiting_payment' }, { status: 409 });
      }
      const paidAt = new Date();
      const dueAt = workCheckDueDate(paidAt);
      await sql`
        UPDATE work_checks
        SET status = 'paid', paid_at = ${paidAt.toISOString()}, due_at = ${dueAt.toISOString()}
        WHERE id = ${id}
      `;
      const paid = (await getWorkCheck(id))!;
      await emailOrderParties(paid, 'Studilly – płatność otrzymana / payment received', (n) => paymentConfirmedEmail(paid, n));
      if (paid.tutorId) await notifyTutor(paid.tutorId, paid);
      return NextResponse.json({ check: paid });
    }

    case 'mark_unpaid': {
      if (wc.status !== 'paid') {
        return NextResponse.json({ error: 'not_paid' }, { status: 409 });
      }
      await sql`UPDATE work_checks SET status = 'awaiting_payment', paid_at = NULL, due_at = NULL WHERE id = ${id}`;
      return NextResponse.json({ check: await getWorkCheck(id) });
    }

    case 'assign': {
      const tutorId = body.tutorId === null || body.tutorId === '' ? null : String(body.tutorId);
      if (wc.status === 'delivered' || wc.status === 'cancelled') {
        return NextResponse.json({ error: 'closed' }, { status: 409 });
      }
      if (tutorId) {
        const [t] = await sql`SELECT id FROM users WHERE id = ${tutorId} AND role = 'tutor'`;
        if (!t) return NextResponse.json({ error: 'invalid_tutor' }, { status: 400 });
      }
      await sql`UPDATE work_checks SET tutor_id = ${tutorId} WHERE id = ${id}`;
      const assigned = (await getWorkCheck(id))!;
      // Tutors only hear about it once it's paid — otherwise mark_paid
      // sends the email.
      if (tutorId && tutorId !== wc.tutorId && assigned.status === 'paid') {
        await notifyTutor(tutorId, assigned);
      }
      return NextResponse.json({ check: assigned });
    }

    case 'set_payout': {
      const payout = Number(body.payout);
      if (!Number.isFinite(payout) || payout < 0) {
        return NextResponse.json({ error: 'invalid_payout' }, { status: 400 });
      }
      await sql`UPDATE work_checks SET tutor_payout = ${payout} WHERE id = ${id}`;
      return NextResponse.json({ check: await getWorkCheck(id) });
    }

    case 'cancel': {
      if (wc.status === 'delivered') {
        return NextResponse.json({ error: 'already_delivered' }, { status: 409 });
      }
      await sql`UPDATE work_checks SET status = 'cancelled' WHERE id = ${id}`;
      return NextResponse.json({ check: await getWorkCheck(id) });
    }

    default:
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
}

async function notifyTutor(tutorId: string, wc: NonNullable<Awaited<ReturnType<typeof getWorkCheck>>>) {
  const [tutor] = await sql`SELECT name, email FROM users WHERE id = ${tutorId}`;
  if (!tutor) return;
  const label = workCheckLabel(wc.product, 'en');
  await Promise.all([
    tutor.email
      ? sendEmail({
          to: tutor.email as string,
          subject: `New work check: ${label}${wc.subject ? ` – ${wc.subject}` : ''}`,
          html: tutorAssignedEmail(wc, ((tutor.name as string | null) ?? '').split(' ')[0] || 'there'),
        })
      : Promise.resolve(),
    notifyUser(tutorId, `New work check assigned: ${label}${wc.studentName ? ` for ${wc.studentName}` : ''}.`),
  ]);
}
