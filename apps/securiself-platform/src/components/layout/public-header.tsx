import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href={routes.home}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4.5" aria-hidden="true" />
          </span>
          SecuriSelf
        </Link>
        <nav className="flex items-center gap-2" aria-label="Primary">
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.signIn}>Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={routes.signUp}>Create account</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
