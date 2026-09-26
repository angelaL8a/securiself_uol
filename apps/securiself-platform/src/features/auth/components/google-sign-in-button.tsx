"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useGoogleSignIn } from "../hooks";

const GSI_SRC = "https://accounts.google.com/gsi/client";

/** Minimal surface of the Google Identity Services client we actually use. */
interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        ux_mode?: "popup" | "redirect";
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number>,
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

interface GoogleSignInButtonProps {
  returnTo?: string | null;
  /** Google-rendered button label; must be one of the GSI `text` values. */
  text?: "signin_with" | "signup_with";
}

/**
 * Renders the official "Sign in with Google" button. Google returns an ID token
 * to the callback, which is posted to the SecuriSelf backend for verification.
 *
 * Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset, so an
 * unconfigured deployment simply keeps email/password authentication.
 */
export function GoogleSignInButton({
  returnTo,
  text = "signin_with",
}: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptFailed, setScriptFailed] = useState(false);
  const googleSignIn = useGoogleSignIn(returnTo);

  const { mutate } = googleSignIn;

  const renderGoogleButton = useCallback(() => {
    const container = containerRef.current;
    if (!clientId || !container || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: ({ credential }) => {
        // Google omits the credential when the popup is dismissed or fails.
        if (!credential) {
          toast.error("Google sign-in was cancelled");
          return;
        }
        mutate(credential, {
          onError: (error) => {
            toast.error(
              error instanceof ApiError
                ? error.message
                : "Unable to sign in with Google",
            );
          },
        });
      },
    });

    // Google owns this node's children; clear it so a re-render (or React
    // StrictMode's double effect) never stacks two buttons.
    container.replaceChildren();
    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      logo_alignment: "left",
      text,
      width: 320,
    });
  }, [clientId, mutate, text]);

  // Covers client-side navigation where the GSI script is already loaded.
  useEffect(() => {
    renderGoogleButton();
  }, [renderGoogleButton]);

  if (!clientId) return null;

  return (
    <div className="space-y-4">
      <Script
        src={GSI_SRC}
        strategy="afterInteractive"
        onReady={renderGoogleButton}
        onError={() => setScriptFailed(true)}
      />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      {scriptFailed ? (
        <p role="alert" className="text-center text-xs text-destructive">
          Google sign-in is unavailable right now. Use your email and password.
        </p>
      ) : (
        <div
          ref={containerRef}
          data-testid="google-sign-in-button"
          className="flex min-h-11 justify-center"
          aria-busy={googleSignIn.isPending}
        />
      )}

      {googleSignIn.isPending ? (
        <p role="status" className="text-center text-xs text-muted-foreground">
          Signing you in with Google…
        </p>
      ) : null}
    </div>
  );
}
