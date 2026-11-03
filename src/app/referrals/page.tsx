'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, ChevronLeft, Copy, Gift, Link2, Share2, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { referralCopy } from '@/lib/referral-copy';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';

type ReferralData = {
  code: string;
  link: string;
  amount: number;
  friends: { name: string; status: 'pending' | 'rewarded'; createdAt: string }[];
  rewards: { code: string; validUntil: string | null; used: boolean }[];
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function ReferralsPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const c = referralCopy[locale];
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string | null } | undefined)?.role;
  const backHref = role === 'parent' ? '/parent' : '/student';

  const [data, setData] = useState<ReferralData | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/referrals/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((d: ReferralData) => setData(d))
      .catch(() => setError(true));
  }, [status]);

  const copy = async (text: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success(c.copied);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error(text);
    }
  };

  const share = async () => {
    if (!data) return;
    const text = c.shareMessage(data.code, data.link);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Studilly', text });
        return;
      } catch {
        return; // user closed the share sheet
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const header = (
    <PageHeader>
      <Button variant="ghost" onClick={() => router.push(backHref)} className="h-10">
        <ChevronLeft className="mr-1 h-4 w-4" />
        {c.back}
      </Button>
    </PageHeader>
  );

  if (status === 'unauthenticated') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-24 sm:px-6">
        {header}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Gift className="mx-auto h-8 w-8 text-[#16B8A7]" />
          <h1 className="mt-3 font-display text-3xl text-foreground">{c.signInTitle}</h1>
          <Button className="mt-6" onClick={() => router.push('/login')}>{c.signIn}</Button>
        </div>
      </main>
    );
  }

  const rewardedCount = data?.friends.filter((f) => f.status === 'rewarded').length ?? 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-24 sm:px-6">
      {header}

      <div className="mb-6 space-y-1">
        <p className="eyebrow">{c.pageEyebrow}</p>
        <h1 className="font-display text-4xl text-foreground">{c.pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{c.pageSubtitle}</p>
      </div>

      {/* Code card */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0E2A47] p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#16B8A7]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-[#7CD8C5]/15 blur-2xl" />

        <div className="relative flex items-center gap-2">
          <span className="rounded-full bg-[#16B8A7] px-3 py-1 text-xs font-semibold">−50 zł</span>
          <span className="text-xs text-white/60">+</span>
          <span className="rounded-full bg-[#7CD8C5] px-3 py-1 text-xs font-semibold text-[#0E2A47]">−50 zł</span>
        </div>

        <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#7CD8C5]">{c.yourCode}</p>
        {error ? (
          <p className="relative mt-2 text-sm text-white/80">{c.loadError}</p>
        ) : !data ? (
          <div className="relative mt-2 h-12 w-56 animate-pulse rounded-lg bg-white/10" />
        ) : (
          <button
            type="button"
            onClick={() => copy(data.code, 'code')}
            className="relative mt-2 rounded-lg border-2 border-dashed border-white/25 px-4 py-2 font-mono text-3xl tracking-[0.12em] transition-colors hover:border-[#7CD8C5] sm:text-4xl"
          >
            {data.code}
          </button>
        )}

        <div className="relative mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!data}
            onClick={share}
            className="inline-flex items-center gap-2 rounded-full bg-[#16B8A7] px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[#129888] disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" /> {c.share}
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && copy(data.code, 'code')}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-white/60 disabled:opacity-50"
          >
            {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {c.copyCode}
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && copy(data.link, 'link')}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-white/60 disabled:opacity-50"
          >
            {copied === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {c.copyLink}
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <Users className="h-4 w-4 text-[#16B8A7]" />
          <p className="mt-2 font-display text-3xl text-foreground">{data?.friends.length ?? '–'}</p>
          <p className="text-xs text-muted-foreground">{c.statsInvited}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Sparkles className="h-4 w-4 text-[#16B8A7]" />
          <p className="mt-2 font-display text-3xl text-foreground">{data ? `${rewardedCount * data.amount} zł` : '–'}</p>
          <p className="text-xs text-muted-foreground">{c.statsEarned}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">{c.howTitle}</h2>
        <ol className="mt-4 space-y-3">
          {c.howSteps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-display text-2xl leading-none text-[#16B8A7]">{String(i + 1).padStart(2, '0')}</span>
              <span className="pt-0.5 text-sm text-foreground/80">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Rewards */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">{c.rewardsTitle}</h2>
        {data && data.rewards.length > 0 ? (
          <>
            <ul className="mt-4 space-y-2">
              {data.rewards.map((r) => (
                <li
                  key={r.code}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${r.used ? 'border-border opacity-60' : 'border-[#16B8A7]/40 bg-[#16B8A7]/5'}`}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-base tracking-wider text-foreground">{r.code}</p>
                    <p className="text-xs text-muted-foreground">
                      −{data.amount} zł{r.validUntil ? ` · ${c.rewardValid(formatDate(r.validUntil))}` : ''}
                    </p>
                  </div>
                  {r.used ? (
                    <span className="text-xs font-semibold text-muted-foreground">{c.rewardUsed}</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => copy(r.code, 'code')}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> {c.copyCode}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{c.rewardHint}</p>
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{c.rewardsEmpty}</p>
        )}
      </section>

      {/* Friends */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">{c.friendsTitle}</h2>
        {data && data.friends.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
            {data.friends.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7CD8C5]/30 text-sm font-semibold text-[#0E2A47]">
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(f.createdAt)}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${f.status === 'rewarded' ? 'bg-[#16B8A7]/15 text-[#0E7C70]' : 'bg-muted text-muted-foreground'}`}
                >
                  {f.status === 'rewarded' ? c.statusRewarded : c.statusPending}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{c.friendsEmpty}</p>
        )}
      </section>

      <p className="mt-10 text-xs text-muted-foreground">{c.fine}</p>
    </main>
  );
}
