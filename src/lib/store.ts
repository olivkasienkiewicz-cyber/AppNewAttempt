'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { TutorSubject } from '@/lib/subjects';

export type Role = 'tutor' | 'student';
export type SlotStatus = 'free' | 'booked';
export type PaymentStatus = 'unpaid' | 'paid';

export type User = {
  id: string;
  name: string;
  role: Role;
  subjects: TutorSubject[];
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

export type AvailabilityWindow = {
  id: number;
  tutorId: string;
  date: string;
  startTime: string;
  endTime: string;
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
  availabilityWindows: Record<number, AvailabilityWindow>;
  notifications: Record<string, Notification>;
  dataLoaded: boolean;
};

const EMPTY_STATE: AppState = Object.freeze({
  currentUserId: null,
  users: {},
  slots: {},
  availabilityWindows: {},
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
      const [users, slots, windows, notifications] = await Promise.all([
        api<User[]>('/api/users'),
        api<Slot[]>('/api/slots'),
        api<AvailabilityWindow[]>('/api/availability-windows'),
        api<Notification[]>('/api/notifications'),
      ]);
      snapshot = {
        ...snapshot,
        users: Object.fromEntries(users.map((u) => [u.id, u])),
        slots: Object.fromEntries(slots.map((s) => [s.id, s])),
        availabilityWindows: Object.fromEntries(windows.map((w) => [w.id, w])),
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

export function setCurrentUser(userId: string | null): void {
  if (snapshot.currentUserId === userId) return;
  snapshot = { ...snapshot, currentUserId: userId };
  emit();
  if (userId) void refresh();
}

export function getCurrentUser(): User | null {
  const id = snapshot.currentUserId;
  return id ? snapshot.users[id] ?? null : null;
}

export async function completeOnboarding(name: string, role: Role): Promise<User> {
  const user = await api<User>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ name, role }),
  });
  snapshot = { ...snapshot, users: { ...snapshot.users, [user.id]: user } };
  emit();
  return user;
}

export async function updateTutorSubjects(subjects: TutorSubject[]): Promise<User> {
  const user = await api<User>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ subjects }),
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

export async function createAvailabilityWindow(input: {
  tutorId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<AvailabilityWindow> {
  const w = await api<AvailabilityWindow>('/api/availability-windows', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  snapshot = { ...snapshot, availabilityWindows: { ...snapshot.availabilityWindows, [w.id]: w } };
  emit();
  return w;
}

export async function deleteAvailabilityWindow(windowId: number): Promise<void> {
  await api<{ ok: true }>(`/api/availability-windows/${windowId}`, { method: 'DELETE' });
  const next = { ...snapshot.availabilityWindows };
  delete next[windowId];
  snapshot = { ...snapshot, availabilityWindows: next };
  emit();
}

// Books a custom-length session (60/90/120 min) carved out of a tutor's
// open availability window, rather than a pre-made fixed slot.
export async function bookAvailabilityWindow(input: {
  tutorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
}): Promise<{ slot: Slot; payment: PaymentInfo } | { error: 'not_available' }> {
  try {
    const result = await api<{ slot: Slot; payment: PaymentInfo }>('/api/availability-windows/book', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    snapshot = { ...snapshot, slots: { ...snapshot.slots, [result.slot.id]: result.slot } };
    emit();
    return result;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { error: 'not_available' };
    }
    throw err;
  }
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
