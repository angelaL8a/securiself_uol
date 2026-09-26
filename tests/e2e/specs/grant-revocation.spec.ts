import { expect, test } from "../fixtures/test";
import { fetchPrymeCabProfile } from "../helpers/api";
import {
  approveConsent,
  expectPrymeCabProfileContext,
  openGrants,
  openPrymeCabLanding,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import { E2E_CLIENT, E2E_CONTEXTS } from "../fixtures/test-data";

test.describe("grant revocation", () => {
  test("revokes the active PrymeCab grant through the Grants UI and invalidates access", async ({
    page,
    context,
  }) => {
    await reachConsentScreen(page);
    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "SOCIAL");

    const before = await fetchPrymeCabProfile(page.request);
    expect(before.ok()).toBeTruthy();

    await openGrants(page);

    const revokeButton = page.getByRole("button", {
      name: new RegExp(
        `Revoke ${E2E_CLIENT.name} access to ${E2E_CONTEXTS.SOCIAL.displayName}`,
        "i",
      ),
    });
    await expect(revokeButton.first()).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
    await expect(page.getByText(E2E_CLIENT.name).first()).toBeVisible();
    await expect(
      page.getByText(E2E_CONTEXTS.SOCIAL.displayName).first(),
    ).toBeVisible();

    await revokeButton.first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/invalidate active access/i)).toBeVisible();
    await dialog
      .getByRole("button", {
        name: new RegExp(
          `Revoke ${E2E_CLIENT.name} access to ${E2E_CONTEXTS.SOCIAL.displayName}`,
          "i",
        ),
      })
      .click();

    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("revoke-continuation")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/check PrymeCab to confirm/i),
    ).toBeVisible();
    const viewActivity = page.getByTestId("revoke-continuation-activity");
    await expect(viewActivity).toBeVisible();
    await expect(viewActivity).toHaveAttribute("href", "/console/activity");
    await expect(viewActivity).toHaveAccessibleName("View Activity");

    await expect(
      page.getByRole("button", {
        name: new RegExp(
          `Revoke ${E2E_CLIENT.name} access to ${E2E_CONTEXTS.SOCIAL.displayName}`,
          "i",
        ),
      }),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-slot="badge"]', { hasText: /^Revoked$/ }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await viewActivity.click();
    await expect(page).toHaveURL(/\/console\/activity/);
    await expect(page.getByText("Access revoked").first()).toBeVisible();
    await expect(
      page.getByText(E2E_CONTEXTS.SOCIAL.displayName).first(),
    ).toBeVisible();
    await expect(
      page.getByText(`Internal name: ${E2E_CONTEXTS.SOCIAL.internalName}`).first(),
    ).toBeVisible();

    // Browser journey first so the landing fetch still carries the revoked cookie.
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
    await expect(
      page.getByRole("button", { name: /Login with SecuriSelf/i }),
    ).toBeVisible();
    await expect(page.getByText("SOCIAL", { exact: true })).toHaveCount(0);
    await expect(page.getByText(E2E_CONTEXTS.SOCIAL.displayName)).toHaveCount(0);

    const after = await fetchPrymeCabProfile(page.request);
    expect(after.status()).toBe(401);
    const afterBody = (await after.json()) as { reason?: string };
    expect(afterBody.reason).toBe("access_rejected");

    const storage = await context.storageState();
    expect(JSON.stringify(storage)).not.toMatch(/scs_secret_/);
  });
});
