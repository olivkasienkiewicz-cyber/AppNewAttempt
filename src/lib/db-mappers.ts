import type { User, Slot, Notification, AvailabilityWindow } from '@/lib/store';
import type { TutorSubject } from '@/lib/subjects';

export function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as User['role'],
    subjects: parseSubjects(row.subjects),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

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
    date: toDateOnlyString(row.date),
    startTime: normalizeTime(row.start_time),
    durationMinutes: Number(row.duration_minutes),
    status: row.status as Slot['status'],
    paymentStatus: row.payment_status as Slot['paymentStatus'],
    meetingUrl: (row.meeting_url as string | null) ?? null,
    bookedByStudentId: (row.booked_by_student_id as string | null) ?? null,
    bookedAt: row.booked_at ? new Date(row.booked_at as string).toISOString() : null,
    subject: (row.subject as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function rowToAvailabilityWindow(row: Record<string, unknown>): AvailabilityWindow {
  return {
    id: Number(row.id),
    tutorId: row.tutor_id as string,
    date: toDateOnlyString(row.date),
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
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

function normalizeTime(value: unknown): string {
  return String(value).slice(0, 5);
}
