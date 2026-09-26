import { create } from "zustand";
import type { User } from "./types";

const STORAGE_KEY = "securiself.auth";

interface PersistedAuth {
  token: string;
  user: User | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  /** True once hydration from localStorage has run on the client. */
  hydrated: boolean;
  setSession: (token: string, user: User | null) => void;
  setUser: (user: User | null) => void;
  clear: () => void;
  hydrate: () => void;
}

function readPersisted(): PersistedAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (!parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(value: PersistedAuth | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!value) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  } catch {
    // Ignore storage write failures (private mode, quota, etc.).
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  setSession: (token, user) => {
    writePersisted({ token, user });
    set({ token, user });
  },
  setUser: (user) => {
    const { token } = get();
    if (token) writePersisted({ token, user });
    set({ user });
  },
  clear: () => {
    writePersisted(null);
    set({ token: null, user: null });
  },
  hydrate: () => {
    const persisted = readPersisted();
    set({
      token: persisted?.token ?? null,
      user: persisted?.user ?? null,
      hydrated: true,
    });
  },
}));

/** Non-hook accessor used by the API client outside React. */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

/** Clears the session outside of React (e.g. on a 401 response). */
export function clearAuthSession(): void {
  useAuthStore.getState().clear();
}
