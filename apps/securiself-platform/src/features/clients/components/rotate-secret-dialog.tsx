"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SecretRevealDialog } from "@/components/shared/secret-reveal-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRotateClientSecret } from "../hooks";

interface RotateSecretDialogProps {
  clientId: string;
  clientPublicId: string;
}

export function RotateSecretDialog({
  clientId,
  clientPublicId,
}: RotateSecretDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const rotate = useRotateClientSecret(clientId);

  const handleRotate = () => {
    rotate.mutate(undefined, {
      onSuccess: (result) => {
        setSecret(result.clientSecret);
        setConfirmOpen(false);
        setRevealOpen(true);
        toast.success("Client secret rotated");
      },
      onError: () => {
        toast.error("Could not rotate client secret");
      },
    });
  };

  return (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <RefreshCw className="size-4" aria-hidden="true" />
            Rotate secret
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate client secret?</DialogTitle>
            <DialogDescription>
              The current secret will stop working immediately. Any integration
              using it must be updated with the new secret, which will be shown
              only once.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRotate}
              disabled={rotate.isPending}
            >
              {rotate.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Rotating…
                </>
              ) : (
                "Rotate secret"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SecretRevealDialog
        open={revealOpen}
        onOpenChange={(open) => {
          setRevealOpen(open);
          if (!open) setSecret(null);
        }}
        title="New client secret"
        description="Your client secret has been rotated."
        secret={secret}
        clientId={clientPublicId}
      />
    </>
  );
}
