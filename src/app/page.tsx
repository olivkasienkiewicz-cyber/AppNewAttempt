"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: session, status } = useSession();

  const role = (session?.user as { role?: 'tutor' | 'student' | null } | undefined)?.role;
  const dashboardHref = role === 'tutor' ? '/tutor' : role === 'student' ? '/student' : '/post-login';
  const isSignedIn = status === 'authenticated';

  const goToLogin = () => router.push("/login");
  const goToDashboard = () => router.push(dashboardHref);

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-[#0E2A47] text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <h1 className="font-[family-name:var(--font-instrument-serif)] text-5xl leading-[1.05] md:text-6xl">
              {t.home.heroTitle}
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/80">
              {t.home.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={goToDashboard}
                  className="rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
                >
                  My Account
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
                  >
                    {t.home.cta}
                  </button>
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:border-white/60 transition-colors"
                  >
                    {t.nav.login}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl text-[#0E2A47]">
          {t.home.howItWorksHeading}
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {t.home.steps.map((s) => (
            <div key={s.step}>
              <span className="font-[family-name:var(--font-instrument-serif)] text-3xl text-[#16B8A7]">
                {s.step}
              </span>
              <h3 className="mt-2 font-semibold text-[#0E2A47]">{s.title}</h3>
              <p className="mt-1 text-sm text-[#12202B]/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subject coverage */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl text-[#0E2A47]">
            {t.home.subjectsHeading}
          </h2>
          <p className="mt-2 text-[#12202B]/70">{t.home.subjectsSubheading}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.home.groups.map((g) => (
              <div
                key={g.group}
                className="rounded-md border border-[#0E2A47]/10 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">
                    {g.group}
                  </span>
                  <span className="rounded-full bg-[#7CD8C5]/30 px-2 py-0.5 text-[10px] font-semibold text-[#0E2A47]">
                    {t.home.hlSlBadge}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#0E2A47]">{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* University application support */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl text-[#0E2A47]">
          {t.home.applicationSupportHeading}
        </h2>
        <p className="mt-2 text-[#12202B]/70">
          {t.home.applicationSupportSubheading}
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {t.home.applicationServices.map((service) => (
            <div
              key={service.title}
              className="rounded-md border border-[#0E2A47]/10 bg-white p-6"
            >
              <h3 className="font-semibold text-[#0E2A47]">{service.title}</h3>
              <p className="mt-2 text-sm text-[#12202B]/70">{service.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl text-[#0E2A47]">
          {t.home.closingHeading}
        </h2>
        {isSignedIn ? (
          <button
            type="button"
            onClick={goToDashboard}
            className="mt-6 inline-block rounded-full bg-[#16B8A7] px-8 py-3 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
          >
            My Account
          </button>
        ) : (
          <button
            type="button"
            onClick={goToLogin}
            className="mt-6 inline-block rounded-full bg-[#16B8A7] px-8 py-3 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
          >
            {t.home.cta}
          </button>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
