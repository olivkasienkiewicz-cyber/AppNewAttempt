"use client";

import Image from "next/image";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { useLanguage } from "@/context/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
          {t.about.title}
        </h1>
        <p className="mt-6 text-lg text-[#12202B]/80">{t.about.body}</p>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-3xl gap-10 px-6 sm:grid-cols-[160px_1fr] sm:items-start">
          <div className="h-40 w-40 overflow-hidden rounded-full bg-[#7CD8C5]/30">
            <Image
              src="/brand/olivia.jpg"
              alt="Olivia Sienkiewicz"
              width={160}
              height={160}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-instrument-serif)] text-2xl text-[#0E2A47]">
              {t.about.founderHeading}
            </h2>
            <p className="mt-1 text-sm font-medium text-[#16B8A7]">
              Olivia Sienkiewicz
            </p>
            <p className="mt-4 text-[#12202B]/80">{t.about.founderBio}</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
