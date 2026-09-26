import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { GoogleSignInButton } from "./google-sign-in-button";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }));

// next/script would inject a real <script> tag; the GSI client is stubbed below.
vi.mock("next/script", () => ({ default: () => null }));

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("../hooks", () => ({
  useGoogleSignIn: (returnTo?: string | null) => {
    lastReturnTo = returnTo;
    return { mutate, isPending: false };
  },
}));

let lastReturnTo: string | null | undefined;

type Callback = (response: { credential?: string }) => void;
let capturedCallback: Callback | undefined;
let capturedClientId: string | undefined;
const renderButton = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  capturedCallback = undefined;
  capturedClientId = undefined;
  window.google = {
    accounts: {
      id: {
        initialize: (config) => {
          capturedClientId = config.client_id;
          capturedCallback = config.callback;
        },
        renderButton,
      },
    },
  };
});

describe("GoogleSignInButton", () => {
  it("renders the Google button with the configured client ID", async () => {
    render(<GoogleSignInButton />);

    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(capturedClientId).toBe(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    expect(screen.getByTestId("google-sign-in-button")).toBeInTheDocument();
  });

  it("submits the Google credential to the SecuriSelf session mutation", async () => {
    render(<GoogleSignInButton />);
    await waitFor(() => expect(capturedCallback).toBeDefined());

    capturedCallback?.({ credential: "google-id-token" });

    expect(mutate).toHaveBeenCalledWith("google-id-token", expect.anything());
  });

  it("forwards returnTo so the consent flow is preserved", async () => {
    render(<GoogleSignInButton returnTo="/oauth/authorize?client_id=abc" />);

    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(lastReturnTo).toBe("/oauth/authorize?client_id=abc");
  });

  it("surfaces a rejected Google credential as a toast, on the Sign In page", async () => {
    // Sprint 4 F-1: this error used to be wiped by the global 401 reload.
    render(<GoogleSignInButton />);
    await waitFor(() => expect(capturedCallback).toBeDefined());

    capturedCallback?.({ credential: "tampered-credential" });
    const options = mutate.mock.calls[0]?.[1] as {
      onError: (error: unknown) => void;
    };
    options.onError(new ApiError(401, "Invalid Google credential"));

    expect(toastError).toHaveBeenCalledWith("Invalid Google credential");
    // The sign-in surface is still mounted: nothing navigated away.
    expect(screen.getByTestId("google-sign-in-button")).toBeInTheDocument();
  });

  it("reports a cancelled Google popup instead of calling the backend", async () => {
    render(<GoogleSignInButton />);
    await waitFor(() => expect(capturedCallback).toBeDefined());

    capturedCallback?.({});

    expect(mutate).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Google sign-in was cancelled");
  });
});
