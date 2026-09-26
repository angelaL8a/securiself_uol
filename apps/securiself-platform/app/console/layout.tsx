import { Suspense } from "react";
import { ConsoleShell } from "@/components/layout/console-shell";
import { AuthGuard } from "@/features/auth/components/auth-guard";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AuthGuard>
        <ConsoleShell>{children}</ConsoleShell>
      </AuthGuard>
    </Suspense>
  );
}
