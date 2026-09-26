"use client";

import { LogOut, Menu, ShieldCheck, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCurrentUser, useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/auth-store";
import { ConsoleNav } from "./console-sidebar";

export function ConsoleTopbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useLogout();
  const { data: user } = useCurrentUser();
  const storedUser = useAuthStore((s) => s.user);
  const email = user?.email ?? storedUser?.email ?? "Account";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-4" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="h-16 justify-center border-b px-4">
              <SheetTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                SecuriSelf
              </SheetTitle>
            </SheetHeader>
            <div className="p-3">
              <ConsoleNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge tone="info" icon={ShieldCheck}>
          Local environment
        </StatusBadge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="max-w-[200px]">
              <UserIcon className="size-4" aria-hidden="true" />
              <span className="truncate">{email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
