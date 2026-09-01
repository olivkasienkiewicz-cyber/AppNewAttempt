import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'tutor' | 'student' | 'admin' | 'parent' | null;
      parent_id: string | null;
    } & DefaultSession['user'];
  }
}
