import { expect, test } from "../fixtures/test";
import {
  expectFocusVisibleOn,
  expectNoCriticalOrSeriousViolations,
} from "../helpers/accessibility";
import {
  approveConsent,
  openGrants,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import {
  E2E_CLIENT,
  E2E_CONTEXTS,
  E2E_ORIGINS,
  E2E_USER,
} from "../fixtures/test-data";

test.describe("accessibility @a11y", () => {
  test("public pages have no critical or serious axe violations", async ({
    page,
  }) => {
    await page.goto(E2E_ORIGINS.platform);
    await expectNoCriticalOrSeriousViolations(page, "platform-landing");

    await page.goto(`${E2E_ORIGINS.platform}/sign-in`);
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
    await expectNoCriticalOrSeriousViolations(page, "sign-in");
    await expectFocusVisibleOn(page, "button", /Sign in/i);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.goto(`${E2E_ORIGINS.platform}/sign-up`);
    await expectNoCriticalOrSeriousViolations(page, "sign-up");

    await page.goto(E2E_ORIGINS.prymecab);
    await expect(page.getByRole("heading", { name: /Prymecab/i })).toBeVisible();
    await expectNoCriticalOrSeriousViolations(page, "prymecab-landing");
    await expectFocusVisibleOn(page, "button", /Login with SecuriSelf/i);
  });

  test("authenticated console and consent screens pass the a11y gate", async ({
    page,
  }) => {
    await page.goto(`${E2E_ORIGINS.platform}/sign-in`);
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Password").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/console/);

    for (const path of [
      "/console",
      "/console/vault",
      "/console/contexts",
      "/console/contexts/new",
      "/console/clients",
      // The post-evaluation refinement split Developer Docs into nine routes;
      // each renders different content (tables, the sticky section aside, the
      // Radix payload tabs), so each is scanned.
      "/console/docs",
      "/console/docs/setup",
      "/console/docs/authorization",
      "/console/docs/token-exchange",
      "/console/docs/profile-api",
      "/console/docs/contexts",
      "/console/docs/grants",
      "/console/docs/errors",
      "/console/docs/reference-integration",
      "/console/grants",
      "/console/activity",
    ]) {
      await page.goto(`${E2E_ORIGINS.platform}${path}`);
      await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
      await expectNoCriticalOrSeriousViolations(page, path);
    }

    // Build authorize URL directly; the user is already authenticated above.
    await page.goto(
      `${E2E_ORIGINS.platform}/oauth/authorize?client_id=${encodeURIComponent(
        E2E_CLIENT.clientId,
      )}&redirect_uri=${encodeURIComponent(
        E2E_CLIENT.redirectUri,
      )}&response_type=code&scope=identity_context`,
    );
    await expect(
      page.getByText(/PrymeCab wants to access an identity context/i),
    ).toBeVisible();
    await expectNoCriticalOrSeriousViolations(page, "oauth-consent");

    const social = page.getByRole("radio", {
      name: new RegExp(E2E_CONTEXTS.SOCIAL.internalName, "i"),
    });
    await social.focus();
    await expect(social).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(social).toHaveAttribute("aria-checked", "true");
    // Cohort A A4: the "Not shared" region renders once a Context is selected.
    await expect(
      page.getByRole("region", { name: /Not shared with PrymeCab/i }),
    ).toBeVisible();
    await expectNoCriticalOrSeriousViolations(page, "oauth-consent-context-selected");

    await expectFocusVisibleOn(page, "button", /^Deny$/i);
    await expectFocusVisibleOn(page, "button", /Approve & continue/i);
    await expect(
      page.getByText(/PrymeCab wants to access an identity context/i),
    ).toBeVisible();
    await expect(page.getByText(/E2E Social/i).first()).toBeVisible();

    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await approveConsent(page);
    await expectNoCriticalOrSeriousViolations(page, "prymecab-profile");
  });

  test("Grants page and revoke dialog pass the a11y gate", async ({ page }) => {
    await reachConsentScreen(page);
    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await approveConsent(page);

    await openGrants(page);
    // Exact match: a substring "Active" also matches the header copy ("stop
    // active access"), which renders before the Grants list has loaded.
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
    await expectNoCriticalOrSeriousViolations(page, "/console/grants-active");

    // Cohort A A1: focused skip link, then the keyboard-highlighted Grant row.
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to main content" }),
    ).toBeFocused();
    await expectNoCriticalOrSeriousViolations(page, "/console/grants-skip-link-focused");
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "View Activity" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: /Revoke PrymeCab access to/i }),
    ).toBeFocused();
    await expectNoCriticalOrSeriousViolations(page, "/console/grants-row-focused");

    const revokeName = new RegExp(
      `Revoke ${E2E_CLIENT.name} access to ${E2E_CONTEXTS.SOCIAL.displayName}`,
      "i",
    );
    const revokeButton = page.getByRole("button", { name: revokeName }).first();
    await revokeButton.focus();
    await expect(revokeButton).toBeFocused();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/invalidate active access/i)).toBeVisible();
    await expectNoCriticalOrSeriousViolations(page, "/console/grants-revoke-dialog");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
