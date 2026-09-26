import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";
import {
  fetchAuditLogs,
  fetchPrymeCabProfile,
  getPlatformSessionToken,
  listGrants,
} from "../helpers/api";
import {
  approveConsent,
  expectPrymeCabProfileContext,
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

const SOCIAL = E2E_CONTEXTS.SOCIAL;
const PRO = E2E_CONTEXTS.PROFESSIONAL;
const REVOKE_NAME = new RegExp(
  `Revoke ${E2E_CLIENT.name} access to ${SOCIAL.displayName}`,
  "i",
);

async function authorizeSocial(page: Page): Promise<void> {
  await reachConsentScreen(page);
  await selectContextByInternalName(page, SOCIAL.internalName);
  await approveConsent(page);
  await expectPrymeCabProfileContext(page, "SOCIAL");
}

async function signInToConsole(page: Page): Promise<void> {
  await page.goto(`${E2E_ORIGINS.platform}/sign-in`);
  await page.getByLabel("Email").fill(E2E_USER.email);
  await page.getByLabel("Password").fill(E2E_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console/);
}

async function listContexts(page: Page, token: string) {
  const res = await page.request.get(`${E2E_ORIGINS.api}/api/v1/contexts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  return (
    (await res.json()) as {
      data: Array<{
        id: string;
        internalName: string;
        jobTitleI18n: Record<string, string> | null;
      }>;
    }
  ).data;
}

const isFocused = (page: Page, name: RegExp) =>
  page
    .getByRole("button", { name })
    .evaluate((el) => el === document.activeElement);

test.describe("console and consent usability", () => {
  test("a keyboard user skips navigation, reaches Revoke and confirms", async ({
    page,
  }) => {
    await authorizeSocial(page);
    await openGrants(page);
    await expect(page.getByText("Active").first()).toBeVisible();

    // Tab presses from the top of the page to Revoke without the skip link
    // (the skip link itself is the first stop).
    let withoutSkip = 0;
    while (!(await isFocused(page, REVOKE_NAME)) && withoutSkip < 30) {
      await page.keyboard.press("Tab");
      withoutSkip += 1;
    }
    await openGrants(page);

    // The first Tab stop is a visible skip link that moves focus to <main>.
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();

    const revoke = page.getByRole("button", { name: REVOKE_NAME });
    const row = revoke.locator("xpath=ancestor::tr");
    const rowBackground = () =>
      row.evaluate((el) => getComputedStyle(el).backgroundColor);
    const idleBackground = await rowBackground();

    // From <main>: "View Activity", then the Grant's Revoke control.
    let presses = 0;
    while (!(await isFocused(page, REVOKE_NAME)) && presses < 10) {
      await page.keyboard.press("Tab");
      presses += 1;
    }
    expect(presses).toBe(2);
    expect(2 + presses).toBeLessThan(withoutSkip);
    await expect(revoke).toHaveText("Revoke");
    // The focused permission's row is visually highlighted.
    await expect.poll(rowBackground).not.toBe(idleBackground);

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/invalidate active access/i)).toBeVisible();
    const confirm = dialog.getByRole("button", { name: REVOKE_NAME });
    for (let i = 0; i < 5; i += 1) {
      if (await confirm.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("revoke-continuation")).toBeVisible();
    await expect(page.getByRole("button", { name: REVOKE_NAME })).toHaveCount(0);
    await expect(
      page.getByRole("row", { name: new RegExp(SOCIAL.displayName) }),
    ).toContainText("Revoked");

    const token = await getPlatformSessionToken(page);
    const grants = await listGrants(page.request, token);
    expect(grants).toHaveLength(1);
    expect(grants[0]!.revokedAt).not.toBeNull();

    // Revocation semantics unchanged: PrymeCab loses access.
    const after = await fetchPrymeCabProfile(page.request);
    expect(after.status()).toBe(401);
  });

  test("Grants and Activity separate current access from history and link to each other", async ({
    page,
  }) => {
    await authorizeSocial(page);
    await openGrants(page);
    const token = await getPlatformSessionToken(page);
    const grantsBefore = await listGrants(page.request, token);
    const auditBefore = (await fetchAuditLogs(page.request, token)).data;

    await expect(page.getByText(/^Current permissions:/)).toBeVisible();
    const toActivity = page.getByRole("link", { name: "View Activity" });
    await expect(toActivity).toHaveAttribute("href", "/console/activity");
    await toActivity.click();
    await expect(page).toHaveURL(/\/console\/activity$/);
    await expect(page.getByText(/^A record of what has happened:/)).toBeVisible();
    await expect(page.getByText("Access granted").first()).toBeVisible();

    const toGrants = page.getByRole("link", { name: "Manage current Grants" });
    await expect(toGrants).toHaveAttribute("href", "/console/grants");
    await toGrants.click();
    await expect(page).toHaveURL(/\/console\/grants$/);
    await expect(page.getByRole("button", { name: REVOKE_NAME })).toBeVisible();

    // Navigation neither changes permissions nor writes audit events.
    expect(await listGrants(page.request, token)).toEqual(grantsBefore);
    expect((await fetchAuditLogs(page.request, token)).data).toEqual(
      auditBefore,
    );
  });

  test("EN/ES values are edited and saved as variants of one Context", async ({
    page,
  }) => {
    await signInToConsole(page);
    const token = await getPlatformSessionToken(page);
    const before = await listContexts(page, token);
    const pro = before.find((c) => c.internalName === PRO.internalName)!;

    await page.goto(`${E2E_ORIGINS.platform}/console/contexts/${pro.id}`);
    const variants = page.getByRole("region", { name: "Language variants" });
    await expect(variants).toBeVisible();
    await expect(variants).toContainText(
      "English and Spanish are language variants of this same Context. Adding another language does not create a separate Context or permission.",
    );

    await expect(page.locator("#jobTitle-en")).toHaveValue(PRO.jobTitle);
    await variants.getByRole("tab", { name: "Español" }).click();
    await page.locator("#jobTitle-es").fill("Ingeniera principal");
    await variants.getByRole("tab", { name: "English" }).click();
    await expect(page.locator("#jobTitle-en")).toHaveValue(PRO.jobTitle);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Context updated")).toBeVisible();

    const after = await listContexts(page, token);
    expect(after.map((c) => c.id).sort()).toEqual(before.map((c) => c.id).sort());
    const saved = after.find((c) => c.id === pro.id)!;
    expect(saved.jobTitleI18n).toMatchObject({
      en: PRO.jobTitle,
      es: "Ingeniera principal",
    });
  });

  test("consent lists what is not shared, by label only, for the selected Context", async ({
    page,
  }) => {
    await reachConsentScreen(page);
    const notShared = page.getByRole("region", {
      name: `Not shared with ${E2E_CLIENT.name}`,
    });
    const items = () => notShared.getByRole("listitem").allTextContents();
    const hiddenValues = [
      E2E_USER.email,
      E2E_USER.legalFirstName,
      E2E_USER.legalLastName,
      E2E_CONTEXTS.LEGAL.documentId,
    ];

    await expect(notShared).toHaveCount(0);
    await expect(
      page.getByText(/Vault data not included in that payload, remain private/),
    ).toBeVisible();

    await selectContextByInternalName(page, SOCIAL.internalName);
    expect(await items()).toEqual([
      "Legal name",
      "Document ID",
      "Account email",
      "Gender",
      "Your other Contexts",
    ]);
    const socialPage = await page.locator("body").innerText();
    for (const value of hiddenValues) expect(socialPage).not.toContain(value);

    await selectContextByInternalName(page, E2E_CONTEXTS.LEGAL.internalName);
    expect(await items()).toEqual([
      "Account email",
      "Gender",
      "Your other Contexts",
    ]);
    const legalRegion = await notShared.innerText();
    for (const value of hiddenValues) expect(legalRegion).not.toContain(value);
    expect(await page.locator("body").innerText()).not.toContain(E2E_USER.email);

    await selectContextByInternalName(page, PRO.internalName);
    expect(await items()).toEqual([
      "Document ID",
      "Account email",
      "Gender",
      "Legal name",
      "Your other Contexts",
    ]);
    // Disclosure preview is still the source of truth for shared fields.
    await expect(page.getByText(`What ${E2E_CLIENT.name} will receive`)).toBeVisible();
    await expect(page.locator("code", { hasText: '"job_title"' })).toBeVisible();

    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "PROFESSIONAL");

    await openGrants(page);
    const token = await getPlatformSessionToken(page);
    const grants = await listGrants(page.request, token);
    expect(grants).toHaveLength(1);
    expect(grants[0]!.context.internalName).toBe(PRO.internalName);
    expect(grants[0]!.revokedAt).toBeNull();
  });
});
