"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { LanguageToggle } from "../LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";

export function SiteHeader() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = (session?.user as { role?: 'tutor' | 'student' | 'parent' | null } | undefined)?.role;
  const dashboardHref =
    role === 'tutor' ? '/tutor' : role === 'student' ? '/student' : role === 'parent' ? '/parent' : '/post-login';
  const isSignedIn = status === 'authenticated';

  const goToLogin = () => { setMenuOpen(false); router.push("/login"); };
  const goToDashboard = () => { setMenuOpen(false); router.push(dashboardHref); };

  const navLinks = [
    { href: "/about", label: t.nav.about },
    { href: "/tutors", label: t.nav.tutors },
    { href: "/opinions", label: t.nav.opinions },
    { href: "/pricing", label: t.nav.pricing },
  ];

  return (
    <header className="border-b border-[#0E2A47]/10 bg-[#F7F5F0]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="flex shrink-0 items-center" onClick={() => setMenuOpen(false)}>
          <Image
            src="/brand/studilly-lockup.svg"
            alt="Studilly"
            width={140}
            height={32}
            priority
            className="h-auto w-[110px] sm:w-[140px]"
          />
        </Link>

        {/* Desktop nav — hidden below lg, where it would no longer fit in one row */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <button
              type="button"
              onClick={goToDashboard}
              className="rounded-full bg-[#16B8A7] px-5 py-2 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
            >
              My Account
            </button>
          ) : (
            <>
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
            </>
          )}
          <LanguageToggle />
        </nav>

        {/* Mobile: language toggle stays visible, everything else goes behind the hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#0E2A47] hover:bg-[#0E2A47]/5 transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <nav className="border-t border-[#0E2A47]/10 bg-[#F7F5F0] px-4 py-4 lg:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-[#0E2A47] hover:bg-[#0E2A47]/5 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-[#0E2A47]/10 pt-3">
            {isSignedIn ? (
              <button
                type="button"
                onClick={goToDashboard}
                className="w-full rounded-full bg-[#16B8A7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
              >
                My Account
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-[#0E2A47] hover:bg-[#0E2A47]/5 transition-colors"
                >
                  {t.nav.login}
                </button>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="w-full rounded-full bg-[#16B8A7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
                >
                  Get started
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
