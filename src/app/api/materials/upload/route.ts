import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch (error) {
    console.error('[materials/upload] could not read request body — is the page still using the old FormData upload?', error);
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        if (!session?.user?.id) throw new Error('unauthenticated');

        const [me] = await sql`SELECT role FROM users WHERE id = ${session.user.id}`;
        if (!me || me.role !== 'tutor') {
          throw new Error(`forbidden (role: ${me?.role ?? 'no user row'})`);
        }

        if (!pathname.startsWith(`materials/${session.user.id}/`)) {
          throw new Error(`invalid_path (pathname: ${pathname}, session user: ${session.user.id})`);
        }

        return { maximumSizeInBytes: MAX_SIZE_BYTES };
      },
      onUploadCompleted: async () => {
        // Nothing to do here — the page saves the material row itself after upload.
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    console.error('[materials/upload] upload failed:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
