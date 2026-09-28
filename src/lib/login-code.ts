import { sql } from '@/lib/db';

// 6-digit sign-in codes. Each code is also the Auth.js verification token,
// so the same value works whether it's typed in or reached via the email button.

export const LOGIN_CODE_TTL_SECONDS = 10 * 60;
export const MAX_CODE_ATTEMPTS = 5;

export function loginTokenSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';
}

// Same normalisation Auth.js applies to the email before storing the token.
export function normalizeLoginEmail(email: string): string {
  return email.normalize('NFKC').toLowerCase().trim();
}

export function generateLoginCode(): string {
  // Rejection sampling keeps every code from 000000 to 999999 equally likely.
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(buf[0] % 1_000_000).padStart(6, '0');
}

// Matches Auth.js's own hashing of verification tokens (SHA-256 of token + secret).
export async function hashLoginToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(`${token}${loginTokenSecret()}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- wrong-guess limit -------------------------------------------------------

export async function isLockedOut(identifier: string): Promise<boolean> {
  const rows = await sql`SELECT failures FROM login_code_attempts WHERE identifier = ${identifier}`;
  return rows.length > 0 && Number(rows[0].failures) >= MAX_CODE_ATTEMPTS;
}

// Records a wrong guess. On the last allowed attempt the code is destroyed,
// so the person has to request a fresh one.
export async function recordFailedAttempt(identifier: string): Promise<void> {
  const rows = await sql`
    INSERT INTO login_code_attempts (identifier, failures, updated_at)
    VALUES (${identifier}, 1, now())
    ON CONFLICT (identifier)
    DO UPDATE SET failures = login_code_attempts.failures + 1, updated_at = now()
    RETURNING failures
  `;
  if (Number(rows[0]?.failures ?? 0) >= MAX_CODE_ATTEMPTS) {
    await sql`DELETE FROM verification_token WHERE identifier = ${identifier}`;
  }
}

export async function clearAttempts(identifier: string): Promise<void> {
  await sql`DELETE FROM login_code_attempts WHERE identifier = ${identifier}`;
}

// Only the newest code should work — drop older ones and reset the counter.
export async function resetForNewCode(identifier: string): Promise<void> {
  await sql`DELETE FROM verification_token WHERE identifier = ${identifier}`;
  await clearAttempts(identifier);
}

// --- email ------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function loginCodeEmail({ code, buttonUrl }: { code: string; buttonUrl: string }) {
  const url = escapeHtml(buttonUrl);
  const subject = `${code} – Twój kod logowania do Studilly / Your Studilly sign-in code`;

  const html = `<!doctype html>
<html lang="pl">
  <body style="margin:0;padding:0;background:#F6F4EF;font-family:Helvetica,Arial,sans-serif;color:#0E2A47;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EF;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#0E2A47;">Studilly</p>

            <p style="margin:0 0 8px;font-size:16px;">Twój kod logowania:</p>
            <p style="margin:0 0 24px;font-size:14px;color:#5F6B7C;">Your sign-in code:</p>

            <p style="margin:0 0 24px;font-size:36px;font-weight:bold;letter-spacing:8px;color:#0E2A47;text-align:center;background:#E1F5EE;border-radius:8px;padding:16px 0;">${code}</p>

            <p style="margin:0 0 4px;font-size:14px;">Wpisz go na stronie logowania albo kliknij przycisk poniżej.</p>
            <p style="margin:0 0 24px;font-size:13px;color:#5F6B7C;">Enter it on the sign-in page, or use the button below.</p>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td style="border-radius:8px;background:#16B8A7;">
                <a href="${url}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Zaloguj się / Sign in</a>
              </td></tr>
            </table>

            <p style="margin:0 0 4px;font-size:12px;color:#5F6B7C;">Kod jest ważny przez 10 minut. Jeśli to nie Ty prosiłeś/aś o logowanie, zignoruj tę wiadomość.</p>
            <p style="margin:0;font-size:12px;color:#5F6B7C;">The code is valid for 10 minutes. If you didn't request it, you can ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `Twój kod logowania do Studilly: ${code}`,
    `Your Studilly sign-in code: ${code}`,
    '',
    `Zaloguj się / Sign in: ${buttonUrl}`,
    '',
    'Kod jest ważny przez 10 minut. / The code is valid for 10 minutes.',
  ].join('\n');

  return { subject, html, text };
}

export async function sendLoginCodeEmail(to: string, code: string, buttonUrl: string): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) throw new Error('AUTH_RESEND_KEY is not set');
  const from = process.env.AUTH_EMAIL_FROM ?? 'Studilly <onboarding@resend.dev>';
  const { subject, html, text } = loginCodeEmail({ code, buttonUrl });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Throwing makes Auth.js report the failure, so the login page shows an error.
    throw new Error(`Resend returned ${res.status}: ${body}`);
  }
}
