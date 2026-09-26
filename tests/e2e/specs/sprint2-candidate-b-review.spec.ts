import { expect, test } from "../fixtures/test";
import {
  approveConsent,
  expectPrymeCabProfileContext,
  openGrants,
  openPrymeCabLanding,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import { E2E_CLIENT, E2E_CONTEXTS } from "../fixtures/test-data";
import path from "node:path";
import { mkdirSync } from "node:fs";

const SCREENSHOT_DIR = path.resolve(
  "docs/sprints/evidence/sprint2-candidate-b/screenshots",
);

test.describe("Sprint 2 Candidate B structured review @sprint2-candidate-b-review", () => {
  test("captures post-revocation continuation, Activity labels, and PrymeCab wording", async ({
    page,
  }) => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await reachConsentScreen(page);
    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "SOCIAL");

    await openGrants(page);
    const revokeButton = page.getByRole("button", {
      name: new RegExp(
        `Revoke ${E2E_CLIENT.name} access to ${E2E_CONTEXTS.SOCIAL.displayName}`,
        "i",
      ),
    });
    await revokeButton.first().click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", {
        name: new RegExp(
          `Revoke ${E2E_CLIENT.name} access to ${E2E_CONTEXTS.SOCIAL.displayName}`,
          "i",
        ),
      })
      .click();

    await expect(page.getByTestId("revoke-continuation")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator('[data-slot="badge"]', { hasText: /^Revoked$/ }).first(),
    ).toBeVisible();
    await expect(page.getByText("First authorised").first()).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "cb-01-desktop-continuation.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "cb-01-narrow-continuation.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    const activityLink = page.getByTestId("revoke-continuation-activity");
    await activityLink.focus();
    await expect(activityLink).toBeFocused();
    await activityLink.click();

    await expect(page.getByText("Access revoked").first()).toBeVisible();
    await expect(
      page.getByText(E2E_CONTEXTS.SOCIAL.displayName).first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(`Internal name: ${E2E_CONTEXTS.SOCIAL.internalName}`)
        .first(),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "cb-02-activity-context-labels.png"),
      fullPage: true,
    });

    await openPrymeCabLanding(page);
    await expect(page.getByTestId("access-lost")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/previous SecuriSelf access is no longer available/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Authorise PrymeCab again to restore access/i),
    ).toBeVisible();
    await expect(page.getByText(E2E_CONTEXTS.SOCIAL.displayName)).toHaveCount(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "cb-03-prymecab-access-lost.png"),
      fullPage: true,
    });
  });
});
