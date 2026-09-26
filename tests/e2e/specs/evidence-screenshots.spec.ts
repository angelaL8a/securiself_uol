import { existsSync } from "node:fs";
import { expect, test } from "../fixtures/test";
import {
  a11yPlaywrightReportIndexPath,
  captureEvidenceLocatorScreenshot,
  captureEvidenceScreenshot,
  EVALUATED_COMMIT,
  prepareEvidencePage,
  playwrightReportIndexPath,
  SCREENSHOT_FILES,
  serveStaticReportDir,
} from "../helpers/evidence-screenshots";
import {
  approveConsent,
  denyConsent,
  expectPrymeCabProfileContext,
  openActivity,
  openPrymeCabLanding,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import { E2E_CONTEXTS, E2E_ORIGINS } from "../fixtures/test-data";

/**
 * Deterministic visual evidence for the Topic 6 write-up pack.
 * Tagged @evidence so it is excluded from the default `pnpm test:e2e` suite.
 *
 * Security: never screenshots the sign-in form while password is filled;
 * never opens DevTools; Playwright viewport shots omit the address bar.
 */
test.describe("evidence screenshots @evidence", () => {
  test.describe.configure({ mode: "serial" });

  test("capture SOCIAL disclosure path UI states", async ({ page }) => {
    await prepareEvidencePage(page);

    // SS-03 — PrymeCab initiates Login with SecuriSelf (unauthenticated)
    await openPrymeCabLanding(page);
    await expect(
      page.getByRole("button", { name: /Login with SecuriSelf/i }),
    ).toBeVisible();
    await captureEvidenceScreenshot(page, SCREENSHOT_FILES.prymecabLanding);

    // Reach consent without capturing the password-filled sign-in form.
    await reachConsentScreen(page);
    await expect(
      page.getByText(/PrymeCab wants to access an identity context/i),
    ).toBeVisible();

    // SS-04 — concise consent card figure: requesting app, context choices,
    // SOCIAL selected + payload preview, Deny / Approve fully visible.
    // Element capture avoids clipping from a short viewport without a full-page dump.
    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    const preview = page.locator("pre, code").filter({ hasText: "AngelaTech" });
    await expect(preview.first()).toBeVisible();
    const heading = page.getByText(
      /PrymeCab wants to access an identity context/i,
    );
    const deny = page.getByRole("button", { name: /^Deny$/i });
    const approve = page.getByRole("button", { name: /Approve & continue/i });
    await expect(heading).toBeVisible();
    await expect(deny).toBeVisible();
    await expect(approve).toBeVisible();
    await expect(
      page.getByRole("radio", {
        name: new RegExp(E2E_CONTEXTS.SOCIAL.internalName, "i"),
      }),
    ).toHaveAttribute("aria-checked", "true");
    const consentCard = page.locator("main [data-slot='card']").first();
    await expect(consentCard).toBeVisible();
    await captureEvidenceLocatorScreenshot(
      consentCard,
      SCREENSHOT_FILES.oauthConsent,
    );

    // SS-05 — taller archive of SOCIAL payload preview (not the primary figure).
    await captureEvidenceScreenshot(
      page,
      SCREENSHOT_FILES.consentPreviewSocial,
      { fullPage: true },
    );

    // SS-06 — PrymeCab filtered SOCIAL profile (local seeded avatar must load).
    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "SOCIAL");
    await expect(
      page.getByText(E2E_CONTEXTS.SOCIAL.displayName).first(),
    ).toBeVisible();
    // Wait until callback settles so an auth code is not mid-navigation.
    await expect(page).not.toHaveURL(/[?&]code=/);
    const avatar = page.locator('img[alt="AngelaTech"]');
    await expect(avatar).toBeVisible();
    await expect
      .poll(async () =>
        avatar.evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await captureEvidenceScreenshot(
      page,
      SCREENSHOT_FILES.prymecabProfileSocial,
    );

    // SS-07 — Activity PROFILE_READ
    await openActivity(page);
    await expect(page.getByText("Profile read").first()).toBeVisible();
    await expect(page.getByText("PrymeCab").first()).toBeVisible();
    await expect(page.getByText(/E2E Social/i).first()).toBeVisible();
    await captureEvidenceScreenshot(
      page,
      SCREENSHOT_FILES.activityProfileRead,
    );
  });

  test("capture consent denial UI state", async ({ page }) => {
    await prepareEvidencePage(page);
    await reachConsentScreen(page);
    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await denyConsent(page);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText(/No data was shared/i)).toBeVisible();
    expect(page.url()).toContain(E2E_ORIGINS.platform);
    expect(page.url()).not.toMatch(/[?&]code=/);
    await captureEvidenceScreenshot(page, SCREENSHOT_FILES.consentDenied);
  });

  test("capture Playwright HTML report evidence views", async ({ page }) => {
    await prepareEvidencePage(page);

    const e2eReportPath = playwrightReportIndexPath();
    test.skip(
      !existsSync(e2eReportPath),
      `Playwright HTML report missing at ${e2eReportPath}; run pnpm test:e2e first`,
    );

    const e2eServer = await serveStaticReportDir(e2eReportPath, 9324);
    try {
      await page.goto(e2eServer.baseUrl, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/Passed|All/i).first()).toBeVisible({
        timeout: 15_000,
      });
      await captureEvidenceScreenshot(
        page,
        SCREENSHOT_FILES.playwrightE2eSummary,
        { fullPage: true },
      );

      // Prefer expanded SOCIAL test detail; fall back to list row if the report
      // SPA does not expose the nested title as plain text.
      const socialFile = page.getByText("social-disclosure.spec.ts").first();
      await expect(socialFile).toBeVisible({ timeout: 10_000 });
      await socialFile.scrollIntoViewIfNeeded();
      await socialFile.click();
      const socialCase = page
        .getByText(/authorizes SOCIAL context end-to-end with zero forbidden leakage/i)
        .first();
      if (await socialCase.isVisible().catch(() => false)) {
        await socialCase.click();
      } else {
        await socialFile.scrollIntoViewIfNeeded();
      }
      await captureEvidenceScreenshot(
        page,
        SCREENSHOT_FILES.socialDisclosureReport,
        { fullPage: true },
      );
    } finally {
      await e2eServer.close();
    }

    const a11yReportPath = a11yPlaywrightReportIndexPath();
    test.skip(
      !existsSync(a11yReportPath),
      `A11y Playwright HTML report missing at ${a11yReportPath}; run pnpm test:a11y first`,
    );

    const a11yServer = await serveStaticReportDir(a11yReportPath, 9325);
    try {
      await page.goto(a11yServer.baseUrl, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/a11y|accessibility|Passed/i).first()).toBeVisible({
        timeout: 15_000,
      });
      const publicA11y = page
        .getByText(/public pages have no critical or serious axe violations/i)
        .first();
      if (await publicA11y.isVisible().catch(() => false)) {
        await publicA11y.click();
      }
      await captureEvidenceScreenshot(page, SCREENSHOT_FILES.a11yResultView, {
        fullPage: true,
      });
    } finally {
      await a11yServer.close();
    }
  });
});

// Keep commit reference discoverable for the manifest generator / auditors.
void EVALUATED_COMMIT;
