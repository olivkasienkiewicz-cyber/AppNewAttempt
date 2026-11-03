'use client';

import { useRouter } from 'next/navigation';
import { Gift } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { referralCopy } from '@/lib/referral-copy';

// Homepage "Poleć znajomego" block — sits just above the closing CTA.
export function ReferralSection({ isSignedIn }: { isSignedIn: boolean }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const c = referralCopy[locale];

  return (
    <section className="mx-auto max-w-6xl px-6 pt-20">
      <div className="relative overflow-hidden rounded-3xl bg-[#0E2A47] text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#16B8A7]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#7CD8C5]/10 blur-3xl" />

        <div className="relative grid gap-10 p-8 md:grid-cols-[1.25fr_0.75fr] md:items-center md:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7CD8C5]">{c.homeEyebrow}</p>
            <h2 className="mt-3 font-[family-name:var(--font-instrument-serif)] text-3xl leading-tight md:text-4xl">
              {c.homeTitle}
            </h2>
            <p className="mt-4 max-w-xl text-white/75">{c.homeSubtitle}</p>

            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {c.homeSteps.map((s) => (
                <div key={s.n}>
                  <span className="font-[family-name:var(--font-instrument-serif)] text-3xl text-[#16B8A7]">{s.n}</span>
                  <h3 className="mt-1 text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-white/65">{s.body}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => router.push(isSignedIn ? '/referrals' : '/login')}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#129888]"
            >
              <Gift className="h-4 w-4" />
              {isSignedIn ? c.homeCtaSignedIn : c.homeCtaSignedOut}
            </button>
            <p className="mt-3 text-xs text-white/45">{c.homeFine}</p>
          </div>

          {/* Two stacked "vouchers" — one for you, one for your friend */}
          <div className="relative mx-auto h-56 w-full max-w-xs" aria-hidden="true">
            <Voucher className="absolute left-0 top-0 -rotate-6 bg-[#7CD8C5] text-[#0E2A47]" label={locale === 'pl' ? 'Dla znajomego' : 'For your friend'} />
            <Voucher className="absolute bottom-0 right-0 rotate-3 bg-white text-[#0E2A47]" label={locale === 'pl' ? 'Dla Ciebie' : 'For you'} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Voucher({ className, label }: { className: string; label: string }) {
  return (
    <div className={`flex h-32 w-60 overflow-hidden rounded-2xl shadow-2xl ${className}`}>
      <div className="flex flex-1 flex-col justify-between p-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Studilly · {label}</span>
        <span className="font-[family-name:var(--font-instrument-serif)] text-5xl leading-none">−50 zł</span>
      </div>
      <div className="relative w-10 border-l-2 border-dashed border-[#0E2A47]/20">
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-[#0E2A47]" />
        <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full bg-[#0E2A47]" />
      </div>
    </div>
  );
}
