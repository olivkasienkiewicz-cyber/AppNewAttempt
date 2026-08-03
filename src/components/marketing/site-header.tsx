import Link from "next/link";
import Image from "next/image";
import { LanguageToggle } from "../LanguageToggle";

export function SiteHeader() {
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
            About us
          </Link>
          <Link
            href="/tutors"
            className="text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
          >
            Our tutors
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-[#16B8A7] px-5 py-2 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
          >
            Get started
          </Link>
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}
