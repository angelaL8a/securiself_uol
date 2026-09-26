import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Grant } from "../types";
import { GrantsList } from "./grants-list";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mutate = vi.fn();

vi.mock("../hooks", () => ({
  useRevokeGrant: () => ({
    mutate,
    isPending: false,
  }),
}));

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "grant-1",
    scope: "identity_context",
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    application: {
      id: "app-1",
      userId: "user-1",
      name: "PrymeCab",
      clientId: "scs_e2e_prymecab_client",
      redirectUri: "http://localhost:3001/api/auth/callback",
      createdAt: "2026-07-01T09:00:00.000Z",
      updatedAt: "2026-07-01T09:00:00.000Z",
    },
    context: {
      id: "ctx-1",
      category: "SOCIAL",
      internalName: "E2E Social",
      displayName: "AngelaTech",
    },
    ...overrides,
  };
}

function renderList(
  grants: Grant[],
  onRevoked?: (grant: Grant) => void,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GrantsList grants={grants} onRevoked={onRevoked} />
    </QueryClientProvider>,
  );
}

describe("GrantsList", () => {
  it("renders Active status and an accessible revoke control for active Grants", () => {
    renderList([makeGrant()]);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", {
        name: "Revoke PrymeCab access to AngelaTech",
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("PrymeCab").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AngelaTech").length).toBeGreaterThan(0);
    expect(screen.getAllByText("First authorised").length).toBeGreaterThan(0);
  });

  it("renders Revoked status and omits the revoke action", () => {
    renderList([
      makeGrant({
        id: "grant-revoked",
        revokedAt: "2026-07-31T12:00:00.000Z",
      }),
    ]);
    expect(screen.getAllByText("Revoked").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", {
        name: "Revoke PrymeCab access to AngelaTech",
      }),
    ).not.toBeInTheDocument();
  });

  it("cancels confirmation without calling revoke", async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    renderList([makeGrant()]);

    await user.click(
      screen.getAllByRole("button", {
        name: "Revoke PrymeCab access to AngelaTech",
      })[0]!,
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/invalidate active access/i),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("confirms revocation through the dialog and notifies on success", async () => {
    const user = userEvent.setup();
    const onRevoked = vi.fn();
    mutate.mockClear();
    mutate.mockImplementation((_id, options) => {
      options?.onSuccess?.();
    });
    renderList([makeGrant()], onRevoked);

    await user.click(
      screen.getAllByRole("button", {
        name: "Revoke PrymeCab access to AngelaTech",
      })[0]!,
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Revoke PrymeCab access to AngelaTech",
      }),
    );

    expect(mutate).toHaveBeenCalledWith(
      "grant-1",
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
    expect(onRevoked).toHaveBeenCalledWith(
      expect.objectContaining({ id: "grant-1" }),
    );
  });

  it("reaches Revoke and confirms the revocation with the keyboard alone (A1)", async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    mutate.mockImplementation((_id, options) => {
      options?.onSuccess?.();
    });
    renderList([
      makeGrant({ id: "grant-revoked", revokedAt: "2026-07-31T12:00:00.000Z" }),
      makeGrant(),
    ]);

    // The revoked row has no action, so the first stop is the active Grant's Revoke.
    await user.tab();
    const trigger = screen.getAllByRole("button", {
      name: "Revoke PrymeCab access to AngelaTech",
    })[0]!;
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveTextContent("Revoke");

    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", {
      name: "Revoke PrymeCab access to AngelaTech",
    });
    while (document.activeElement !== confirm) await user.tab();
    await user.keyboard("{Enter}");

    expect(mutate).toHaveBeenCalledWith("grant-1", expect.any(Object));
  });

  it("closes the confirmation with Escape without revoking (A1)", async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    renderList([makeGrant()]);

    screen
      .getAllByRole("button", { name: "Revoke PrymeCab access to AngelaTech" })[0]!
      .focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not notify onRevoked when revocation fails", async () => {
    const user = userEvent.setup();
    const onRevoked = vi.fn();
    mutate.mockClear();
    mutate.mockImplementation((_id, options) => {
      options?.onError?.(new Error("revoke failed"));
    });
    renderList([makeGrant()], onRevoked);

    await user.click(
      screen.getAllByRole("button", {
        name: "Revoke PrymeCab access to AngelaTech",
      })[0]!,
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Revoke PrymeCab access to AngelaTech",
      }),
    );

    expect(onRevoked).not.toHaveBeenCalled();
  });
});
