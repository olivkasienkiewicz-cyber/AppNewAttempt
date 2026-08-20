import { Mail, Phone } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full bg-[#0E2A47] text-[#F7F5F0]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h3 className="font-[family-name:var(--font-instrument-serif)] text-3xl mb-2">
              Studilly
            </h3>
            <p className="font-[family-name:var(--font-inter)] text-sm text-[#7CD8C5] max-w-xs">
              IB tutoring, done right.
            </p>
          </div>

          <div className="font-[family-name:var(--font-inter)]">
            <h4 className="text-sm uppercase tracking-wide text-[#7CD8C5] mb-3">
              Contact
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="tel:+48666233344" className="flex items-center gap-2 hover:text-[#16B8A7] transition-colors">
                  <Phone className="w-4 h-4 text-[#7CD8C5]" strokeWidth={1.75} />
                  +48 666 233 344
                </a>
              </li>
              <li>
                <a href="mailto:olivia@studilly.com" className="flex items-center gap-2 hover:text-[#16B8A7] transition-colors">
                  <Mail className="w-4 h-4 text-[#7CD8C5]" strokeWidth={1.75} />
                  olivia@studilly.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#16B8A7]/20 mt-10 pt-6 font-[family-name:var(--font-inter)] text-xs text-[#F7F5F0]/60 leading-relaxed">
          <p>Studilly – Olivia Sienkiewicz</p>
          <p>ul. Komfortowa 6, 02-995 Warszawa, Polska</p>
          <p>NIP: 9512653365</p>

          <div className="mt-4 flex gap-4">
            <Link href="/regulamin" className="hover:text-[#16B8A7] transition-colors underline">
              Regulamin
            </Link>
            <Link href="/prywatnosc" className="hover:text-[#16B8A7] transition-colors underline">
              Polityka Prywatności
            </Link>
          </div>

          <p className="mt-2 text-[#F7F5F0]/40">
            © {new Date().getFullYear()} Studilly. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

