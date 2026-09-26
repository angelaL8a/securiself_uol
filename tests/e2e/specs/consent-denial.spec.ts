import { expect, test } from "../fixtures/test";
import {
  fetchAuditLogs,
  fetchPrymeCabProfile,
  getPlatformSessionToken,
} from "../helpers/api";
import {
  denyConsent,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import { E2E_CONTEXTS, E2E_ORIGINS } from "../fixtures/test-data";

test.describe("consent denial", () => {
  test("denies without issuing a usable code or PROFILE_READ", async ({
    page,
  }) => {
    await reachConsentScreen(page);
    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await denyConsent(page);

    expect(page.url()).toContain(E2E_ORIGINS.platform);
    expect(page.url()).not.toMatch(/[?&]code=/);

    const profileRes = await fetchPrymeCabProfile(page.request);
    expect(profileRes.status()).toBe(401);

    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByRole("link", { name: /Go to console/i })).toBeVisible();

    const sessionToken = await getPlatformSessionToken(page);
    const audit = await fetchAuditLogs(page.request, sessionToken);
    const actions = audit.data.map((log) => log.action);
    expect(actions).not.toContain("ACCESS_GRANTED");
    expect(actions).not.toContain("PROFILE_READ");
  });
});
