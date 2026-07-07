import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from '@neondatabase/serverless';

type RoleField = { role?: 'tutor' | 'student' | null };

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
        // `role` isn't part of Auth.js's built-in AdapterUser/User types, but
        // the pg-adapter's `select * from users` means it rides along on
        // `user` at runtime anyway — this just surfaces it onto the session,
        // with a cast on both sides since neither type declares it.
        (session.user as typeof session.user & RoleField).role =
          (user as typeof user & RoleField).role ?? null;
        return session;
      },
    },
  };
});
