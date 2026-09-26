import { expect, type Page } from "@playwright/test";
import {
  E2E_ORIGINS,
  E2E_REDIRECT_URI,
  E2E_USER,
} from "../fixtures/test-data";

export async function openPrymeCabLanding(page: Page): Promise<void> {
  await page.goto(E2E_ORIGINS.prymecab, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Prymecab/i })).toBeVisible();
}

export async function startLoginWithSecuriSelf(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Login with SecuriSelf/i }).click();
  await page.waitForURL(/localhost:3000/);
  expect(page.url()).toContain("localhost:3000");
  expect(page.url()).not.toContain(":8080");
}

/**
 * Signs in with the seeded owner credentials from the Platform sign-in page.
 * `waitForUrl` lets a caller that arrived from a protected Console route wait
 * for its own returnTo destination instead of the consent screen.
 */
export async function signInAsE2EOwner(
  page: Page,
  waitForUrl: RegExp = /\/oauth\/authorize/,
): Promise<void> {
  await expect(page.getByText("Access your SecuriSelf console.")).toBeVisible({
    timeout: 30_000,
  });
  expect(page.url()).toContain("returnTo=");

  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password");

  // Remounts during auth hydration can clear early fills; retry until stable.
  await expect(async () => {
    await email.fill(E2E_USER.email);
    await password.fill(E2E_USER.password);
    await expect(email).toHaveValue(E2E_USER.email);
    await expect(password).toHaveValue(E2E_USER.password);
  }).toPass({ timeout: 15_000 });

  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(waitForUrl, { timeout: 30_000 });
}

/** Clears Platform localStorage session (origin-scoped) and browser cookies. */
export async function clearBrowserAuthState(page: Page): Promise<void> {
  await page.goto(E2E_ORIGINS.platform);
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, "securiself.auth");
  await page.context().clearCookies();
}

export async function reachConsentScreen(page: Page): Promise<void> {
  await openPrymeCabLanding(page);
  await startLoginWithSecuriSelf(page);

  const signInMarker = page.getByText("Access your SecuriSelf console.");
  const consentMarker = page.getByText(
    /PrymeCab wants to access an identity context/i,
  );

  // Production hydration can briefly hit /oauth/authorize before bouncing to
  // /sign-in; wait for a stable marker instead of racing the URL.
  await expect(signInMarker.or(consentMarker)).toBeVisible({ timeout: 30_000 });
  if (await signInMarker.isVisible()) {
    await signInAsE2EOwner(page);
  }

  await expect(consentMarker).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(E2E_REDIRECT_URI)).toBeVisible();
  await expect(page.getByText(/Only the selected context is shared/i)).toBeVisible();
}

export async function selectContextByInternalName(
  page: Page,
  internalName: string,
): Promise<void> {
  const option = page.getByRole("radio", { name: new RegExp(internalName, "i") });
  await option.click();
  await expect(option).toHaveAttribute("aria-checked", "true");
}

export async function approveConsent(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Approve & continue/i }).click();
  await page.waitForURL(/localhost:3001/);
}

export async function denyConsent(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Deny$/i }).click();
  await expect(page.getByText("Access denied")).toBeVisible();
  await expect(page.getByText(/No data was shared/i)).toBeVisible();
}

export async function expectPrymeCabProfileContext(
  page: Page,
  context: string,
): Promise<void> {
  await expect(page.getByText(context, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Login with SecuriSelf/i }),
  ).toHaveCount(0);
}

export async function openActivity(page: Page): Promise<void> {
  await page.goto(`${E2E_ORIGINS.platform}/console/activity`);
  await expect(page.getByRole("heading", { name: /Activity/i })).toBeVisible({
    timeout: 15000,
  });
}

export async function openGrants(page: Page): Promise<void> {
  await page.goto(`${E2E_ORIGINS.platform}/console/grants`);
  await expect(page.getByRole("heading", { name: /^Grants$/i })).toBeVisible({
    timeout: 15_000,
  });
}
