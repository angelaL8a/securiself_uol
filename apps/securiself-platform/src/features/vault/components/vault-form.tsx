"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useUpdateVault } from "../hooks";
import {
  toVaultPayload,
  vaultFormSchema,
  type VaultFormValues,
} from "../schemas";
import type { Vault } from "../types";

interface VaultFormProps {
  vault: Vault;
}

const FIELDS: { name: keyof VaultFormValues; label: string; type?: string }[] = [
  { name: "legalFirstName", label: "Legal first name" },
  { name: "legalLastName", label: "Legal last name" },
  { name: "displayName", label: "Display name" },
  { name: "gender", label: "Gender" },
  { name: "avatarUrl", label: "Avatar URL", type: "url" },
];

export function VaultForm({ vault }: VaultFormProps) {
  const updateVault = useUpdateVault();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<VaultFormValues>({
    resolver: zodResolver(vaultFormSchema),
    defaultValues: {
      legalFirstName: vault.legalFirstName ?? "",
      legalLastName: vault.legalLastName ?? "",
      displayName: vault.displayName ?? "",
      gender: vault.gender ?? "",
      avatarUrl: vault.avatarUrl ?? "",
    },
  });

  useEffect(() => {
    reset({
      legalFirstName: vault.legalFirstName ?? "",
      legalLastName: vault.legalLastName ?? "",
      displayName: vault.displayName ?? "",
      gender: vault.gender ?? "",
      avatarUrl: vault.avatarUrl ?? "",
    });
  }, [vault, reset]);

  const onSubmit = (values: VaultFormValues) => {
    updateVault.mutate(toVaultPayload(values), {
      onSuccess: (updated) => {
        toast.success("Vault updated");
        reset({
          legalFirstName: updated.legalFirstName ?? "",
          legalLastName: updated.legalLastName ?? "",
          displayName: updated.displayName ?? "",
          gender: updated.gender ?? "",
          avatarUrl: updated.avatarUrl ?? "",
        });
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Could not update vault",
        );
      },
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Alert>
        <Lock className="size-4" aria-hidden="true" />
        <AlertTitle>This is your private root identity</AlertTitle>
        <AlertDescription>
          Vault data is never exposed directly to third-party applications. Apps
          only receive the specific fields allowed by the context you authorize —
          for example, your legal name is only shared through a Legal context.
        </AlertDescription>
      </Alert>

      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={
              field.name === "avatarUrl" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"
            }
          >
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              type={field.type ?? "text"}
              aria-invalid={Boolean(errors[field.name])}
              {...register(field.name)}
            />
            {errors[field.name] ? (
              <p className="text-xs text-destructive">
                {errors[field.name]?.message}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={updateVault.isPending || !isDirty}
        >
          {updateVault.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        {!isDirty ? (
          <span className="text-xs text-muted-foreground">No changes</span>
        ) : null}
      </div>
    </form>
  );
}
