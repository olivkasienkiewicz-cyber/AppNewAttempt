"use client";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { WORK_CHECK_CONFIG, WORK_CHECK_PRODUCTS } from "@/lib/work-check";

export default function PricingPage() {
  const { t, locale } = useLanguage();

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47] md:text-5xl">
          {t.pricing.title}
        </h1>
        <p className="mt-4 max-w-xl text-[#12202B]/70">{t.pricing.subtitle}</p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {t.pricing.tiers.map((tier) => (
            <div
              key={tier.label}
              className="rounded-md border border-[#0E2A47]/10 bg-white p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">
                {tier.label}
              </p>
              <div className="my-3 border-t border-dashed border-[#0E2A47]/15" />
              <p className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
                {tier.price}
              </p>
              <p className="text-sm text-[#0E2A47]/70">{tier.unit}</p>
              <p className="mt-3 text-sm text-[#12202B]/70">{tier.note}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-[#0E2A47]/60">{t.pricing.footnote}</p>
      </section>

      <section id="written-work-check" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl text-[#0E2A47] md:text-4xl">
            {t.pricing.workCheckHeading}
          </h2>
          <p className="mt-4 max-w-xl text-[#12202B]/70">{t.pricing.workCheckSubtitle}</p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {WORK_CHECK_PRODUCTS.map((p) => {
              const cfg = WORK_CHECK_CONFIG[p];
              return (
                <div key={p} className="rounded-md border border-[#0E2A47]/10 bg-[#F7F5F0] p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">
                    {cfg.label[locale]}
                  </p>
                  <div className="my-3 border-t border-dashed border-[#0E2A47]/15" />
                  <p className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
                    {cfg.fromPrice && (
                      <span className="mr-1 text-xl text-[#0E2A47]/60">{t.workCheck.from}</span>
                    )}
                    {cfg.price} PLN
                  </p>
                  <p className="text-sm text-[#0E2A47]/70">{t.pricing.workCheckUnit}</p>
                  <p className="mt-3 text-sm text-[#12202B]/70">{cfg.note[locale]}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-xs text-[#0E2A47]/60">{t.pricing.workCheckFootnote}</p>
          <Link
            href="/written-work-check"
            className="mt-6 inline-block rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#129888]"
          >
            {t.pricing.workCheckCta}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
