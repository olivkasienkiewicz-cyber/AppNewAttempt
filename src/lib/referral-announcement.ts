import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { firstName, getOrCreateReferralCode } from '@/lib/referral';
import { SITE_URL, referralLink } from '@/lib/referral-copy';

export type AnnouncementRecipient = {
  userId: string;
  email: string;
  name: string;
  kind: 'student' | 'parent';
  codeOwnerId: string; // the student whose code this family shares
};

// Students get their own code. Parents get their linked child's code, or
// their own if they book under their own account.
export async function listAnnouncementRecipients(onlyUnsent: boolean): Promise<AnnouncementRecipient[]> {
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.role,
      (SELECT c.id FROM users c WHERE c.role = 'student' AND c.parent_id = u.id LIMIT 1) AS child_id
    FROM users u
    WHERE u.role IN ('student', 'parent')
      AND u.email IS NOT NULL AND u.email <> ''
      AND (${!onlyUnsent} OR u.referral_announcement_sent_at IS NULL)
    ORDER BY u.created_at
  `;
  return rows.map((r) => ({
    userId: r.id as string,
    email: r.email as string,
    name: (r.name as string | null) ?? '',
    kind: r.role === 'parent' ? 'parent' : 'student',
    codeOwnerId: r.role === 'parent' && r.child_id ? (r.child_id as string) : (r.id as string),
  }));
}

const SUBJECT_STUDENT = 'Poleć znajomego — oboje dostajecie 50 zł 🎁 / Refer a friend, you both get 50 zł';
const SUBJECT_PARENT = 'Program poleceń Studilly — 50 zł dla Państwa i znajomych / Studilly referral programme';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendAnnouncement(recipient: AnnouncementRecipient, overrideTo?: string): Promise<string> {
  const { code } = await getOrCreateReferralCode(recipient.codeOwnerId);
  const html = recipient.kind === 'parent'
    ? parentHtml(code)
    : studentHtml(firstName(recipient.name), code);
  await sendEmail({
    to: overrideTo ?? recipient.email,
    subject: recipient.kind === 'parent' ? SUBJECT_PARENT : SUBJECT_STUDENT,
    html,
  });
  return code;
}

// Sends to everyone who hasn't had it yet. Marks each user BEFORE sending,
// so a timeout or double click can never email someone twice.
export async function sendAnnouncementToAll(): Promise<{ sent: number; failed: number }> {
  const recipients = await listAnnouncementRecipients(true);
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const claimed = await sql`
      UPDATE users SET referral_announcement_sent_at = now()
      WHERE id = ${r.userId} AND referral_announcement_sent_at IS NULL
      RETURNING id
    `;
    if (claimed.length === 0) continue;
    try {
      await sendAnnouncement(r);
      sent++;
    } catch (err) {
      console.error('referral announcement failed for', r.userId, err);
      await sql`UPDATE users SET referral_announcement_sent_at = NULL WHERE id = ${r.userId}`;
      failed++;
    }
    await sleep(600); // stay under Resend's rate limit
  }
  return { sent, failed };
}

// ---------- email templates ----------

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shell(eyebrow: string, title: string, body: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #12202B; line-height: 1.5;">
      <div style="background: #0E2A47; color: #fff; padding: 28px 24px; border-radius: 12px 12px 0 0;">
        <p style="margin: 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #7CD8C5;">${eyebrow}</p>
        <h1 style="margin: 8px 0 0; font-size: 24px; line-height: 1.25; font-weight: normal; font-family: Georgia, serif;">${title}</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        ${body}
        <p style="margin-top: 28px; font-size: 12px; color: #888;">Zniżka dotyczy zajęć od 60 minut, pakietów i sprawdzania prac. / Valid on sessions of 60+ minutes, bundles and work checks.</p>
      </div>
    </div>`;
}

function codeBlock(code: string, label: string): string {
  const link = referralLink(code);
  return `
    <div style="margin: 20px 0; padding: 18px; border: 2px dashed #16B8A7; border-radius: 10px; text-align: center; background: #F7F5F0;">
      <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #16B8A7;">${label}</p>
      <p style="margin: 0; font-family: monospace; font-size: 24px; letter-spacing: 2px; color: #0E2A47;"><strong>${esc(code)}</strong></p>
      <p style="margin: 10px 0 0; font-size: 13px;"><a href="${link}" style="color: #16B8A7;">${link.replace('https://', '')}</a></p>
    </div>`;
}

