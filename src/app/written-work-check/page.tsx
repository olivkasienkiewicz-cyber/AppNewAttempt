"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { useLanguage } from "@/context/LanguageContext";
import { WORK_CHECK_CONFIG, WORK_CHECK_PRODUCTS } from "@/lib/work-check";

const serif = "font-[family-name:var(--font-instrument-serif)]";

export default function WrittenWorkCheckPage() {
  const { t, locale } = useLanguage();
  const { status } = useSession();
  const w = t.workCheck;
  const orderHref = status === "authenticated" ? "/written-work-check/order" : "/login";

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">{w.eyebrow}</p>
        <h1 className={`${serif} mt-3 max-w-3xl text-4xl text-[#0E2A47] md:text-5xl`}>{w.title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-[#12202B]/75">{w.subtitle}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={orderHref}
            className="rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#129888]"
          >
            {w.cta}
          </Link>
          {status === "authenticated" && (
            <Link
              href="/checks"
              className="rounded-full border border-[#0E2A47]/20 px-6 py-3 text-sm font-semibold text-[#0E2A47] transition-colors hover:bg-[#0E2A47]/5"
            >
              {w.myChecks}
            </Link>
          )}
        </div>
        {status === "unauthenticated" && <p className="mt-3 text-sm text-[#12202B]/60">{w.loginRequired}</p>}
      </section>

      {/* Prices */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className={`${serif} text-3xl text-[#0E2A47]`}>{w.pricesHeading}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORK_CHECK_PRODUCTS.map((p) => {
              const cfg = WORK_CHECK_CONFIG[p];
              return (
                <div key={p} className="rounded-md border border-[#0E2A47]/10 bg-[#F7F5F0] p-5">
                  <p className="text-sm font-semibold text-[#0E2A47]">{cfg.label[locale]}</p>
                  <div className="my-3 border-t border-dashed border-[#0E2A47]/15" />
                  <p className={`${serif} text-3xl text-[#0E2A47]`}>
                    {cfg.fromPrice && <span className="mr-1 text-lg text-[#0E2A47]/60">{w.from}</span>}
                    {cfg.price} PLN
                  </p>
                  <p className="mt-2 text-sm text-[#12202B]/65">{cfg.note[locale]}</p>
                </div>
              );
            })}
          </div>

          <h3 className="mt-10 text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">{w.optionsHeading}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-baseline justify-between rounded-md border border-[#0E2A47]/10 px-4 py-3">
              <span className="text-sm font-medium text-[#0E2A47]">{w.secondLabel}</span>
              <span className="text-sm text-[#12202B]/65">{w.secondNote}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Included + how it works */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <h2 className={`${serif} text-3xl text-[#0E2A47]`}>{w.includedHeading}</h2>
          <ul className="mt-6 space-y-3">
            {w.included.map((item) => (
              <li key={item} className="flex gap-3 text-[#12202B]/80">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#16B8A7]" strokeWidth={2} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={`${serif} text-3xl text-[#0E2A47]`}>{w.howHeading}</h2>
          <ol className="mt-6 space-y-5">
            {w.steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E2A47] text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-[#0E2A47]">{step.title}</p>
                  <p className="text-sm text-[#12202B]/70">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Academic integrity */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex gap-4 rounded-md border border-[#16B8A7]/30 bg-[#7CD8C5]/15 p-6">
          <ShieldCheck className="h-6 w-6 shrink-0 text-[#16B8A7]" strokeWidth={1.75} />
          <div>
            <p className="font-semibold text-[#0E2A47]">{w.integrityHeading}</p>
            <p className="mt-1 text-sm text-[#12202B]/75">{w.integrityBody}</p>
          </div>
        </div>
        <div className="mt-10 text-center">
          <Link
            href={orderHref}
            className="inline-block rounded-full bg-[#16B8A7] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#129888]"
          >
            {w.cta}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
