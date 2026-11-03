import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/payment';
import { listAnnouncementRecipients } from '@/lib/referral-announcement';
import { AnnounceControls } from './AnnounceControls';

export const dynamic = 'force-dynamic';

function ddmm(value: unknown): string {
  const d = new Date(value as string);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function AdminReferralsPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) notFound();

  const [all, pending] = await Promise.all([
    listAnnouncementRecipients(false),
    listAnnouncementRecipients(true),
  ]);
  const referrals = await sql`
    SELECT r.status, r.created_at, r.rewarded_at, ref.name AS referrer, fr.name AS friend, d.code
    FROM referrals r
    JOIN users ref ON ref.id = r.referrer_id
    JOIN users fr ON fr.id = r.referred_id
    JOIN discount_codes d ON d.id = r.referral_code_id
    ORDER BY r.created_at DESC
  `;
  const rewarded = referrals.filter((r) => r.status === 'rewarded').length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/bookings" className="text-[#16B8A7] hover:underline">Bookings</Link>
        <Link href="/admin/payouts" className="text-[#16B8A7] hover:underline">Payouts</Link>
        <Link href="/admin/work-checks" className="text-[#16B8A7] hover:underline">Work checks</Link>
      </div>

      <p className="eyebrow">Admin</p>
      <h1 className="font-display text-4xl text-foreground">Referrals</h1>

      <section className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Referrals', referrals.length],
          ['Rewarded', rewarded],
          ['Discount given', `${(referrals.length + rewarded) * 50} zł`],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-border p-4">
            <p className="font-display text-3xl text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-border p-5">
        <h2 className="font-display text-2xl text-foreground">Announcement email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sends every student and parent their personal code (parents get their child&apos;s code).
          {' '}{all.length - pending.length} of {all.length} already sent · {pending.length} waiting.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          &quot;Send test to me&quot; emails you one student and one parent version first. Each person is only ever emailed once.
        </p>
        <div className="mt-4">
          <AnnounceControls pending={pending.length} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl text-foreground">All referrals</h2>
        {referrals.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No referrals yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border text-sm">
            {referrals.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <strong>{r.referrer as string}</strong> → {r.friend as string}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{r.code as string}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {ddmm(r.created_at)} · {r.status === 'rewarded' ? `rewarded ${ddmm(r.rewarded_at)}` : 'waiting for first lesson'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
