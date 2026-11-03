import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { resolveEffectiveUserId } from '@/lib/effective-user';
import { firstName, getOrCreateReferralCode } from '@/lib/referral';
import { REFERRAL_AMOUNT_PLN, referralLink } from '@/lib/referral-copy';

export const dynamic = 'force-dynamic';

// GET — the signed-in student's (or parent's) referral code, the friends
// who used it, and the reward codes they've earned. Parents acting for a
// linked student share that student's code.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const [me] = await sql`SELECT role FROM users WHERE id = ${session.user.id}`;
  if (!me || me.role === 'tutor') {
    return NextResponse.json({ error: 'students_only' }, { status: 403 });
  }
  const ownerId = await resolveEffectiveUserId(session.user.id);
  const code = await getOrCreateReferralCode(ownerId);

  const friends = await sql`
    SELECT r.status, r.created_at, r.rewarded_at, u.name
    FROM referrals r JOIN users u ON u.id = r.referred_id
    WHERE r.referrer_id = ${ownerId}
    ORDER BY r.created_at DESC
  `;
  const rewards = await sql`
    SELECT code, valid_until, redeemed_at, created_at
    FROM discount_codes
    WHERE kind = 'referral_reward' AND owner_user_id = ${ownerId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({
    code: code.code,
    link: referralLink(code.code),
    amount: REFERRAL_AMOUNT_PLN,
    friends: friends.map((f) => ({
      name: firstName(f.name as string) || '—',
      status: f.status as 'pending' | 'rewarded',
      createdAt: new Date(f.created_at as string).toISOString(),
    })),
    rewards: rewards.map((r) => ({
      code: r.code as string,
      validUntil: r.valid_until ? new Date(r.valid_until as string).toISOString() : null,
      used: r.redeemed_at !== null,
    })),
  });
}
