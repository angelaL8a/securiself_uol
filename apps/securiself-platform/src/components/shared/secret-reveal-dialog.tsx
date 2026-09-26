"use client";

import { KeyRound, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CopyButton } from "./copy-button";

interface SecretRevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** The one-time secret value to reveal. */
  secret: string | null;
  clientId?: string | null;
}

/**
 * Shows a one-time client secret returned by the backend. Makes it explicit the
 * value will not be shown again.
 */
export function SecretRevealDialog({
  open,
  onOpenChange,
  title = "Client secret",
  description = "Copy and store this secret securely.",
  secret,
  clientId,
}: SecretRevealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <AlertTitle>Shown once</AlertTitle>
            <AlertDescription>
              The client secret is shown once. Store it securely. SecuriSelf will
              not show it again.
            </AlertDescription>
          </Alert>

          {clientId ? (
            <div className="space-y-1.5">
              <Label htmlFor="reveal-client-id">Client ID</Label>
              <div className="flex items-center gap-2">
                <code
                  id="reveal-client-id"
                  className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs"
                >
                  {clientId}
                </code>
                <CopyButton value={clientId} label="Copy client ID" />
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="reveal-secret">Client secret</Label>
            <div className="flex items-center gap-2">
              <code
                id="reveal-secret"
                className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs"
              >
                {secret ?? "—"}
              </code>
              {secret ? (
                <CopyButton value={secret} label="Copy secret" />
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">I&apos;ve stored it securely</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
