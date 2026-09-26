"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import {
  grantContextLabel,
  revokeActionLabel,
} from "../grant-labels";
import { useRevokeGrant } from "../hooks";
import type { Grant } from "../types";

interface RevokeGrantDialogProps {
  grant: Grant;
  onRevoked?: (grant: Grant) => void;
}

export function RevokeGrantDialog({
  grant,
  onRevoked,
}: RevokeGrantDialogProps) {
  const [open, setOpen] = useState(false);
  const revoke = useRevokeGrant();
  const contextLabel = grantContextLabel(grant.context);
  const actionName = revokeActionLabel(grant.application.name, contextLabel);

  const handleRevoke = () => {
    if (revoke.isPending) return;
    revoke.mutate(grant.id, {
      onSuccess: () => {
        toast.success("Grant revoked");
        onRevoked?.(grant);
        setOpen(false);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Could not revoke grant",
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          aria-label={actionName}
        >
          Revoke
        </Button>
      </DialogTrigger>
      {/* Opaque from the first frame: fading in rendered this text below 4.5:1 (F1). */}
      <DialogContent className="data-[state=open]:fade-in-100">
        <DialogHeader>
          <DialogTitle>Revoke access for {grant.application.name}?</DialogTitle>
          <DialogDescription>
            Confirming will invalidate active access associated with{" "}
            <span className="font-medium text-foreground">
              {grant.application.name}
            </span>{" "}
            and the{" "}
            <span className="font-medium text-foreground">{contextLabel}</span>{" "}
            Context. Tokens issued for that application–Context permission will
            stop working. The Context, application, and activity history are not
            deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={revoke.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRevoke}
            disabled={revoke.isPending}
            aria-label={actionName}
          >
            {revoke.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Revoking…
              </>
            ) : (
              "Revoke access"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
