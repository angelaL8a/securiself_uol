import { beforeEach, describe, expect, it } from "vitest";
import { getAuthToken, useAuthStore } from "./auth-store";
import type { User } from "./types";

const user: User = {
  id: "u1",
  email: "ada@example.com",
  legalFirstName: null,
  legalLastName: null,
  displayName: "Ada",
  gender: null,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("auth store persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ token: null, user: null, hydrated: false });
  });

  it("persists the session token to localStorage", () => {
    useAuthStore.getState().setSession("token-123", user);
    expect(getAuthToken()).toBe("token-123");
    const raw = window.localStorage.getItem("securiself.auth");
    expect(raw).toContain("token-123");
  });

  it("hydrates the token from localStorage", () => {
    window.localStorage.setItem(
      "securiself.auth",
      JSON.stringify({ token: "persisted", user }),
    );
    useAuthStore.getState().hydrate();
    const state = useAuthStore.getState();
    expect(state.token).toBe("persisted");
    expect(state.user?.email).toBe("ada@example.com");
    expect(state.hydrated).toBe(true);
  });

  it("clears the session and removes it from storage", () => {
    useAuthStore.getState().setSession("token-123", user);
    useAuthStore.getState().clear();
    expect(getAuthToken()).toBeNull();
    expect(window.localStorage.getItem("securiself.auth")).toBeNull();
  });
});
