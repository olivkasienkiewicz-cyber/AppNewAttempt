'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

export type Role = 'tutor' | 'student';
export type SlotStatus = 'free' | 'booked';

export type User = {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
};

export type Slot = {
  id: string;
  tutorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: SlotStatus;
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

export type AppState = {
  currentUserId: string | null;
  users: Record<string, User>;
  slots: Record<string, Slot>;
  notifications: Record<string, Notification>;
  // true once the first fetch from the API has completed (success or failure).
  // Pages should treat "not dataLoaded" the same way they used to treat
  // "not hydrated" — show a skeleton, don't render real content yet.
  dataLoaded: boolean;
};

// Window 8: the "current user" is still nothing more than an id kept on this
// device — no real login. Auth is out of scope for this migration; only the
// User/Slot/Notification records themselves moved into Postgres.
const CURRENT_USER_KEY = 'tutor_current_user_id_v1';

const EMPTY_STATE: AppState = Object.freeze({
  currentUserId: null,
  users: {},
  slots: {},
  notifications: {},
  dataLoaded: false,
}) as AppState;

const isBrowser = (): boolean => typeof window !== 'undefined';

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

function readCurrentUserId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

function writeCurrentUserId(id: string | null): void {
  if (!isBrowser()) return;
  try {
    if (id) window.localStorage.setItem(CURRENT_USER_KEY, id);
    else window.localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    // Storage blocked (private/incognito edge cases) — current-user just
    // won't survive a reload; not fatal, matches old best-effort behavior.
  }
}

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
        currentUserId: readCurrentUserId(),
        users: Object.fromEntries(users.map((u) => [u.id, u])),
        slots: Object.fromEntries(slots.map((s) => [s.id, s])),
        notifications: Object.fromEntries(notifications.map((n) => [n.id, n])),
        dataLoaded: true,
      };
    } catch (err) {
      console.error('Failed to load app state from the database:', err);
      // Surface *something* rather than spinning forever — keep whatever
      // we already had cached, just mark loading as finished.
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
    const onStorage = (e: StorageEvent) => {
      if (e.key === CURRENT_USER_KEY) {
        snapshot = { ...snapshot, currentUserId: readCurrentUserId() };
        emit();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY_STATE);
}

// Lets a page force a fresh read (e.g. after an action a different
// tab/device might have caused, or just to be safe on retry).
export function refreshState(): Promise<void> {
  return refresh();
}

export function setCurrentUser(userId: string | null): void {
  writeCurrentUserId(userId);
  snapshot = { ...snapshot, currentUserId: userId };
  emit();
}

export function getCurrentUser(): User | null {
  const id = snapshot.currentUserId;
  return id ? snapshot.users[id] ?? null : null;
}

export async function createUser(name: string, role: Role): Promise<User> {
  const user = await api<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ name, role }),
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
  input: Omit<Slot, 'id' | 'status' | 'bookedByStudentId' | 'bookedAt' | 'createdAt'>
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
): Promise<Slot | { error: 'slot_taken' }> {
  try {
    const result = await api<{ slot: Slot; notifications: Notification[] }>(
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
    return result.slot;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { error: 'slot_taken' };
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
