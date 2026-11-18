import { sql } from '@/lib/db';
import { rowToSlot } from '@/lib/db-mappers';
import { sendEmail } from '@/lib/email';
import { ADMIN_EMAIL, BANK_DETAILS, amountForSlot, referenceCodeForSlot } from '@/lib/payment';
import { CANONICAL_TIMEZONE } from '@/lib/timezones';

// How long after a class has been held we wait before reminding.
export const REMINDER_DELAY_HOURS = 48;

// Classes held before this date are never reminded automatically, so
// switching the feature on doesn't email families about old sessions.
// Move it earlier if you want the job to chase older unpaid classes too.
export const REMINDERS_START_DATE = '2026-11-15';

// Only outcomes where the family actually owes money (same list as the
// payout-eligible outcomes in slot-outcome.ts).
const PAYABLE_OUTCOMES = ['completed', 'student_absence', 'moved_outside_policy'];

type ReminderItem = {
  slotIds: string[]; // every slot this reminder covers (marked as reminded)
  label: string;
  amount: number;
  referenceCode: string;
};

type Recipient = {
  email: string;
  name: string;
  items: ReminderItem[];
};

export type PaymentReminderResult = {
  dryRun: boolean;
  skipped?: 'no_resend_key';
  recipients: { email: string; items: number }[];
  sent: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

// Finds every unpaid, payable class that ended (or was marked) more than
// REMINDER_DELAY_HOURS ago and hasn't been reminded yet, groups them by
// whoever pays (the linked parent, else the student) and emails each payer
// once. Sessions bought as a bundle are reminded as ONE transfer.
export async function runPaymentReminders({ dryRun }: { dryRun: boolean }): Promise<PaymentReminderResult> {
  if (!dryRun && !process.env.AUTH_RESEND_KEY) {
    // sendEmail() silently skips without a key — don't mark anything as sent.
    return { dryRun, skipped: 'no_resend_key', recipients: [], sent: 0 };
  }

  // Wall-clock class end (stored as Warsaw time) + 48h, but never earlier
  // than 48h after the tutor actually marked the outcome.
  const dueRows = await sql`
    SELECT s.*
    FROM slots s
    WHERE s.status = 'booked'
      AND s.payment_status IS DISTINCT FROM 'paid'
      AND s.payment_reminder_sent_at IS NULL
      AND s.booked_by_student_id IS NOT NULL
      AND s.outcome_status = ANY(${PAYABLE_OUTCOMES})
      AND s.date::date >= ${REMINDERS_START_DATE}::date
      AND GREATEST(
            ((s.date::date + s.start_time::time) AT TIME ZONE ${CANONICAL_TIMEZONE}::text)
              + make_interval(mins => s.duration_minutes::int),
            COALESCE(s.outcome_set_at, '-infinity'::timestamptz)
          ) + make_interval(hours => ${REMINDER_DELAY_HOURS}::int) <= now()
    ORDER BY s.date, s.start_time
  `;
  if (dueRows.length === 0) return { dryRun, recipients: [], sent: 0 };
  const dueSlots = dueRows.map(rowToSlot);

  // Bundles: look up the batch (one transfer, one reference) and all slots in it.
  const batchIds = Array.from(
    new Set(dueSlots.map((s) => s.paymentBatchId).filter((id): id is string => !!id))
  );
  const batchById = new Map<string, { referenceCode: string; amount: number }>();
  const batchSlotIds = new Map<string, string[]>();
  if (batchIds.length > 0) {
    const batchRows = await sql`
      SELECT id, reference_code, amount FROM payment_batches
      WHERE id = ANY(${batchIds}) AND status = 'unpaid'
    `;
    for (const b of batchRows) {
      batchById.set(b.id as string, {
        referenceCode: b.reference_code as string,
        amount: Number(b.amount),
      });
    }
    const memberRows = await sql`
      SELECT id, payment_batch_id FROM slots
      WHERE payment_batch_id = ANY(${batchIds})
        AND payment_status IS DISTINCT FROM 'paid'
        AND payment_reminder_sent_at IS NULL
    `;
    for (const m of memberRows) {
      const key = m.payment_batch_id as string;
      batchSlotIds.set(key, [...(batchSlotIds.get(key) ?? []), m.id as string]);
    }
  }

  // Who pays: the linked parent if there is one, otherwise the student.
  const studentIds = Array.from(new Set(dueSlots.map((s) => s.bookedByStudentId as string)));
  const payerRows = await sql`
    SELECT u.id, u.name, u.email AS student_email, p.name AS parent_name, p.email AS parent_email
    FROM users u
    LEFT JOIN users p ON p.id = u.parent_id
    WHERE u.id = ANY(${studentIds})
  `;
  const payerByStudent = new Map<string, { studentName: string; payerName: string; payerEmail: string | null }>();
  for (const r of payerRows) {
    const parentEmail = (r.parent_email as string | null) || null;
    const studentEmail = (r.student_email as string | null) || null;
    payerByStudent.set(r.id as string, {
      studentName: (r.name as string | null) ?? '',
      payerName: parentEmail ? ((r.parent_name as string | null) ?? '') : ((r.name as string | null) ?? ''),
      payerEmail: parentEmail ?? studentEmail,
    });
  }

  const recipients = new Map<string, Recipient>();
  const seenBatches = new Set<string>();

  for (const slot of dueSlots) {
    const payer = payerByStudent.get(slot.bookedByStudentId as string);
    if (!payer?.payerEmail) {
      console.error('payment reminder: no email to reach payer for slot', slot.id);
      continue;
    }

    let item: ReminderItem;
    if (slot.paymentBatchId) {
      const batch = batchById.get(slot.paymentBatchId);
      if (!batch || seenBatches.has(slot.paymentBatchId)) continue;
      seenBatches.add(slot.paymentBatchId);
      const slotIds = batchSlotIds.get(slot.paymentBatchId) ?? [slot.id];
      item = {
        slotIds,
        label: `${payer.studentName} — pakiet / bundle (${slotIds.length})`,
        amount: batch.amount,
        referenceCode: batch.referenceCode,
      };
    } else {
      const [, mm, dd] = slot.date.split('-');
      item = {
        slotIds: [slot.id],
        label: `${payer.studentName} — ${dd}.${mm}${slot.subject ? ` · ${slot.subject}` : ''}`,
        amount: slot.amount ?? amountForSlot(slot.durationMinutes, slot.subject),
        referenceCode: referenceCodeForSlot(slot.id),
      };
    }

    const key = payer.payerEmail.toLowerCase();
    const existing = recipients.get(key);
    if (existing) existing.items.push(item);
    else recipients.set(key, { email: payer.payerEmail, name: payer.payerName, items: [item] });
  }

  const list = Array.from(recipients.values());
  const summary = list.map((r) => ({ email: r.email, items: r.items.length }));
  if (dryRun) return { dryRun, recipients: summary, sent: 0 };

  let sent = 0;
  for (const r of list) {
    // Claim BEFORE sending, so a timeout or a second run can never email
    // the same family twice about the same session.
    const slotIds = r.items.flatMap((i) => i.slotIds);
    const claimed = await sql`
      UPDATE slots SET payment_reminder_sent_at = now()
      WHERE id = ANY(${slotIds})
        AND payment_reminder_sent_at IS NULL
        AND payment_status IS DISTINCT FROM 'paid'
      RETURNING id
    `;
    if (claimed.length === 0) continue;

    await sendEmail({
      to: r.email,
      subject: 'Przypomnienie o płatności / Payment reminder — Studilly',
      html: reminderHtml(r),
    });
    sent++;
    await sleep(600); // stay under Resend's rate limit
  }

  if (sent > 0) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Payment reminders sent (${sent})`,
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Payment reminders sent</h2>
        <ul>${summary.map((s) => `<li>${esc(s.email)} — ${s.items} item${s.items === 1 ? '' : 's'}</li>`).join('')}</ul>
      </div>`,
    });
  }

  return { dryRun, recipients: summary, sent };
}

