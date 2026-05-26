'use client';

import { useSyncExternalStore } from 'react';

/**
 * Returns `false` during SSR and on the very first client render
 * (so React's hydration matches the server output), then `true` once
 * hydration has completed.
 *
 * Use this to gate any UI whose appearance depends on `localStorage`
 * or any other client-only source — e.g. show a Skeleton until this
 * returns `true`, then render the real content. Without this gate,
 * pages backed by `useAppState()` will flash an empty state on first
 * paint because the SSR snapshot of the store is `EMPTY_STATE`.
 */
const subscribe = (): (() => void) => () => {};
const getServerSnapshot = (): boolean => false;
const getClientSnapshot = (): boolean => true;

export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
