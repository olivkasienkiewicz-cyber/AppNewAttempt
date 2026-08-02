"use client";

import { useLanguage } from "@/context/LanguageContext";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setLocale("en")}
        aria-label="Switch to English"
        aria-pressed={locale === "en"}
        className={`text-xl leading-none rounded-full p-1 transition ${
          locale === "en"
            ? "ring-2 ring-[#16B8A7]"
            : "opacity-50 hover:opacity-100"
        }`}
      >
        🇬🇧
      </button>
      <button
        onClick={() => setLocale("pl")}
        aria-label="Switch to Polish"
        aria-pressed={locale === "pl"}
        className={`text-xl leading-none rounded-full p-1 transition ${
          locale === "pl"
            ? "ring-2 ring-[#16B8A7]"
            : "opacity-50 hover:opacity-100"
        }`}
      >
        🇵🇱
      </button>
    </div>
  );
}
