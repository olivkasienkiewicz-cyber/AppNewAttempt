import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ADMIN_EMAIL } from '@/lib/payment';
import { listAnnouncementRecipients, sendAnnouncement, sendAnnouncementToAll } from '@/lib/referral-announcement';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST { mode: 'test' }  -> one student + one parent version to the admin inbox
// POST { mode: 'all' }   -> everyone who hasn't received it yet
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { mode?: string };

  if (body.mode === 'test') {
    const all = await listAnnouncementRecipients(false);
    const student = all.find((r) => r.kind === 'student');
    const parent = all.find((r) => r.kind === 'parent');
    for (const r of [student, parent]) {
      if (r) await sendAnnouncement(r, ADMIN_EMAIL);
    }
    return NextResponse.json({ ok: true, testSent: [student, parent].filter(Boolean).length });
  }

  if (body.mode === 'all') {
    const result = await sendAnnouncementToAll();
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });
}
