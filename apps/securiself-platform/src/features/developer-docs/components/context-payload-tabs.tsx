"use client";

import { PayloadPreview } from "@/components/shared/payload-preview";
import { PrivacyFieldRow } from "@/components/shared/privacy-field-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildProfilePayload,
  CONTEXT_CATEGORIES,
  getPrivacyMatrix,
} from "@/features/contexts/context-rules";
import {
  EXAMPLE_CONTEXT,
  EXAMPLE_VAULT,
  LOCALISABLE_RESPONSE_FIELDS,
} from "../developer-docs";
import { C, H3, P } from "./docs-primitives";

/**
 * Per-category payload reference. The one interactive part of the docs, so it
 * is the only client component among the area content; the Radix primitive
 * supplies the roving-tabindex and ARIA tab semantics.
 */
export function ContextPayloadTabs() {
  return (
    <Tabs defaultValue="PROFESSIONAL">
      <TabsList>
        {CONTEXT_CATEGORIES.map((category) => (
          <TabsTrigger key={category.value} value={category.value}>
            {category.shortLabel}
          </TabsTrigger>
        ))}
      </TabsList>
      {CONTEXT_CATEGORIES.map((category) => {
        const localisable = LOCALISABLE_RESPONSE_FIELDS[category.value];
        return (
          <TabsContent
            key={category.value}
            value={category.value}
            className="space-y-4 pt-2"
          >
            <P>
              <span className="break-all font-mono text-xs">
                {category.value}
              </span>{" "}
              — {category.description}
            </P>
            <PayloadPreview
              title={`${category.shortLabel} payload`}
              copyLabel={`Copy ${category.shortLabel} payload`}
              payload={{
                status: "success",
                context: category.value,
                data: buildProfilePayload(
                  category.value,
                  EXAMPLE_CONTEXT,
                  EXAMPLE_VAULT,
                ),
              }}
            />
            <div className="space-y-2">
              <H3>Disclosure</H3>
              <div className="space-y-1.5">
                {getPrivacyMatrix(category.value).map((rule) => (
                  <PrivacyFieldRow
                    key={rule.label}
                    label={rule.label}
                    exposed={rule.exposed}
                    note={rule.note}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Rows marked <strong>Shared</strong> can appear in <C>data</C>;
                rows marked <strong>Blocked</strong> are never returned for this
                category.
              </p>
            </div>
            <p className="text-sm">
              <strong>Localisable fields:</strong>{" "}
              {localisable.length ? (
                localisable.map((field, index) => (
                  <span key={field}>
                    {index > 0 ? ", " : ""}
                    <C>{field}</C>
                  </span>
                ))
              ) : (
                <span>none for this category</span>
              )}
              .
            </p>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
