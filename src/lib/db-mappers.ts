import type { User, Slot, Notification } from '@/lib/store';

// Neon returns snake_case columns as plain JS values; these map each row
// to the exact camelCase shape the client-side types expect, so the
// client code never has to know the DB's column naming.

export function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as User['role'],
    createdAt: new Date(row.created_at as string).toISOString(),
  };
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
