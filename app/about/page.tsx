import Image from "next/image";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
          About Studilly
        </h1>
        <p className="mt-6 text-lg text-[#12202B]/80">
          Studilly exists because IB tutoring shouldn't require a sales
          call, a package deal, or a middleman. We connect students
          directly with real IB tutors, by subject and by level, for a
          single, transparent rate — 230 PLN an hour, no matter what
          you're studying.
        </p>
        <p className="mt-4 text-lg text-[#12202B]/80">
          Every tutor on Studilly has been through the IB themselves.
          Booking a session takes a few taps: pick a slot, confirm by
          bank transfer, and your meeting link is waiting in your inbox.
        </p>
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
              Olivia Sienkiewicz
            </h2>
            <p className="mt-1 text-sm font-medium text-[#16B8A7]">
              Founder, Studilly
            </p>
            <p className="mt-4 text-[#12202B]/80">
              I built Studilly after tutoring IB students myself and
              seeing how much friction there was on both sides — tutors
              chasing payments, students unsure who to trust. Studilly is
              the tool I wished existed: simple, direct, and built around
              how IB study actually works.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
