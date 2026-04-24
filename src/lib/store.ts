'use client';

import { useSyncExternalStore } from 'react';

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
};

const STORAGE_KEY = 'tutor_app_state_v1';

const EMPTY_STATE: AppState = Object.freeze({
  currentUserId: null,
  users: {},
  slots: {},
  notifications: {},
}) as AppState;

const isBrowser = (): boolean => typeof window !== 'undefined';

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedRaw: string | null = null;
let cachedSnapshot: AppState = EMPTY_STATE;

function normalize(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== 'object') return { ...EMPTY_STATE };
  const p = parsed as Partial<AppState>;
  return {
    currentUserId: typeof p.currentUserId === 'string' ? p.currentUserId : null,
    users: p.users && typeof p.users === 'object' ? (p.users as Record<string, User>) : {},
    slots: p.slots && typeof p.slots === 'object' ? (p.slots as Record<string, Slot>) : {},
    notifications: p.notifications && typeof p.notifications === 'object' ? (p.notifications as Record<string, Notification>) : {},
  };
}

function readFromStorage(): AppState {
  if (!isBrowser()) return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      if (cachedRaw !== null) {
        cachedRaw = null;
        cachedSnapshot = EMPTY_STATE;
      }
      return cachedSnapshot;
    }
    if (raw === cachedRaw) return cachedSnapshot;
    const parsed = JSON.parse(raw);
    cachedRaw = raw;
    cachedSnapshot = normalize(parsed);
    return cachedSnapshot;
  } catch {
    cachedRaw = null;
    cachedSnapshot = EMPTY_STATE;
    return EMPTY_STATE;
  }
}

function writeToStorage(state: AppState): void {
  if (!isBrowser()) return;
  const serialized = JSON.stringify(state);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedSnapshot = state;
  emit();
}

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    cachedRaw = null;
    listener();
  };
  if (isBrowser()) {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (isBrowser()) {
      window.removeEventListener('storage', onStorage);
    }
  };
}

export function getState(): AppState {
  return readFromStorage();
}

export function setState(next: Partial<AppState> | ((prev: AppState) => AppState)): void {
  const prev = readFromStorage();
  const resolved = typeof next === 'function' ? next(prev) : { ...prev, ...next };
  writeToStorage(resolved);
}

export function createUser(name: string, role: Role): User {
  const user: User = {
    id: crypto.randomUUID(),
    name,
    role,
    createdAt: new Date().toISOString(),
  };
  setState((prev) => ({
    ...prev,
    users: { ...prev.users, [user.id]: user },
  }));
  return user;
}

export function setCurrentUser(userId: string | null): void {
  setState({ currentUserId: userId });
}

export function getCurrentUser(): User | null {
  const s = getState();
  if (!s.currentUserId) return null;
  return s.users[s.currentUserId] ?? null;
}

export function listTutors(): User[] {
  return Object.values(getState().users).filter((u) => u.role === 'tutor');
}

export function listSlotsForTutor(
  tutorId: string,
  opts?: { onlyFree?: boolean; fromDate?: Date }
): Slot[] {
  let slots = Object.values(getState().slots).filter((s) => s.tutorId === tutorId);
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

export function createSlot(
  input: Omit<Slot, 'id' | 'status' | 'bookedByStudentId' | 'bookedAt' | 'createdAt'>
): Slot {
  const slot: Slot = {
    ...input,
    id: crypto.randomUUID(),
    status: 'free',
    bookedByStudentId: null,
    bookedAt: null,
    createdAt: new Date().toISOString(),
  };
  setState((prev) => ({
    ...prev,
    slots: { ...prev.slots, [slot.id]: slot },
  }));
  return slot;
}

export function deleteSlot(slotId: string): void {
  setState((prev) => {
    if (!(slotId in prev.slots)) return prev;
    const nextSlots = { ...prev.slots };
    delete nextSlots[slotId];
    return { ...prev, slots: nextSlots };
  });
}

export function bookSlot(slotId: string, studentId: string): Slot | { error: 'slot_taken' } {
  const current = getState();
  const slot = current.slots[slotId];
  if (!slot || slot.status !== 'free') {
    return { error: 'slot_taken' };
  }
  const now = new Date().toISOString();
  const updatedSlot: Slot = {
    ...slot,
    status: 'booked',
    bookedByStudentId: studentId,
    bookedAt: now,
  };
  const student = current.users[studentId];
  const tutor = current.users[slot.tutorId];
  const tutorNotif: Notification = {
    id: crypto.randomUUID(),
    recipientUserId: slot.tutorId,
    message: `${student?.name ?? 'A student'} booked your slot on ${slot.date} at ${slot.startTime}.`,
    relatedSlotId: slot.id,
    read: false,
    createdAt: now,
  };
  const studentNotif: Notification = {
    id: crypto.randomUUID(),
    recipientUserId: studentId,
    message: `You booked ${tutor?.name ?? 'a tutor'} on ${slot.date} at ${slot.startTime}.`,
    relatedSlotId: slot.id,
    read: false,
    createdAt: now,
  };
  let conflict = false;
  setState((prev) => {
    const latest = prev.slots[slotId];
    if (!latest || latest.status !== 'free') {
      conflict = true;
      return prev;
    }
    return {
      ...prev,
      slots: { ...prev.slots, [slotId]: updatedSlot },
      notifications: {
        ...prev.notifications,
        [tutorNotif.id]: tutorNotif,
        [studentNotif.id]: studentNotif,
      },
    };
  });
  if (conflict) return { error: 'slot_taken' };
  return updatedSlot;
}

export function listNotifications(userId: string): Notification[] {
  return Object.values(getState().notifications)
    .filter((n) => n.recipientUserId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function markAllRead(userId: string): void {
  setState((prev) => {
    let changed = false;
    const nextNotifs: Record<string, Notification> = { ...prev.notifications };
    for (const n of Object.values(prev.notifications)) {
      if (n.recipientUserId === userId && !n.read) {
        nextNotifs[n.id] = { ...n, read: true };
        changed = true;
      }
    }
    if (!changed) return prev;
    return { ...prev, notifications: nextNotifs };
  });
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY_STATE);
}
