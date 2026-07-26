import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      {/* Nav */}
      <header className="border-b border-[#0E2A47]/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-['Instrument_Serif'] text-2xl tracking-tight text-[#0E2A47]">
            Studilly
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[#0E2A47] hover:text-[#16B8A7] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#16B8A7] px-5 py-2 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#0E2A47] text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <h1 className="font-['Instrument_Serif'] text-5xl leading-[1.05] md:text-6xl">
              IB tutoring that actually fits your syllabus.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/80">
              Book real IB tutors — by subject, by level, by the hour.
              No packages, no sales calls. Pick a slot, transfer the fee,
              get your meeting link.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:border-white/60 transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Signature: session-slip card */}
          <div className="justify-self-start md:justify-self-end">
            <div className="w-64 rounded-sm bg-[#F7F5F0] p-6 text-[#12202B] shadow-xl">
              <p className="text-xs uppercase tracking-widest text-[#0E2A47]/60">
                Session rate
              </p>
              <div className="my-3 border-t border-dashed border-[#0E2A47]/20" />
              <p className="font-['Instrument_Serif'] text-4xl text-[#0E2A47]">
                230 PLN
              </p>
              <p className="text-sm text-[#0E2A47]/70">per hour, any subject</p>
              <div className="my-3 border-t border-dashed border-[#0E2A47]/20" />
              <p className="text-xs text-[#0E2A47]/60">
                Confirmed by bank transfer · Meeting link on booking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-['Instrument_Serif'] text-3xl text-[#0E2A47]">
          How it works
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {[
            {
              step: "1",
              title: "Browse",
              body: "Filter tutors by IB subject, HL or SL, and open slots.",
            },
            {
              step: "2",
              title: "Book",
              body: "Reserve a time. It's held for you while payment is confirmed.",
            },
            {
              step: "3",
              title: "Bank transfer",
              body: "Pay 230 PLN by bank transfer. We confirm it manually, fast.",
            },
            {
              step: "4",
              title: "Meeting link",
              body: "Once confirmed, your tutor's meeting link lands in your inbox.",
            },
          ].map((s) => (
            <div key={s.step}>
              <span className="font-['Instrument_Serif'] text-3xl text-[#16B8A7]">
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
          <h2 className="font-['Instrument_Serif'] text-3xl text-[#0E2A47]">
            Every IB group, both levels
          </h2>
          <p className="mt-2 text-[#12202B]/70">
            HL and SL, across all six subject groups.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Group 1", "Studies in Language & Literature"],
              ["Group 2", "Language Acquisition"],
              ["Group 3", "Individuals & Societies"],
              ["Group 4", "Sciences"],
              ["Group 5", "Mathematics"],
              ["Group 6", "The Arts"],
            ].map(([group, label]) => (
              <div
                key={group}
                className="rounded-md border border-[#0E2A47]/10 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">
                    {group}
                  </span>
                  <span className="rounded-full bg-[#7CD8C5]/30 px-2 py-0.5 text-[10px] font-semibold text-[#0E2A47]">
                    HL · SL
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#0E2A47]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-['Instrument_Serif'] text-3xl text-[#0E2A47]">
          Your next session is a few taps away.
        </h2>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-[#16B8A7] px-8 py-3 text-sm font-semibold text-white hover:bg-[#129888] transition-colors"
        >
          Get started
        </Link>
      </section>

      <footer className="border-t border-[#0E2A47]/10 py-8 text-center text-xs text-[#0E2A47]/50">
        © {new Date().getFullYear()} Studilly
      </footer>
    </main>
  );
}
