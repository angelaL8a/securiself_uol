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
  LEGAL_FORBIDDEN,
} from "../helpers/privacy-assertions";
import { E2E_CONTEXTS, E2E_USER } from "../fixtures/test-data";

test.describe("LEGAL disclosure happy path", () => {
  test("authorizes LEGAL context and keeps root email private", async ({
    page,
  }) => {
    await reachConsentScreen(page);
    await selectContextByInternalName(page, E2E_CONTEXTS.LEGAL.internalName);
    await expect(page.getByText(E2E_USER.legalFirstName)).toBeVisible();
    await expect(page.getByText(E2E_USER.legalLastName)).toBeVisible();
    await expect(page.getByText(E2E_CONTEXTS.LEGAL.documentId)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(E2E_USER.email);

    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "LEGAL");
    await expect(
      page.getByText(E2E_USER.legalFirstName, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(E2E_USER.legalLastName, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(E2E_CONTEXTS.LEGAL.documentId)).toBeVisible();

    await assertUiHasNoForbiddenText(page, [
      E2E_USER.email,
      E2E_CONTEXTS.SOCIAL.username,
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
      context: "LEGAL",
      allowed: {
        legal_first_name: E2E_USER.legalFirstName,
        legal_last_name: E2E_USER.legalLastName,
        document_id: E2E_CONTEXTS.LEGAL.documentId,
      },
      forbidden: LEGAL_FORBIDDEN,
      rootEmail: E2E_USER.email,
    });

    await openActivity(page);
    await expect(page.getByText("Profile read").first()).toBeVisible();
    await expect(page.getByText("PrymeCab").first()).toBeVisible();
  });
});