function button(text: string): string {
  return `<p style="text-align: center; margin: 24px 0 8px;"><a href="${SITE_URL}/referrals" style="display: inline-block; background: #16B8A7; color: #fff; padding: 12px 26px; border-radius: 999px; text-decoration: none; font-weight: bold;">${text}</a></p>`;
}

const divider = '<hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;" />';

function steps(items: string[]): string {
  return `<ol style="padding-left: 20px; margin: 12px 0;">${items.map((i) => `<li style="margin-bottom: 6px;">${i}</li>`).join('')}</ol>`;
}

function studentHtml(name: string, code: string): string {
  const hiPl = name ? `Cześć ${esc(name)},` : 'Cześć,';
  const hiEn = name ? `Hi ${esc(name)},` : 'Hi,';
  return shell('Studilly · Polecenia', 'Poleć znajomego — oboje dostajecie 50 zł', `
    <p>${hiPl}</p>
    <p>mamy dla Ciebie coś nowego! Od dziś możesz polecać Studilly znajomym — i oboje na tym zyskujecie.</p>
    ${codeBlock(code, 'Twój osobisty kod')}
    <p><strong>Jak to działa:</strong></p>
    ${steps([
      'Wyślij kod lub link znajomemu.',
      'Znajomy wpisuje go przy pierwszej rezerwacji i od razu płaci 50 zł mniej.',
      'Gdy odbędzie pierwszą lekcję, Ty dostajesz kod na 50 zł zniżki.',
    ])}
    <p>Nie ma limitu — każdy polecony znajomy to kolejne 50 zł dla Ciebie. Teraz to idealny moment: IA, EE i TOK są na finiszu, a próbne matury tuż za rogiem.</p>
    ${button('Zobacz swoje polecenia')}
    <p>Powodzenia w nauce!<br/>Olivia ze Studilly</p>
    ${divider}
    <p>${hiEn}</p>
    <p>we've got something new for you! You can now refer friends to Studilly — and you both benefit.</p>
    ${codeBlock(code, 'Your personal code')}
    <p><strong>How it works:</strong></p>
    ${steps([
      'Send your code or link to a friend.',
      'They enter it on their first booking and pay 50 zł less straight away.',
      'After their first lesson, you get a 50 zł discount code.',
    ])}
    <p>There's no limit — every friend you refer earns you another 50 zł. It's the perfect time too: IAs, EEs and TOK essays are in the final stretch, and mocks are just around the corner.</p>
    ${button('See your referrals')}
    <p>Good luck with your studies!<br/>Olivia from Studilly</p>
  `);
}

function parentHtml(code: string): string {
  return shell('Studilly · Program poleceń', 'Polecaj Studilly — 50 zł dla Państwa i znajomych', `
    <p>Dzień dobry,</p>
    <p>dziękujemy, że wybrali Państwo Studilly. Wiemy, że najlepsze rekomendacje przekazuje się między rodzicami, dlatego uruchomiliśmy program poleceń.</p>
    ${codeBlock(code, 'Kod Państwa rodziny')}
    <p><strong>Jak to działa:</strong></p>
    ${steps([
      'Przekazują Państwo kod lub link znajomej rodzinie — np. na grupie klasowej.',
      'Nowy uczeń wpisuje kod przy pierwszej rezerwacji i płaci 50 zł mniej.',
      'Po jego pierwszej lekcji otrzymują Państwo kod na 50 zł zniżki na kolejne zajęcia, pakiet lub sprawdzenie pracy.',
    ])}
    <p>Liczba poleceń jest nieograniczona. W razie pytań chętnie pomożemy — wystarczy odpowiedzieć na tę wiadomość.</p>
    ${button('Zobacz polecenia')}
    <p>Z pozdrowieniami,<br/>Olivia Sienkiewicz<br/>Studilly</p>
    ${divider}
    <p>Dear Parent,</p>
    <p>thank you for choosing Studilly. We know the best recommendations come from other parents, so we've launched a referral programme.</p>
    ${codeBlock(code, "Your family's code")}
    <p><strong>How it works:</strong></p>
    ${steps([
      'Share the code or link with another family — for example in your class group chat.',
      'The new student enters it on their first booking and pays 50 zł less.',
      'After their first lesson, you receive a 50 zł discount code for your next session, bundle or work check.',
    ])}
    <p>There's no limit on referrals. If you have any questions, just reply to this email.</p>
    ${button('See your referrals')}
    <p>Kind regards,<br/>Olivia Sienkiewicz<br/>Studilly</p>
  `);
}
