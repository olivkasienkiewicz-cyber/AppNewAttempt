'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

export type Role = 'tutor' | 'student';
export type SlotStatus = 'free' | 'booked';
export type PaymentStatus = 'unpaid' | 'paid';

export type User = {
  id: string;
  name: string;
  role: Role;
  subject: string | null;
  level: string | null;
  createdAt: string;
};

export type Slot = {
  id: string;
  tutorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: SlotStatus;
  paymentStatus: PaymentStatus;
  meetingUrl: string | null;
  bookedByStudentId: string | null;
  bookedAt: string | null;
  createdAt: string;
};

export type Notification = {
  id: string;
  recipientUserId: string;
  message: string;
  relatedSlotId: string | null;
  read: boolean;
  createdAt: string;
};

export type PaymentInfo = {
  referenceCode: string;
  amount: number;
  currency: string;
  bankDetails: {
    accountHolder: string;
    iban: string;
    bankName: string;
  };
};

export type AppState = {
  currentUserId: string | null;
  users: Record<string, User>;
  slots: Record<string, Slot>;
  notifications: Record<string, Notification>;
  // true once the first fetch from the API has completed (success or failure).
  dataLoaded: boolean;
};

// Window 9: currentUserId is now set from the real Auth.js session (via
// AuthBridge in src/components/providers.tsx), not from localStorage.
const EMPTY_STATE: AppState = Object.freeze({
  currentUserId: null,
  users: {},
  slots: {},
  notifications: {},
  dataLoaded: false,
}) as AppState;

type Listener = () => void;
const listeners = new Set<Listener>();
function emit(): void {
  listeners.forEach((l) => l());
}
function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let snapshot: AppState = EMPTY_STATE;
let refreshInFlight: Promise<void> | null = null;

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`request_failed_${status}`);
    this.status = status;
    this.body = body;
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, body);
  }
  return (await res.json()) as T;
}

async function refresh(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const [users, slots, notifications] = await Promise.all([
        api<User[]>('/api/users'),
        api<Slot[]>('/api/slots'),
        api<Notification[]>('/api/notifications'),
      ]);
      snapshot = {
        ...snapshot,
        users: Object.fromEntries(users.map((u) => [u.id, u])),
        slots: Object.fromEntries(slots.map((s) => [s.id, s])),
        notifications: Object.fromEntries(notifications.map((n) => [n.id, n])),
        dataLoaded: true,
      };
    } catch (err) {
      console.error('Failed to load app state from the database:', err);
      snapshot = { ...snapshot, dataLoaded: true };
    }
    emit();
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export function getState(): AppState {
  return snapshot;
}

export function useAppState(): AppState {
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void refresh();
    }
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY_STATE);
}

export function refreshState(): Promise<void> {
  return refresh();
}

// Called only by AuthBridge, driven by the real Auth.js session — never by
// page code picking an arbitrary id anymore.
export function setCurrentUser(userId: string | null): void {
  if (snapshot.currentUserId === userId) return;
  snapshot = { ...snapshot, currentUserId: userId };
  emit();
  if (userId) void refresh(); // pick up this user's row right away post-login
}

export function getCurrentUser(): User | null {
  const id = snapshot.currentUserId;
  return id ? snapshot.users[id] ?? null : null;
}

// Sets this user's name + role for the first time (or re-sets them). The
// server derives *which* user from the session — there's no id parameter.
// subject/level are optional here since a student never sets them, and a
// tutor can also set them later via updateTutorSubjects instead.
export async function completeOnboarding(
  name: string,
  role: Role,
  subject?: string | null,
  level?: string | null
): Promise<User> {
  const body: { name: string; role: Role; subject?: string | null; level?: string | null } = {
    name,
    role,
  };
  if (subject !== undefined) body.subject = subject;
  if (level !== undefined) body.level = level;

  const user = await api<User>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  snapshot = { ...snapshot, users: { ...snapshot.users, [user.id]: user } };
  emit();
  return user;
}

// Lets a tutor update just their subject/level later, without resubmitting
// their name or role.
export async function updateTutorSubjects(
  subject: string | null,
  level: string | null
): Promise<User> {
  const user = await api<User>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ subject, level }),
  });
  snapshot = { ...snapshot, users: { ...snapshot.users, [user.id]: user } };
  emit();
  return user;
}

export function listTutors(): User[] {
  return Object.values(snapshot.users).filter((u) => u.role === 'tutor');
}

export function listSlotsForTutor(
  tutorId: string,
  opts?: { onlyFree?: boolean; fromDate?: Date }
): Slot[] {
  let slots = Object.values(snapshot.slots).filter((s) => s.tutorId === tutorId);
  if (opts?.onlyFree) {
    slots = slots.filter((s) => s.status === 'free');
  }
  if (opts?.fromDate) {
    const cutoff = opts.fromDate.getTime();
    slots = slots.filter((s) => {
      const ts = new Date(`${s.date}T${s.startTime}:00`).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    });
  }
  slots.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
    return 0;
  });
  return slots;
}

export async function createSlot(
  input: Omit<Slot, 'id' | 'status' | 'paymentStatus' | 'meetingUrl' | 'bookedByStudentId' | 'bookedAt' | 'createdAt'>
): Promise<Slot> {
  const slot = await api<Slot>('/api/slots', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  snapshot = { ...snapshot, slots: { ...snapshot.slots, [slot.id]: slot } };
  emit();
  return slot;
}

export async function deleteSlot(slotId: string): Promise<void> {
  await api<{ ok: true }>(`/api/slots/${slotId}`, { method: 'DELETE' });
  const nextSlots = { ...snapshot.slots };
  delete nextSlots[slotId];
  snapshot = { ...snapshot, slots: nextSlots };
  emit();
}

export async function bookSlot(
  slotId: string,
  studentId: string
): Promise<{ slot: Slot; payment: PaymentInfo } | { error: 'slot_taken' }> {
  try {
    const result = await api<{ slot: Slot; notifications: Notification[]; payment: PaymentInfo }>(
      `/api/slots/${slotId}/book`,
      { method: 'POST', body: JSON.stringify({ studentId }) }
    );
    snapshot = {
      ...snapshot,
      slots: { ...snapshot.slots, [result.slot.id]: result.slot },
      notifications: {
        ...snapshot.notifications,
        ...Object.fromEntries(result.notifications.map((n) => [n.id, n])),
      },
    };
    emit();
    return { slot: result.slot, payment: result.payment };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { error: 'slot_taken' };
    }
    throw err;
  }
}

export async function setMeetingUrl(slotId: string, meetingUrl: string | null): Promise<Slot> {
  const slot = await api<Slot>(`/api/slots/${slotId}/meeting-link`, {
    method: 'PATCH',
    body: JSON.stringify({ meetingUrl }),
  });
  snapshot = { ...snapshot, slots: { ...snapshot.slots, [slot.id]: slot } };
  emit();
  return slot;
}

export function listNotifications(userId: string): Notification[] {
  return Object.values(snapshot.notifications)
    .filter((n) => n.recipientUserId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function markAllRead(userId: string): Promise<void> {
  const updated = await api<Notification[]>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ userId }),
  });
  if (updated.length === 0) return;
  const nextNotifs = { ...snapshot.notifications };
  for (const n of updated) nextNotifs[n.id] = n;
  snapshot = { ...snapshot, notifications: nextNotifs };
  emit();
}
