import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from '@neondatabase/serverless';

// A fresh Pool per invocation (not module-scope) — this matches the pattern
// Neon's own Auth.js guide uses for serverless environments.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
        // The adapter's getUser/getSessionAndUser do `select * from users`,
        // so `role` rides along on `user` even though it's not part of the
        // Auth.js type — this just surfaces it onto the session.
        session.user.role =
          (user as typeof user & { role?: 'tutor' | 'student' | null }).role ?? null;
        return session;
      },
    },
  };
});
