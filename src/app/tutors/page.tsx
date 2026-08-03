import Image from 'next/image';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { translations, type Locale } from '@/lib/translations';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const dynamic = 'force-dynamic';

export default async function TutorsPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('studilly_locale')?.value;
  const locale: Locale = localeCookie === 'pl' ? 'pl' : 'en';
  const t = translations[locale];

  const rows = await sql`
    SELECT id, name, subject, bio, photo_url
    FROM tutor_profiles
    ORDER BY display_order ASC, id ASC
  `;

  const tutors = rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    subject: (row.subject as string | null) ?? '',
    bio: row.bio as string,
    photoUrl: (row.photo_url as string | null) ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
          {t.tutors.title}
        </h1>
        <p className="mt-4 text-lg text-[#12202B]/80">
          Every tutor on Studilly has been through the IB themselves.
        </p>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-6 space-y-12">
          {tutors.length === 0 ? (
            <p className="text-[#12202B]/60">Tutor profiles are coming soon.</p>
          ) : (
            tutors.map((tutor) => (
              <div key={tutor.id} className="grid gap-6 sm:grid-cols-[120px_1fr] sm:items-start">
                <div className="h-28 w-28 overflow-hidden rounded-full bg-[#7CD8C5]/30">
                  {tutor.photoUrl && (
                    <Image
                      src={tutor.photoUrl}
                      alt={tutor.name}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-instrument-serif)] text-xl text-[#0E2A47]">
                    {tutor.name}
                  </h2>
                  {tutor.subject && (
                    <p className="mt-1 text-sm font-medium text-[#16B8A7]">{tutor.subject}</p>
                  )}
                  <p className="mt-3 text-[#12202B]/80">{tutor.bio}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
