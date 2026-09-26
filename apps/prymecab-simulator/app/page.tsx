"use client";

import { useEffect, useState } from "react";
import {
  resolveAccessFromUserResponse,
  type AccessState,
  type ProfileResponse,
  type UserErrorBody,
} from "../lib/access-state";

const FIELD_LABELS: Record<string, string> = {
  display_name: "Display name",
  username: "Username",
  pronouns: "Pronouns",
  job_title: "Job title",
  company: "Company",
  short_bio: "Bio",
  legal_first_name: "First name",
  legal_last_name: "Last name",
  document_id: "Document ID",
};

export default function Home() {
  const handleLogin = () => {
    const authorizeUrl =
      process.env.NEXT_PUBLIC_SECURISELF_AUTHORIZE_URL ??
      "http://localhost:3000/oauth/authorize";

    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_CLIENT_ID ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI ?? "",
      response_type: "code",
      scope: "identity_context",
    });

    window.location.href = `${authorizeUrl}?${params.toString()}`;
  };

  const [access, setAccess] = useState<AccessState>({ kind: "loading" });
  const [locale, setLocale] = useState<"en" | "es">("en");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAccess({ kind: "anonymous" });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user", {
          headers: { "Accept-Language": locale },
        });
        if (cancelled) return;
        if (!response.ok) {
          let reason: string | undefined;
          try {
            const body = (await response.json()) as UserErrorBody;
            reason = body.reason;
          } catch {
            reason = undefined;
          }
          setAccess(
            resolveAccessFromUserResponse({
              ok: false,
              reason,
            }),
          );
          return;
        }
        const data = (await response.json()) as ProfileResponse;
        setAccess(
          resolveAccessFromUserResponse({
            ok: true,
            profile: data,
          }),
        );
      } catch {
        if (cancelled) return;
        setAccess(
          resolveAccessFromUserResponse({
            ok: false,
            networkError: true,
          }),
        );
      }
    };
    void fetchUser();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const profile = access.kind === "profile" ? access.profile : null;
  const data = profile?.data ?? {};
  const legalName = [data.legal_first_name, data.legal_last_name]
    .filter(Boolean)
    .join(" ");
  const displayName =
    data.display_name || legalName || data.username || "Guest";
  const avatarUrl = data.avatar_url ?? null;
  const initials = (displayName || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const detailFields = Object.entries(data).filter(
    ([key, value]) =>
      key !== "avatar_url" &&
      key !== "display_name" &&
      value != null &&
      value !== "hidden",
  );

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-accent/15 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[50vh] w-[50vh] rounded-full bg-accent/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_80%)]" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/3 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-accent">
          Luxury rides, on demand
        </span>

        <h1 className="font-mono text-4xl font-semibold uppercase tracking-[0.4em] text-foreground sm:text-6xl">
          Prymecab
        </h1>

        <p className="mt-6 text-balance text-2xl font-light leading-snug text-foreground sm:text-3xl">
          Your city. Your driver. <span className="text-accent">On demand.</span>
        </p>

        <p className="mt-4 max-w-md text-balance text-sm leading-relaxed text-foreground/60 sm:text-base">
          Summon a premium chauffeured ride near you in moments. Sleek vehicles,
          vetted drivers, and an effortless arrival every time.
        </p>

        <div className="mt-12 w-full max-w-sm rounded-2xl border border-white/10 bg-white/3 p-6 backdrop-blur-md">
          {access.kind === "loading" ? (
            <div className="flex items-center justify-center py-4">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            </div>
          ) : access.kind === "profile" && profile ? (
            <div className="flex flex-col items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-20 w-20 rounded-full border border-accent/40 object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-2xl font-semibold text-accent">
                  {initials}
                </span>
              )}

              <div className="flex flex-col items-center gap-1">
                <span className="text-lg font-medium text-foreground">
                  {displayName}
                </span>
                <span className="rounded-full border border-accent/30 px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] text-accent">
                  {profile.context}
                </span>
              </div>

              <div
                role="group"
                aria-label="Profile language"
                data-testid="profile-language"
                className="flex items-center gap-1"
              >
                {(["en", "es"] as const).map((code) => {
                  const selected = locale === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setLocale(code)}
                      className={
                        selected
                          ? "rounded-full border border-accent/40 bg-accent/15 px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-accent"
                          : "rounded-full border border-white/10 px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/50 transition-colors hover:border-white/20 hover:text-foreground/80"
                      }
                    >
                      {code.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {detailFields.length > 0 && (
                <dl className="mt-2 w-full divide-y divide-white/5 text-left">
                  {detailFields.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-4 py-2"
                    >
                      <dt className="text-xs uppercase tracking-wider text-foreground/40">
                        {FIELD_LABELS[key] ?? key}
                      </dt>
                      <dd className="text-right text-sm text-foreground/80">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <span className="mt-2 text-sm text-accent">
                Your luxury ride awaits.
              </span>

              <button
                onClick={handleLogout}
                className="mt-2 w-full rounded-xl border border-white/10 px-6 py-3 text-sm font-medium uppercase tracking-wider text-foreground/70 transition-all duration-200 hover:border-white/20 hover:text-foreground active:scale-[0.98]"
              >
                Log out
              </button>
            </div>
          ) : access.kind === "access_lost" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p
                className="text-sm font-medium text-foreground"
                role="status"
                data-testid="access-lost"
              >
                Previous access is no longer available
              </p>
              <p className="text-sm leading-relaxed text-foreground/60">
                PrymeCab&apos;s previous SecuriSelf access is no longer
                available. Authorise PrymeCab again to restore access.
              </p>
              <p className="text-xs text-foreground/40">
                SecuriSelf rejected the previous authorisation for this
                application.
              </p>
              <button
                onClick={handleLogin}
                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#1a1206] transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--accent)] active:scale-[0.98]"
              >
                Login with SecuriSelf
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </button>
            </div>
          ) : access.kind === "error" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p
                className="text-sm font-medium text-foreground"
                role="status"
                data-testid="access-error"
              >
                Something went wrong
              </p>
              <p className="text-sm leading-relaxed text-foreground/60">
                {access.message}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 w-full rounded-xl border border-white/10 px-6 py-3 text-sm font-medium uppercase tracking-wider text-foreground/70 transition-all duration-200 hover:border-white/20 hover:text-foreground active:scale-[0.98]"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleLogin}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#1a1206] transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--accent)] active:scale-[0.98]"
              >
                Login with SecuriSelf
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </button>
              <p className="mt-4 text-xs text-foreground/40">
                Secure sign-in powered by SecuriSelf
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
