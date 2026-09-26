import { z } from "zod";

const optionalText = z.string().trim();
const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .or(z.literal(""));

export const vaultFormSchema = z.object({
  legalFirstName: optionalText,
  legalLastName: optionalText,
  displayName: optionalText,
  gender: optionalText,
  avatarUrl: optionalUrl,
});

export type VaultFormValues = z.infer<typeof vaultFormSchema>;

/** Converts a form value to the backend payload (empty string -> null). */
export function toVaultPayload(
  values: VaultFormValues,
): Record<string, string | null> {
  const normalize = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  return {
    legalFirstName: normalize(values.legalFirstName),
    legalLastName: normalize(values.legalLastName),
    displayName: normalize(values.displayName),
    gender: normalize(values.gender),
    avatarUrl: normalize(values.avatarUrl),
  };
}
