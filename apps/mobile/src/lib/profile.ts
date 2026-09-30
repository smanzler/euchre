import { Storage } from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

const displayNameKey = "profile.displayName";

const listeners = new Set<() => void>();
let displayName = Storage.getItemSync(displayNameKey) ?? "Player";

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
    Storage.setItemSync(displayNameKey, next);
    emit();
  },
};

export const useDisplayName = (): string =>
  useSyncExternalStore(
    profileStore.subscribe,
    profileStore.getSnapshot,
    profileStore.getSnapshot,
  );
