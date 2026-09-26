import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { AUTH_STORAGE_KEY, E2E_ORIGINS } from "../fixtures/test-data";

export async function getPlatformSessionToken(page: Page): Promise<string> {
  const token = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  }, AUTH_STORAGE_KEY);

  expect(token, "Platform session token must be present in localStorage").toBeTruthy();
  return token!;
}

export async function listGrants(
  request: APIRequestContext,
  sessionToken: string,
) {
  const res = await request.get(`${E2E_ORIGINS.api}/api/v1/grants`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    data: Array<{
      id: string;
      revokedAt: string | null;
      application: { name: string; clientId: string };
      context: { category: string; internalName: string };
    }>;
  };
  return body.data;
}

export async function revokeGrant(
  request: APIRequestContext,
  sessionToken: string,
  grantId: string,
): Promise<void> {
  const res = await request.post(
    `${E2E_ORIGINS.api}/api/v1/grants/${grantId}/revoke`,
    { headers: { Authorization: `Bearer ${sessionToken}` } },
  );
  expect(res.ok()).toBeTruthy();
}

export async function fetchVault(
  request: APIRequestContext,
  sessionToken: string,
) {
  const res = await request.get(`${E2E_ORIGINS.api}/api/v1/vault`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { data: { email: string } };
}

/** Prefer page.request / context.request so PrymeCab httpOnly cookies are included. */
export async function fetchPrymeCabProfile(
  request: APIRequestContext,
  headers: Record<string, string> = {},
) {
  return request.get(`${E2E_ORIGINS.prymecab}/api/user`, { headers });
}

export async function fetchAuditLogs(
  request: APIRequestContext,
  sessionToken: string,
) {
  const res = await request.get(`${E2E_ORIGINS.api}/api/v1/audit-logs`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as {
    data: Array<{
      action: string;
      applicationId: string | null;
      contextId: string | null;
    }>;
  };
}
