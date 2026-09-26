import { expect, test } from "../fixtures/test";
import {
  fetchPrymeCabProfile,
  fetchVault,
  getPlatformSessionToken,
} from "../helpers/api";
import {
  approveConsent,
  clearBrowserAuthState,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import {
  assertProfileObject,
  LEGAL_FORBIDDEN,
  SOCIAL_FORBIDDEN,
} from "../helpers/privacy-assertions";
import { E2E_CONTEXTS, E2E_USER } from "../fixtures/test-data";

test.describe("vault versus profile privacy", () => {
  test("vault retains root email while third-party profiles never expose it", async ({
    page,
    browser,
  }) => {
    await reachConsentScreen(page);
    const sessionToken = await getPlatformSessionToken(page);
    const vault = await fetchVault(page.request, sessionToken);
    expect(vault.data.email).toBe(E2E_USER.email);

    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await approveConsent(page);

    const socialRes = await fetchPrymeCabProfile(page.request);
    expect(socialRes.ok()).toBeTruthy();
    const social = (await socialRes.json()) as {
      status: string;
      context: string;
      data: Record<string, string | null>;
    };
    assertProfileObject(social, {
      context: "SOCIAL",
      allowed: {
        display_name: E2E_CONTEXTS.SOCIAL.displayName,
        username: E2E_CONTEXTS.SOCIAL.username,
      },
      forbidden: SOCIAL_FORBIDDEN,
      rootEmail: E2E_USER.email,
    });
    expect(social.data).not.toHaveProperty("legal_first_name");
    expect(social.data).not.toHaveProperty("document_id");

    // Fresh browser context so Platform localStorage is not reused from SOCIAL.
    await clearBrowserAuthState(page);
    const legalContext = await browser.newContext();
    const legalPage = await legalContext.newPage();
    try {
      await reachConsentScreen(legalPage);
      await selectContextByInternalName(
        legalPage,
        E2E_CONTEXTS.LEGAL.internalName,
      );
      await approveConsent(legalPage);

      const legalRes = await fetchPrymeCabProfile(legalPage.request);
      expect(legalRes.ok()).toBeTruthy();
      const legal = (await legalRes.json()) as {
        status: string;
        context: string;
        data: Record<string, string | null>;
      };
      assertProfileObject(legal, {
        context: "LEGAL",
        allowed: {
          legal_first_name: E2E_USER.legalFirstName,
          legal_last_name: E2E_USER.legalLastName,
          document_id: E2E_CONTEXTS.LEGAL.documentId,
        },
        forbidden: LEGAL_FORBIDDEN,
        rootEmail: E2E_USER.email,
      });
    } finally {
      await legalContext.close();
    }
  });
});
