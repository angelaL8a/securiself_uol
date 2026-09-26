"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Languages, Loader2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ContextCategoryBadge } from "@/components/shared/context-category-badge";
import { PayloadPreview } from "@/components/shared/payload-preview";
import { PrivacyFieldRow } from "@/components/shared/privacy-field-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  buildProfilePayload,
  CATEGORY_LOCALISABLE_FIELDS,
  CATEGORY_STABLE_FIELDS,
  CONTEXT_CATEGORIES,
  FIELD_LABELS,
  getPrivacyMatrix,
  type FieldKey,
  type VaultIdentity,
} from "../context-rules";
import {
  contextFormSchema,
  EMPTY_CONTEXT_FORM,
  type ContextFormValues,
} from "../schemas";

interface ContextFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<ContextFormValues>;
  vault?: VaultIdentity;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: ContextFormValues) => void;
}

export function ContextForm({
  mode,
  defaultValues,
  vault,
  isSubmitting,
  submitLabel = mode === "create" ? "Create context" : "Save changes",
  onSubmit,
}: ContextFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContextFormValues>({
    resolver: zodResolver(contextFormSchema),
    defaultValues: {
      category: defaultValues?.category ?? "PROFESSIONAL",
      ...EMPTY_CONTEXT_FORM,
      ...defaultValues,
    },
  });

  const values = useWatch({ control }) as ContextFormValues;
  const category = values.category;
  const stableFields = CATEGORY_STABLE_FIELDS[category];
  const localisableFields = CATEGORY_LOCALISABLE_FIELDS[category];
  const privacyMatrix = getPrivacyMatrix(category);
  const payload = buildProfilePayload(category, values, vault);
  const lockCategory = mode === "edit";

  return (
    <form
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="space-y-8">
        {/* Step 1: category */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">
              {lockCategory ? "Category" : "1. Select a category"}
            </h2>
            <p className="text-xs text-muted-foreground">
              The category determines which fields are shared and which are
              blocked from the API.
            </p>
          </div>

          {lockCategory ? (
            <div className="flex items-center gap-2">
              <ContextCategoryBadge category={category} />
              <span className="text-xs text-muted-foreground">
                Category cannot be changed after creation.
              </span>
            </div>
          ) : (
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Context category"
                >
                  {CONTEXT_CATEGORIES.map((meta) => {
                    const Icon = meta.icon;
                    const selected = field.value === meta.value;
                    return (
                      <button
                        type="button"
                        key={meta.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => field.onChange(meta.value)}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent",
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <Icon
                            className="size-4.5 text-primary"
                            aria-hidden="true"
                          />
                          {selected ? (
                            <ContextCategoryBadge category={meta.value} />
                          ) : null}
                        </div>
                        <span className="text-sm font-medium">
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {meta.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          )}
        </section>

        {/* Step 2: dynamic fields */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">
              {lockCategory ? "Details" : "2. Context details"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Only fields relevant to {category.toLowerCase()} contexts are
              shown.
            </p>
          </div>

          {category === "LEGAL" ? (
            <Alert>
              <Info className="size-4" aria-hidden="true" />
              <AlertTitle>Legal identity comes from your Vault</AlertTitle>
              <AlertDescription>
                {vault?.legalFirstName || vault?.legalLastName
                  ? `This context will disclose your legal name: ${[vault?.legalFirstName, vault?.legalLastName].filter(Boolean).join(" ")}.`
                  : "Add your legal name in the Vault so it can be disclosed for legal contexts. A display name here is an alias and is not treated as legal identity."}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {stableFields.map((field) => {
              const key = field as FieldKey;
              const isWide = key === "internalName";
              return (
                <div
                  key={key}
                  className={cn("space-y-1.5", isWide && "sm:col-span-2")}
                >
                  <Label htmlFor={key}>
                    {FIELD_LABELS[key]}
                    {key === "internalName" ? (
                      <span className="text-destructive"> *</span>
                    ) : null}
                  </Label>
                  <Input
                    id={key}
                    type={key === "avatarUrl" ? "url" : "text"}
                    aria-invalid={Boolean(errors[key])}
                    {...register(key)}
                  />
                  {errors[key] ? (
                    <p className="text-xs text-destructive">
                      {errors[key]?.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {localisableFields.length > 0 ? (
            <section
              className="space-y-3 rounded-lg border p-4"
              aria-labelledby="language-variants-heading"
            >
              <div className="space-y-1">
                <h3
                  id="language-variants-heading"
                  className="flex items-center gap-2 text-sm font-semibold"
                >
                  <Languages className="size-4" aria-hidden="true" />
                  Language variants
                </h3>
                <p
                  id="language-variants-help"
                  className="text-xs text-muted-foreground"
                >
                  English and Spanish are language variants of this same
                  Context. Adding another language does not create a separate
                  Context or permission. Only{" "}
                  {new Intl.ListFormat("en").format(
                    localisableFields.map((field) =>
                      FIELD_LABELS[field].toLowerCase(),
                    ),
                  )}{" "}
                  have language variants; other fields are the same in every
                  language.
                </p>
              </div>
              <Tabs defaultValue="en">
                <TabsList
                  aria-label="Language variant of this Context"
                  aria-describedby="language-variants-help"
                >
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="es">Español</TabsTrigger>
                </TabsList>
                {(["en", "es"] as const).map((locale) => (
                  <TabsContent key={locale} value={locale}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {localisableFields.map((field) => {
                        const key = field as FieldKey;
                        const name =
                          locale === "es"
                            ? (`${key}Es` as
                                | "pronounsEs"
                                | "jobTitleEs"
                                | "shortBioEs")
                            : (key as "pronouns" | "jobTitle" | "shortBio");
                        const inputId = `${key}-${locale}`;
                        const isWide = key === "shortBio";
                        return (
                          <div
                            key={inputId}
                            className={cn(
                              "space-y-1.5",
                              isWide && "sm:col-span-2",
                            )}
                          >
                            <Label htmlFor={inputId}>{FIELD_LABELS[key]}</Label>
                            {key === "shortBio" ? (
                              <Textarea
                                id={inputId}
                                rows={3}
                                {...register(name)}
                              />
                            ) : (
                              <Input id={inputId} type="text" {...register(name)} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              <p className="text-xs text-muted-foreground">
                Apps request a language via Accept-Language. Missing
                translations fall back to English, then to any available value.
              </p>
            </section>
          ) : null}

          {/* surface root-level refinement errors (e.g. social username/displayName) */}
          {errors.username && !stableFields.includes("username") ? (
            <p className="text-xs text-destructive">
              {errors.username.message}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </section>
      </div>

      {/* Sidebar: privacy + payload preview */}
      <aside className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Privacy rules</h2>
          <p className="text-xs text-muted-foreground">
            What this category shares with apps and what it blocks.
          </p>
          <div className="space-y-2">
            {privacyMatrix.map((rule) => (
              <PrivacyFieldRow
                key={rule.label}
                label={rule.label}
                exposed={rule.exposed}
                note={rule.note}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Live payload preview</h2>
          <PayloadPreview
            requestLine="GET /api/v1/profiles/me"
            payload={{
              status: "success",
              context: category,
              data: payload,
            }}
          />
        </div>
      </aside>
    </form>
  );
}
