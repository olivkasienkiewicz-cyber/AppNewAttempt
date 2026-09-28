import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import PostgresAdapter from '@auth/pg-adapter';
import type { AdapterUser } from 'next-auth/adapters';
import { Pool } from '@neondatabase/serverless';

type RoleField = { role?: 'tutor' | 'student' | 'admin' | 'parent' | null };
type ParentField = { parent_id?: string | null };

// Stay logged in for a year. The expiry rolls forward on every visit
// (at most once a day), so active users are effectively never logged out.
const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Vercel's serverless functions freeze between invocations rather than
  // fully exiting — without this, unclosed pools accumulate connections
  // against Neon's limit over time, which shows up as intermittent hangs.
  if (typeof (globalThis as { process?: { on?: Function } }).process?.on === 'function') {
    process.once('beforeExit', () => { void pool.end(); });
  }

  const baseAdapter = PostgresAdapter(pool);

  return {
    adapter: {
      ...baseAdapter,
      // Gmail ignores dots and anything after "+" in the address, so
      // "hela.rybarczyk@gmail.com" and "helarybarczyk@gmail.com" are the same
      // inbox. Match them to the same Studilly account instead of silently
      // creating a second, empty one. An exact match always wins.
      async getUserByEmail(email: string): Promise<AdapterUser | null> {
        const result = await pool.query(
          `
          SELECT * FROM users
          WHERE lower(email) = lower($1)
             OR (
               split_part(lower($1), '@', 2) IN ('gmail.com', 'googlemail.com')
               AND split_part(lower(email), '@', 2) IN ('gmail.com', 'googlemail.com')
               AND regexp_replace(split_part(split_part(lower(email), '@', 1), '+', 1), '\\.', '', 'g')
                 = regexp_replace(split_part(split_part(lower($1), '@', 1), '+', 1), '\\.', '', 'g')
             )
          ORDER BY (lower(email) = lower($1)) DESC, created_at ASC
          LIMIT 1
          `,
          [email]
        );
        return result.rows.length > 0 ? (result.rows[0] as AdapterUser) : null;
      },
    },
    session: {
      strategy: 'database',
      maxAge: SESSION_MAX_AGE_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    providers: [
      Resend({
        apiKey: process.env.AUTH_RESEND_KEY,
        from: process.env.AUTH_EMAIL_FROM ?? 'Studilly <onboarding@resend.dev>',
      }),
    ],
    pages: {
      signIn: '/login',
      verifyRequest: '/login/check-email',
    },
    callbacks: {
      async session({ session, user }) {
        session.user.id = user.id;
        (session.user as typeof session.user & RoleField).role =
          (user as typeof user & RoleField).role ?? null;
        (session.user as typeof session.user & ParentField).parent_id =
          (user as typeof user & ParentField).parent_id ?? null;
        return session;
      },
    },
  };
});
