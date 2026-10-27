import { BANK_DETAILS } from '@/lib/payment';
import { workCheckLabel, type WorkCheck } from '@/lib/work-check';

// Emails for Written Work Check orders. Bilingual (PL first, EN below),
// since the order may be placed by a parent or a student in either language.

const wrap = (inner: string) =>
  `<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #12202B;">${inner}</div>`;

const row = (label: string, value: string, bold = false) =>
  `<tr><td style="padding: 4px 0; color: #666;">${label}</td><td style="padding: 4px 0; text-align: right;${bold ? ' font-weight: bold;' : ''}">${value}</td></tr>`;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function orderLine(wc: WorkCheck): string {
  const extras = wc.secondCheck ? 'ponowne sprawdzenie / 2nd check' : '';
  return `${workCheckLabel(wc.product, 'pl')}${wc.subject ? ` – ${escapeHtml(wc.subject)}` : ''}${extras ? ` (${extras})` : ''}`;
}

function paymentTable(wc: WorkCheck): string {
  return `
    <table style="width: 100%; border-collapse: collapse;">
      ${row('Odbiorca / Account holder', BANK_DETAILS.accountHolder)}
      ${row('IBAN', BANK_DETAILS.iban)}
      ${row('Bank', BANK_DETAILS.bankName)}
      ${row('Kwota / Amount', `${(wc.amount ?? 0).toFixed(2)} PLN`)}
      ${row('Tytuł przelewu / Reference', wc.referenceCode, true)}
    </table>
    <p style="color: #666; font-size: 13px;">Prosimy wpisać kod w tytule przelewu. Sprawdzanie zaczyna się po zaksięgowaniu płatności. / Please use the reference code exactly as shown — the check starts once payment is confirmed.</p>`;
}

export function orderReceivedEmail(wc: WorkCheck, name: string): string {
  if (wc.status === 'awaiting_quote') {
    return wrap(`
      <h2>Otrzymaliśmy Twoją pracę / We've received your work</h2>
      <p>Cześć ${escapeHtml(name)},</p>
      <p>Dziękujemy za zamówienie: <strong>${orderLine(wc)}</strong>.</p>
      <p>Potwierdzimy ostateczną cenę w ciągu 1 dnia roboczego i wyślemy dane do przelewu.</p>
      <p style="color: #666;">Thanks for your order. We'll confirm the final price within 1 working day and send you the payment details.</p>
    `);
  }
  return wrap(`
    <h2>Zamówienie przyjęte / Order received</h2>
    <p>Cześć ${escapeHtml(name)},</p>
    <p>Dziękujemy za zamówienie: <strong>${orderLine(wc)}</strong>.</p>
    ${wc.discountCode ? `<p style="color: #16B8A7;">Kod rabatowy <strong>${escapeHtml(wc.discountCode)}</strong> został zastosowany.</p>` : ''}
    <h3>Płatność przelewem / Bank transfer</h3>
    ${paymentTable(wc)}
  `);
}

export function quoteReadyEmail(wc: WorkCheck, name: string): string {
  return wrap(`
    <h2>Cena potwierdzona / Price confirmed</h2>
    <p>Cześć ${escapeHtml(name)},</p>
    <p>Potwierdziliśmy cenę dla: <strong>${orderLine(wc)}</strong>.</p>
    ${wc.discountCode ? `<p style="color: #16B8A7;">Kod rabatowy <strong>${escapeHtml(wc.discountCode)}</strong> został zastosowany.</p>` : ''}
    ${paymentTable(wc)}
  `);
}

export function paymentConfirmedEmail(wc: WorkCheck, name: string): string {
  const due = wc.dueAt
    ? new Date(wc.dueAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw' })
    : null;
  return wrap(`
    <h2>Płatność otrzymana / Payment received</h2>
    <p>Cześć ${escapeHtml(name)},</p>
    <p>Płatność za <strong>${orderLine(wc)}</strong> została zaksięgowana.${due ? ` Informację zwrotną otrzymasz najpóźniej <strong>${due}</strong>.` : ''}</p>
    <p style="color: #666;">Payment received — your work is now with a reviewer.${due ? ` Feedback by ${due} at the latest.` : ''}</p>
  `);
}

export function tutorAssignedEmail(wc: WorkCheck, tutorName: string): string {
  const due = wc.dueAt
    ? new Date(wc.dueAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' })
    : '—';
  return wrap(`
    <h2>New Written Work Check</h2>
    <p>Hi ${escapeHtml(tutorName)},</p>
    <p>You've been assigned a written work check.</p>
    <table style="width: 100%; border-collapse: collapse;">
      ${row('Work', `${workCheckLabel(wc.product, 'en')}${wc.subject ? ` – ${escapeHtml(wc.subject)}` : ''}`)}
      ${row('Student', escapeHtml(wc.studentName ?? '—'))}
      ${row('Due', due, true)}
      ${wc.tutorPayout != null ? row('Your payout', `${wc.tutorPayout.toFixed(2)} PLN`) : ''}
    </table>
    <p style="color: #666; font-size: 13px;">Open "Work checks" in your tutor menu to download the draft and upload your feedback. Comments and an assessment against the IB criteria only — please don't rewrite or edit the student's text.</p>
  `);
}

export function feedbackReadyEmail(wc: WorkCheck, name: string): string {
  return wrap(`
    <h2>Informacja zwrotna gotowa / Your feedback is ready</h2>
    <p>Cześć ${escapeHtml(name)},</p>
    <p>Sprawdziliśmy: <strong>${orderLine(wc)}</strong>. Plik z komentarzami znajdziesz w zakładce „Sprawdzanie prac" na swoim koncie Studilly.</p>
    <p style="color: #666;">Your feedback is ready — open "Work checks" in your Studilly account to download it. Want to talk it through? Book a session with your reviewer.</p>
  `);
}

export function adminNewOrderEmail(wc: WorkCheck, orderedBy: string, orderedByEmail: string): string {
  return wrap(`
    <h2>New Written Work Check</h2>
    <table style="width: 100%; border-collapse: collapse;">
      ${row('Work', `${workCheckLabel(wc.product, 'en')}${wc.subject ? ` – ${escapeHtml(wc.subject)}` : ''}`)}
      ${row('Ordered by', `${escapeHtml(orderedBy)} (${escapeHtml(orderedByEmail)})`)}
      ${row('Student', escapeHtml(wc.studentName ?? '—'))}
      ${row('Second check', wc.secondCheck ? 'Yes' : 'No')}
      ${wc.discountCode ? row('Discount code', escapeHtml(wc.discountCode)) : ''}
      ${row('Amount', wc.amount != null ? `${wc.amount.toFixed(2)} PLN` : 'Needs price', true)}
      ${row('Reference', wc.referenceCode, true)}
    </table>
    <p style="color: #666; font-size: 13px;">${wc.status === 'awaiting_quote' ? 'Confirm the price' : 'Confirm payment'} and assign a tutor at /admin/work-checks.</p>
  `);
}
