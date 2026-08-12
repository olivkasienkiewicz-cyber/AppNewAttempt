import type { User, Slot, Notification } from '@/lib/store';
import type { TutorSubject } from '@/lib/subjects';

// Neon returns snake_case columns as plain JS values; these map each row
// to the exact camelCase shape the client-side types expect, so the
// client code never has to know the DB's column naming.
export function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as User['role'],
    subjects: parseSubjects(row.subjects),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

// The subjects column is JSONB — Neon may return it already parsed (an
// array) or as a raw string depending on driver/version, so handle both.
// Any malformed entries are dropped rather than throwing, since a bad row
// shouldn't take down the whole users list.
function parseSubjects(value: unknown): TutorSubject[] {
  if (!value) return [];
  let arr: unknown;
  if (typeof value === 'string') {
    try {
      arr = JSON.parse(value);
    } catch {
      return [];
    }
  } else {
    arr = value;
  }
  if (!Array.isArray(arr)) return [];
  const out: TutorSubject[] = [];
  for (const item of arr) {
    if (typeof item !== 'object' || item === null) continue;
    const subject = (item as Record<string, unknown>).subject;
    const level = (item as Record<string, unknown>).level;
    const detail = (item as Record<string, unknown>).detail;
    if (typeof subject !== 'string' || subject.trim().length === 0) continue;
    out.push({
      subject,
      level: typeof level === 'string' ? level : null,
      detail: typeof detail === 'string' ? detail : null,
    });
  }
  return out;
}

export function rowToSlot(row: Record<string, unknown>): Slot {
  return {
    id: row.id as string,
    tutorId: row.tutor_id as string,
    // Postgres `date` columns come back as Date objects via the driver;
    // normalize to YYYY-MM-DD to match the original string format.
    date: toDateOnlyString(row.date),
    startTime: row.start_time as string,
    durationMinutes: Number(row.duration_minutes),
    status: row.status as Slot['status'],
    paymentStatus: row.payment_status as Slot['paymentStatus'],
    meetingUrl: (row.meeting_url as string | null) ?? null,
    bookedByStudentId: (row.booked_by_student_id as string | null) ?? null,
    bookedAt: row.booked_at ? new Date(row.booked_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}
export function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    recipientUserId: row.recipient_user_id as string,
    message: row.message as string,
    relatedSlotId: (row.related_slot_id as string | null) ?? null,
    read: Boolean(row.read),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}
function toDateOnlyString(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}
