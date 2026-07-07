import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Run `npx vercel env pull .env.local` (or copy it from ' +
    'the Neon/Vercel Storage dashboard) — see README for setup.'
  );
}

// `sql` is a tagged-template query function backed by Neon's HTTP driver.
// It's safe to call from any server-side route handler; each call is a
// single stateless HTTP request, so no pool management is needed here.
export const sql = neon(connectionString);
