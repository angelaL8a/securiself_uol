import { expect, test } from "../fixtures/test";
import { fetchPrymeCabProfile } from "../helpers/api";
import {
  approveConsent,
  expectPrymeCabProfileContext,
  openActivity,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import {
  assertProfileObject,
  assertUiHasNoForbiddenText,
  SOCIAL_FORBIDDEN,
} from "../helpers/privacy-assertions";
import { E2E_CONTEXTS, E2E_USER } from "../fixtures/test-data";

test.describe("SOCIAL disclosure happy path", () => {
  test("authorizes SOCIAL context end-to-end with zero forbidden leakage", async ({
    page,
  }) => {
    await reachConsentScreen(page);

    // No profile disclosed before approval.
    const before = await fetchPrymeCabProfile(page.request);
    expect(before.status()).toBe(401);

    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);

    const preview = page
      .locator("pre, code")
      .filter({ hasText: E2E_CONTEXTS.SOCIAL.displayName });
    await expect(preview.first()).toBeVisible();
    const previewJson = await preview.first().innerText();
    for (const forbidden of [
      E2E_USER.email,
      E2E_USER.legalFirstName,
      E2E_USER.legalLastName,
      E2E_CONTEXTS.LEGAL.documentId,
      E2E_USER.gender,
      E2E_CONTEXTS.PROFESSIONAL.jobTitle,
      `"company"`,
      "job_title",
      "document_id",
      "legal_first_name",
    ]) {
      expect(previewJson).not.toContain(forbidden);
    }

    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "SOCIAL");
    await expect(
      page.getByText(E2E_CONTEXTS.SOCIAL.displayName).first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("definition")
        .filter({ hasText: E2E_CONTEXTS.SOCIAL.username }),
    ).toBeVisible();

    await assertUiHasNoForbiddenText(page, [
      E2E_USER.email,
      E2E_USER.legalFirstName,
      E2E_USER.legalLastName,
      E2E_CONTEXTS.LEGAL.documentId,
      E2E_CONTEXTS.PROFESSIONAL.jobTitle,
      E2E_CONTEXTS.PROFESSIONAL.company,
    ]);

    const profileRes = await fetchPrymeCabProfile(page.request);
    expect(profileRes.ok()).toBeTruthy();
    const profile = (await profileRes.json()) as {
      status: string;
      context: string;
      data: Record<string, string | null>;
    };
    assertProfileObject(profile, {
      context: "SOCIAL",
      allowed: {
        display_name: E2E_CONTEXTS.SOCIAL.displayName,
        username: E2E_CONTEXTS.SOCIAL.username,
        pronouns: E2E_CONTEXTS.SOCIAL.pronouns,
      },
      forbidden: SOCIAL_FORBIDDEN,
      rootEmail: E2E_USER.email,
    });

    await openActivity(page);
    await expect(page.getByText("Profile read").first()).toBeVisible();
    await expect(page.getByText("PrymeCab").first()).toBeVisible();
    await expect(page.getByText(/E2E Social/i).first()).toBeVisible();
  });
});
