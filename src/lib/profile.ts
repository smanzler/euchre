import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let displayName = "Player";

const emit = (): void => {
  for (const listener of listeners) listener();
};

export const profileStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): string => displayName,
  setName(next: string): void {
    displayName = next;
    emit();
  },
};

export const useDisplayName = (): string =>
  useSyncExternalStore(profileStore.subscribe, profileStore.getSnapshot, profileStore.getSnapshot);
