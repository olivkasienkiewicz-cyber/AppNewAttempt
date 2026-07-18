import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from '@neondatabase/serverless';

type RoleField = { role?: 'tutor' | 'student' | null };

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Vercel's serverless functions freeze between invocations rather than
  // fully exiting — without this, unclosed pools accumulate connections
  // against Neon's limit over time, which shows up as intermittent hangs.
  if (typeof (globalThis as { process?: { on?: Function } }).process?.on === 'function') {
    process.once('beforeExit', () => { void pool.end(); });
  }
  return {
    adapter: PostgresAdapter(pool),
    session: { strategy: 'database' },
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
        return session;
      },
    },
  };
});
