type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

const RESEND_API_URL = 'https://api.resend.com/emails';

// Sends transactional email straight through Resend's REST API — no new
// SDK dependency, reuses the same env vars as the Auth.js magic-link
// provider in src/auth.ts (AUTH_RESEND_KEY, AUTH_EMAIL_FROM).
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.error('sendEmail: AUTH_RESEND_KEY is not set, skipping send.');
    return;
  }
  const from = process.env.AUTH_EMAIL_FROM ?? 'Studilly <onboarding@resend.dev>';

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`sendEmail: Resend returned ${res.status}`, body);
    }
  } catch (err) {
    // An email failure must never break a booking that already succeeded.
    console.error('sendEmail: request to Resend failed', err);
  }
}
