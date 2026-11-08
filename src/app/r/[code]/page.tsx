'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { useLanguage } from '@/context/LanguageContext';
import { referralCopy } from '@/lib/referral-copy';
import { savePendingReferralCode } from '@/lib/referral-client';

type Lookup = { valid: true; code: string; referrerName: string | null } | { valid: false };

// Friend landing page: studilly.com/r/AMELIA-K7Q
export default function ReferralLandingPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { locale } = useLanguage();
  const c = referralCopy[locale];
  const { status } = useSession();
  const isSignedIn = status === 'authenticated';

  const rawCode = decodeURIComponent(params?.code ?? '').trim().toUpperCase();
  const [fetched, setFetched] = useState<Lookup | null>(null);
  const lookup: Lookup | null = rawCode ? fetched : { valid: false };

  useEffect(() => {
    if (!rawCode) return;
    fetch(`/api/referrals/lookup/${encodeURIComponent(rawCode)}`)
      .then((res) => res.json())
      .then((d: Lookup) => {
        setFetched(d);
        if (d.valid) savePendingReferralCode(d.code);
      })
      .catch(() => setFetched({ valid: false }));
  }, [rawCode]);

  const go = () => router.push(isSignedIn ? '/student' : '/login');

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="relative overflow-hidden bg-[#0E2A47] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#16B8A7]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-[#7CD8C5]/15 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          {!lookup ? (
            <div className="mx-auto h-40 max-w-md animate-pulse rounded-2xl bg-white/10" />
          ) : !lookup.valid ? (
            <>
              <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl">{c.landingInvalid}</h1>
              <Link
                href="/tutors"
                className="mt-8 inline-block rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold hover:bg-[#129888]"
              >
                {c.landingBrowse}
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7CD8C5]">{c.landingEyebrow}</p>
              <h1 className="mt-4 font-[family-name:var(--font-instrument-serif)] text-5xl leading-[1.05] md:text-6xl">
                {c.landingTitle(lookup.referrerName)}
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-lg text-white/80">{c.landingSubtitle}</p>

              <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-white p-6 text-[#0E2A47] shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">{c.landingCodeLabel}</p>
                <p className="mt-2 rounded-lg border-2 border-dashed border-[#16B8A7]/50 py-3 font-mono text-3xl tracking-[0.12em]">
                  {lookup.code}
                </p>
                <p className="mt-3 font-[family-name:var(--font-instrument-serif)] text-4xl">−50 zł</p>
                <p className="mt-2 text-xs text-[#12202B]/60">{c.landingCodeSaved}</p>
                <button
                  type="button"
                  onClick={go}
                  className="mt-5 w-full rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#129888]"
                >
                  {isSignedIn ? c.landingCtaSignedIn : c.landingCta}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {lookup?.valid && (
        <section className="mx-auto max-w-4xl px-6 py-16">
          <ul className="grid gap-4 sm:grid-cols-3">
            {c.landingPerks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 rounded-md border border-[#0E2A47]/10 bg-white p-5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16B8A7]/15">
                  <Check className="h-3.5 w-3.5 text-[#16B8A7]" />
                </span>
                <span className="text-sm text-[#0E2A47]">{perk}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Link href="/tutors" className="text-sm font-semibold text-[#16B8A7] hover:underline">
              {c.landingBrowse} →
            </Link>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
