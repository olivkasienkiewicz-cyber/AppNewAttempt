import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { ADMIN_EMAIL } from '@/lib/payment';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = await req.json();
  const tutorId = typeof body.tutorId === 'string' ? body.tutorId : '';
  const requestedDate = typeof body.requestedDate === 'string' ? body.requestedDate : ''; // 'yyyy-MM-dd'
  const requestedTime = typeof body.requestedTime === 'string' ? body.requestedTime : ''; // 'HH:mm'
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  if (!tutorId || !requestedDate || !requestedTime) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // Look up tutor + student in one round trip each — need names/emails for the notification copy.
  const [tutor] = await sql`
    SELECT id, name, email FROM users WHERE id = ${tutorId} AND role = 'tutor'
  `;
  if (!tutor) {
    return NextResponse.json({ error: 'tutor_not_found' }, { status: 404 });
  }

  const [row] = await sql`
    INSERT INTO slot_requests (student_id, tutor_id, requested_date, requested_time, note)
    VALUES (${session.user.id}, ${tutorId}, ${requestedDate}, ${requestedTime}, ${note})
    RETURNING id
  `;

  const studentName = session.user.name ?? 'A student';
  const studentEmail = session.user.email ?? 'unknown';
  const prettyDate = requestedDate; // already yyyy-MM-dd, fine for email copy
  const adminLink = `<p><a href="https://studilly.com/admin">View in admin panel</a></p>`;

  // Fire-and-forget both emails — never let a delivery failure turn a
  // successful request into an error response for the student.
  if (tutor.email) {
    sendEmail({
      to: tutor.email,
      subject: `New time slot request from ${studentName}`,
      html: `
        <h2>A student requested a new time slot</h2>
        <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
        <p><strong>Requested:</strong> ${prettyDate} at ${requestedTime}</p>
        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
        <p>If this works for you, add it as an open slot and the student can book it as usual.</p>
      `,
    }).catch((err) => console.error('sendEmail (slot request -> tutor) failed', err));
  } else {
    console.error(`slot_requests: tutor ${tutorId} has no email on file, skipped tutor notification`);
  }

  sendEmail({
    to: ADMIN_EMAIL,
    subject: `New time slot request: ${studentName} -> ${tutor.name}`,
    html: `
      <h2>New time slot request</h2>
      <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
      <p><strong>Tutor:</strong> ${tutor.name}</p>
      <p><strong>Requested:</strong> ${prettyDate} at ${requestedTime}</p>
      ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
      ${adminLink}
    `,
  }).catch((err) => console.error('sendEmail (slot request -> admin) failed', err));

  return NextResponse.json({ id: row.id });
}
