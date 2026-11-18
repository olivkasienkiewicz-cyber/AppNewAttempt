import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ADMIN_EMAIL } from '@/lib/payment';
import { runPaymentReminders } from '@/lib/payment-reminders';

export const dynamic = 'force-dynamic';

// Runs once a day via Vercel Cron (see vercel.json). When the CRON_SECRET
// env var is set, Vercel sends it as "Authorization: Bearer <CRON_SECRET>".
//
// The admin can also open this URL in a browser while logged in:
//   /api/cron/payment-reminders?dry=1   -> preview who WOULD be emailed
//   /api/cron/payment-reminders         -> run it now
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const isCron = !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
  if (!isCron) {
    const session = await auth();
    if (session?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const dryRun = new URL(req.url).searchParams.get('dry') === '1';
  const result = await runPaymentReminders({ dryRun });
  return NextResponse.json(result);
}
