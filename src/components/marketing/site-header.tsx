"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LanguageToggle } from "../LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";

export function SiteHeader() {
  const { t } = useLanguage();
  const router = useRouter();

  const goToLogin = () => router.push("/login");

  return (
    <header className="border-b border-[#0E2A47]/10 bg-[#F7F5F0]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center">
          <Image
            src="/brand/studilly-lockup.svg"
            alt="Studilly"
            width={140}
            height={32}
            priority
          />
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/about"
            className="text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
          >
            {t.nav.about}
          </Link>
          <Link
            href="/tutors"
            className="text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
          >
            {t.nav.tutors}
          </Link>
          <Link
            href="/opinions"
            className="text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
          >
            {t.nav.opinions}
          </Link>
          <button
            type="button"
            onClick={goToLogin}
            className="text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
          >
            {t.nav.login}
          </button>
          <button
            type="button"
            onClick={goToLogin}
            className="rounded-full bg-[#16B8A7] px-5 py-2 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
          >
            Get started
          </button>
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}
