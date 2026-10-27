import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/auth';
import { WORK_CHECK_ALLOWED_TYPES, WORK_CHECK_MAX_FILE_BYTES } from '@/lib/work-check';

// Client-side upload token for Written Work Check files: students/parents
// upload their draft, tutors upload their feedback. Same pattern as
// /api/materials/upload, so files can be bigger than Vercel's 4.5 MB body
// limit. Files go under work-checks/<userId>/ with a random suffix.
export async function POST(req: Request) {
  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        if (!session?.user?.id) throw new Error('unauthenticated');
        if (!pathname.startsWith(`work-checks/${session.user.id}/`)) {
          throw new Error('invalid_path');
        }
        return {
          allowedContentTypes: [...WORK_CHECK_ALLOWED_TYPES],
          maximumSizeInBytes: WORK_CHECK_MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // The order / feedback is saved by the page after the upload finishes.
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    console.error('[work-checks/upload] upload failed:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
