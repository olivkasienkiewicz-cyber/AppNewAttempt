"use client";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { useLanguage } from "@/context/LanguageContext";

type Opinion = {
  name: string;
  text: string;
  color: string;
};

const opinions: Opinion[] = [
  {
    name: "Gabriela",
    text: "Mega polecam zarówno korki z math ai hl jak i economics. Dzięki korkom z matematyki czułam się bardzo dobrze przygotowana do matury z matematyki. Z ekonomii natomiast Olivia pomogła mi z dopracowaniem commentary na ostatnią chwilę co znacznie zwiększyło poziom moich prac",
    color: "#16B8A7",
  },
  {
    name: "Amelia",
    text: "Korepetycje z math ai sl z Olivią bardzo mi pomogły w przygotowaniu do matury. Dzięki niej podeszłam do egzaminu bez stresu i czułam się dużo pewniej. Olivia zawsze była otwarta, pomocna i wszystko spokojnie tłumaczyła. Bardzo polecam! 😊",
    color: "#0E2A47",
  },
  {
    name: "Wiktoria",
    text: "Bardzo polecam zajęcia z ekonomii z Olivią. Zawsze była dobrze przygotowana do lekcji, zaangażowana i tłumaczyła materiał w sposób jasny i zrozumiały. Podczas zajęć robiła notatki, dzięki czemu po każdej lekcji miałam materiały, do których mogłam wrócić podczas nauki. Olivia była również bardzo pomocna poza zajęciami i chętnie odpowiadała na dodatkowe pytania. Dzięki jej wsparciu dużo łatwiej było mi zrozumieć materiał i przygotować się do egzaminów.",
    color: "#7CD8C5",
  },
];

export default function OpinionsPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
          {t.opinions.title}
        </h1>
        <p className="mt-4 text-lg text-[#12202B]/70">{t.opinions.subtitle}</p>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {opinions.map((opinion) => {
            const initial = opinion.name.charAt(0).toUpperCase();
            return (
              <div
                key={opinion.name}
                className="flex flex-col rounded-2xl border border-[#0E2A47]/10 bg-[#F7F5F0] p-6 shadow-sm"
              >
                <p className="flex-1 text-sm leading-relaxed text-[#12202B]/85">
                  “{opinion.text}”
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: opinion.color }}
                  >
                    {initial}
                  </div>
                  <span className="text-sm font-medium text-[#0E2A47]">
                    {opinion.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
