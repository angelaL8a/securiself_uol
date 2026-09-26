"use client";

import {
  ArrowRight,
  FileWarning,
  KeyRound,
  ScrollText,
  ShieldCheck,
  Vault as VaultIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { ContextCategoryBadge } from "@/components/shared/context-category-badge";
import { PayloadPreview } from "@/components/shared/payload-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildProfilePayload,
  CONTEXT_CATEGORIES,
} from "@/features/contexts/context-rules";
import type { ContextCategory } from "@/features/contexts/types";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const SAMPLE_VAULT = {
  legalFirstName: "Ada",
  legalLastName: "Lovelace",
};

const SAMPLE_CONTEXTS: Record<
  ContextCategory,
  Parameters<typeof buildProfilePayload>[1]
> = {
  PROFESSIONAL: {
    displayName: "Ada Lovelace",
    pronouns: "she/her",
    jobTitle: "Principal Engineer",
    company: "Analytical Engines",
    shortBio: "Building computational systems.",
    avatarUrl: "https://cdn.example.com/ada-pro.png",
  },
  LEGAL: {
    displayName: "Ada Lovelace",
    documentId: "ID-4421-9087",
    avatarUrl: "https://cdn.example.com/ada-legal.png",
  },
  SOCIAL: {
    username: "countess_of_code",
    displayName: "Countess of Code",
    pronouns: "she/her",
    avatarUrl: "https://cdn.example.com/ada-social.png",
  },
  PRIVATE: {
    displayName: "A.",
    pronouns: "she/her",
    avatarUrl: null,
  },
};

const FLOW_STEPS = [
  {
    icon: VaultIcon,
    title: "Vault",
    description: "Your private root identity lives here and is never exposed directly.",
  },
  {
    icon: ShieldCheck,
    title: "Contexts",
    description: "Create context-bound identities: professional, legal, social, private.",
  },
  {
    icon: KeyRound,
    title: "Client authorization",
    description: "Apps request access through an OAuth-like consent screen.",
  },
  {
    icon: ArrowRight,
    title: "Context-bound payload",
    description: "Each app receives only the fields its approved context allows.",
  },
  {
    icon: ScrollText,
    title: "Audit log",
    description: "Every grant and profile read is recorded for full accountability.",
  },
];

export default function LandingPage() {
  const [active, setActive] = useState<ContextCategory>("PROFESSIONAL");

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              Contextual identity & privacy platform
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Control which version of your identity each app can access.
            </h1>
            <p className="text-lg text-muted-foreground">
              SecuriSelf splits your identity into purpose-built contexts. Apps
              never see your full profile — only the context-bound payload you
              explicitly authorize.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={routes.signUp}>
                  Create account
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={routes.signIn}>Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div className="space-y-4">
                <div className="flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <FileWarning className="size-5" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Traditional login shares a fixed profile
                </h2>
                <p className="text-muted-foreground">
                  With conventional sign-in, every application receives the same
                  identity: your name, your email, often more. A social game and
                  a legal service end up with identical access to who you are.
                </p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    One identity, shared everywhere
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PayloadPreview
                    title="Conventional login"
                    requestLine="GET /userinfo"
                    showCopy={false}
                    payload={{
                      name: "Ada Lovelace",
                      email: "ada@example.com",
                      gender: "female",
                      document_id: "ID-4421-9087",
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Solution flow */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              How SecuriSelf works
            </h2>
            <p className="text-muted-foreground">
              From private root identity to an auditable, context-bound payload.
            </p>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {FLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title}>
                  <Card className="h-full">
                    <CardContent className="space-y-3 pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-4.5" aria-hidden="true" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          0{index + 1}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Context cards */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Four contexts, four versions of you
              </h2>
              <p className="text-muted-foreground">
                Each category enforces its own privacy rules at the API layer.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CONTEXT_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.value} className="h-full">
                    <CardContent className="space-y-3 pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-4.5" aria-hidden="true" />
                        </div>
                        <ContextCategoryBadge category={category.value} />
                      </div>
                      <h3 className="text-sm font-semibold">{category.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* API preview */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                Same endpoint. Different payload per context.
              </h2>
              <p className="text-muted-foreground">
                A client calls{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                  GET /api/v1/profiles/me
                </code>{" "}
                with a context-bound token. The response only ever contains the
                fields that context permits.
              </p>
              <div
                role="radiogroup"
                aria-label="Preview context category"
                className="flex h-auto flex-wrap gap-1 rounded-lg bg-muted p-[3px]"
              >
                {CONTEXT_CATEGORIES.map((category) => {
                  const selected = active === category.value;
                  return (
                    <button
                      key={category.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setActive(category.value)}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "bg-background text-foreground shadow-sm"
                          : "text-foreground/60 hover:text-foreground",
                      )}
                    >
                      {category.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
            <div aria-live="polite">
              <PayloadPreview
                requestLine="GET /api/v1/profiles/me"
                payload={{
                  status: "success",
                  context: active,
                  data: buildProfilePayload(
                    active,
                    SAMPLE_CONTEXTS[active],
                    SAMPLE_VAULT,
                  ),
                }}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Take control of your contextual identity
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Create your vault, define your contexts, and decide exactly what
              every application is allowed to see.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild size="lg">
                <Link href={routes.signUp}>Create account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={routes.signIn}>Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden="true" />
            SecuriSelf
          </span>
          <span>Contextual identity & privacy — academic prototype.</span>
        </div>
      </footer>
    </div>
  );
}
