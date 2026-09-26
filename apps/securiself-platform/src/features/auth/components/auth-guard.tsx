"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { signInWithReturn } from "@/lib/routes";
import { useAuthStore } from "../auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side route guard. Waits for store hydration, then redirects
 * unauthenticated users to sign-in with a returnTo pointing back here.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      const query = searchParams.toString();
      const current = query ? `${pathname}?${query}` : pathname;
      router.replace(signInWithReturn(current));
    }
  }, [hydrated, token, pathname, searchParams, router]);

  if (!hydrated || !token) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
