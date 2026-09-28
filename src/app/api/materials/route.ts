import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { isSelfOrLinkedParent } from '@/lib/parent-access';

type MaterialRow = {
  id: string;
  tutor_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  uploaded_at: string;
};

function rowToMaterial(row: MaterialRow) {
  return {
    id: row.id,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedAt: new Date(row.uploaded_at).toISOString(),
  };
}

async function canAccessPair(userId: string, tutorId: string, studentId: string): Promise<boolean> {
  if (userId === tutorId) return true;
  return isSelfOrLinkedParent(userId, studentId);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const tutorId = searchParams.get('tutorId');
  const studentId = searchParams.get('studentId');
  if (!tutorId || !studentId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }
  if (!(await canAccessPair(session.user.id, tutorId, studentId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rows = await sql`
    SELECT * FROM materials
    WHERE tutor_id = ${tutorId} AND student_id = ${studentId}
    ORDER BY uploaded_at DESC
  `;
  return NextResponse.json(rows.map((r) => rowToMaterial(r as MaterialRow)));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const [me] = await sql`SELECT role FROM users WHERE id = ${session.user.id}`;
  if (!me || me.role !== 'tutor') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { studentId, fileUrl, fileName, fileType } = (body ?? {}) as {
    studentId?: unknown; fileUrl?: unknown; fileName?: unknown; fileType?: unknown;
  };
  if (typeof studentId !== 'string' || typeof fileUrl !== 'string' || typeof fileName !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO materials (tutor_id, student_id, file_url, file_name, file_type)
    VALUES (${session.user.id}, ${studentId}, ${fileUrl}, ${fileName}, ${typeof fileType === 'string' ? fileType : null})
    RETURNING *
  `;
  return NextResponse.json(rowToMaterial(row as MaterialRow), { status: 201 });
}
