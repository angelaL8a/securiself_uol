export function profilesMeHeaders(
  accessToken: string,
  acceptLanguage?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  const language = acceptLanguage?.trim();
  if (language) {
    headers["Accept-Language"] = language;
  }
  return headers;
}
