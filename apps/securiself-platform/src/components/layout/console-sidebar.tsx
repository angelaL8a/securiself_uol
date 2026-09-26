"use client";

import {
  Activity,
  BookOpen,
  KeyRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  Vault,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /console/contexts/new). */
  matchPrefix?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: routes.console.root, icon: LayoutDashboard },
  { label: "Vault", href: routes.console.vault, icon: Vault, matchPrefix: true },
  {
    label: "Contexts",
    href: routes.console.contexts,
    icon: ShieldCheck,
    matchPrefix: true,
  },
  {
    label: "Clients",
    href: routes.console.clients,
    icon: Users,
    matchPrefix: true,
  },
  {
    label: "Developer Docs",
    href: routes.console.docs,
    icon: BookOpen,
    matchPrefix: true,
  },
  {
    label: "Grants",
    href: routes.console.grants,
    icon: KeyRound,
    matchPrefix: true,
  },
  {
    label: "Activity",
    href: routes.console.activity,
    icon: Activity,
    matchPrefix: true,
  },
  {
    label: "Settings",
    href: routes.console.settings,
    icon: Settings,
    matchPrefix: true,
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === routes.console.root) return pathname === item.href;
  if (item.matchPrefix) return pathname.startsWith(item.href);
  return pathname === item.href;
}

interface ConsoleNavProps {
  onNavigate?: () => void;
}

export function ConsoleNav({ onNavigate }: ConsoleNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Console">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ConsoleSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4 font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-4.5" aria-hidden="true" />
        </span>
        SecuriSelf
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ConsoleNav />
      </div>
    </aside>
  );
}
