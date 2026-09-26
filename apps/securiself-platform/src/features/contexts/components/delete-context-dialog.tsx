"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { routes } from "@/lib/routes";
import { useDeleteContext } from "../hooks";

interface DeleteContextDialogProps {
  contextId: string;
  contextName: string;
}

export function DeleteContextDialog({
  contextId,
  contextName,
}: DeleteContextDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const deleteContext = useDeleteContext();

  const handleDelete = () => {
    deleteContext.mutate(contextId, {
      onSuccess: () => {
        toast.success("Context deleted");
        setOpen(false);
        router.push(routes.console.contexts);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Could not delete context",
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this context?</DialogTitle>
          <DialogDescription>
            This permanently removes the{" "}
            <span className="font-medium text-foreground">{contextName}</span>{" "}
            context. Applications authorized through it will lose access. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteContext.isPending}
          >
            {deleteContext.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              "Delete context"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
