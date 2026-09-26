"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateClient } from "@/features/clients/hooks";
import {
  createClientSchema,
  type CreateClientValues,
} from "@/features/clients/schemas";
import type { CreatedClientResponse } from "@/features/clients/types";
import { ApiError } from "@/lib/api-client";
import { routes } from "@/lib/routes";

export default function NewClientPage() {
  const createClient = useCreateClient();
  const [created, setCreated] = useState<CreatedClientResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { name: "", redirectUri: "" },
  });

  const onSubmit = (values: CreateClientValues) => {
    createClient.mutate(values, {
      onSuccess: (result) => {
        setCreated(result);
        toast.success("Client registered");
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Could not register client",
        );
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={routes.console.clients}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to clients
          </Link>
        </Button>
        <PageHeader
          title="Register client"
          description="Register a third-party application to obtain OAuth-like credentials."
        />
      </div>

      {created ? (
        <CredentialsResult result={created} />
      ) : (
        <SectionCard
          title="Application details"
          description="The redirect URI must exactly match the one the application uses."
          className="max-w-2xl"
        >
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Application name</Label>
              <Input
                id="name"
                placeholder="PrymeCab"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="redirectUri">Redirect URI</Label>
              <Input
                id="redirectUri"
                type="url"
                placeholder="https://app.example.com/callback"
                aria-invalid={Boolean(errors.redirectUri)}
                {...register("redirectUri")}
              />
              {errors.redirectUri ? (
                <p className="text-xs text-destructive">
                  {errors.redirectUri.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Registering…
                </>
              ) : (
                "Register client"
              )}
            </Button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}

function CredentialsResult({ result }: { result: CreatedClientResponse }) {
  const { application, clientSecret } = result;
  return (
    <div className="max-w-2xl space-y-6">
      <Alert variant="destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        <AlertTitle>Save your client secret now</AlertTitle>
        <AlertDescription>
          The client secret is shown once. Store it securely. SecuriSelf will not
          show it again.
        </AlertDescription>
      </Alert>

      <SectionCard title="Client credentials">
        <div className="space-y-4">
          <CredentialRow label="Client ID" value={application.clientId} />
          <CredentialRow
            label="Client secret"
            value={clientSecret}
            highlight
          />
          <CredentialRow label="Redirect URI" value={application.redirectUri} />
        </div>
      </SectionCard>

      <div className="flex gap-3">
        <Button asChild>
          <Link href={routes.console.client(application.id)}>
            Go to client
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.console.clients}>All clients</Link>
        </Button>
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs ${
            highlight ? "border-primary/40 bg-primary/5" : "bg-muted"
          }`}
        >
          {value}
        </code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}