// ---------- email template (bilingual, PL first) ----------

const row = (label: string, value: string, bold = false) =>
  `<tr><td style="padding: 4px 0; color: #666;">${label}</td><td style="padding: 4px 0; text-align: right;${bold ? ' font-weight: bold;' : ''}">${value}</td></tr>`;

function itemsTable(items: ReminderItem[]): string {
  return items
    .map(
      (i) => `
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 14px; border-bottom: 1px solid #eee;">
        ${row('Zajęcia / Session', esc(i.label))}
        ${row('Kwota / Amount', `${i.amount.toFixed(2)} PLN`)}
        ${row('Tytuł przelewu / Reference', esc(i.referenceCode), true)}
      </table>`
    )
    .join('');
}

function reminderHtml(r: Recipient): string {
  const name = firstName(r.name);
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #12202B; line-height: 1.5;">
      <h2>Przypomnienie o płatności / Payment reminder</h2>
      <p>${name ? `Dzień dobry ${esc(name)},` : 'Dzień dobry,'}</p>
      <p>nie widzimy jeszcze wpłaty za odbyte zajęcia:</p>
      <p style="margin: 0; color: #16B8A7; font-size: 13px;">Do zapłaty / Due</p>
      ${itemsTable(r.items)}
      <table style="width: 100%; border-collapse: collapse;">
        ${row('Odbiorca / Account holder', BANK_DETAILS.accountHolder)}
        ${row('IBAN', BANK_DETAILS.iban)}
        ${row('Bank', BANK_DETAILS.bankName)}
      </table>
      <p style="color: #666; font-size: 13px;">Prosimy wpisać kod w tytule przelewu dokładnie tak, jak podano. Jeśli przelew został już wysłany, prosimy zignorować tę wiadomość — płatności potwierdzamy ręcznie, więc może to chwilę potrwać. W razie pytań wystarczy odpowiedzieć na ten e-mail.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p>${name ? `Hello ${esc(name)},` : 'Hello,'}</p>
      <p>we haven't received payment yet for the sessions that have taken place (details above).</p>
      <p style="color: #666; font-size: 13px;">Please use the reference code exactly as shown. If you've already sent the transfer, please ignore this message — we confirm payments by hand, so it can take a little while. If you have any questions, just reply to this email.</p>
      <p>Olivia<br/>Studilly</p>
    </div>`;
}
