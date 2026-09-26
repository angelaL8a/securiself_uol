import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";
import { E2E_CLIENT, E2E_ORIGINS } from "../fixtures/test-data";
import { clearBrowserAuthState, signInAsE2EOwner } from "../helpers/oauth-flow";

/**
 * Technical checks for the Cohort B post-evaluation Developer Docs
 * refinements (B1, B2). See
 * docs/external-evaluation/B/cohort-b-refinement-validation.md.
 *
 * The component suite checks link targets; this spec follows the links in a
 * real browser, so it also proves the routes resolve and that the
 * `#recovery` anchor lands below the sticky Console and docs bars.
 */

const DOCS = `${E2E_ORIGINS.platform}/console/docs`;
const IMAGES_DIR = path.resolve(
  __dirname,
  "../../../docs/external-evaluation/B/images",
);

function main(page: Page) {
  return page.locator("main");
}

async function openDocs(page: Page, slug: string) {
  await clearBrowserAuthState(page);
  await page.goto(`${DOCS}/${slug}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/sign-in\?returnTo=/, { timeout: 30_000 });
  await signInAsE2EOwner(page, new RegExp(`/console/docs/${slug}`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Developer Docs" }),
  ).toBeVisible({ timeout: 30_000 });
}

/** Clicks a link inside one docs section (the area tabs repeat some names). */
async function follow(
  page: Page,
  section: string,
  name: string,
  pathname: string,
) {
  await page
    .locator(`#${section}`)
    .getByRole("link", { name, exact: true })
    .click();
  await page.waitForURL((url) => url.pathname === pathname, {
    timeout: 30_000,
  });
}

/** The target heading is on screen and not hidden under the sticky area bar. */
async function expectAnchorLanded(page: Page, heading: string) {
  expect(new URL(page.url()).hash).toBe("#recovery");
  const target = page.getByRole("heading", { level: 3, name: heading });
  await expect(target).toBeInViewport();
  const headingBox = await target.boundingBox();
  const barBox = await page
    .getByRole("navigation", { name: "Documentation areas" })
    .boundingBox();
  expect(headingBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height);
}

async function capture(page: Page, selector: string, filename: string) {
  mkdirSync(IMAGES_DIR, { recursive: true });
  // Unpin the sticky bars so they cannot overlay the top of the capture.
  await page.addStyleTag({
    content:
      "header, nav[aria-label='Documentation areas'] { position: static !important; }",
  });
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: path.join(IMAGES_DIR, filename),
    animations: "disabled",
  });
}

test.describe("cohort B developer docs refinements", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("B1: the callback leads to a server-side exchange, then to the Profile API", async ({
    page,
  }) => {
    await openDocs(page, "authorization");

    const callback = page.locator("#callback");
    await expect(callback).toContainText(
      "The authorization code is not a Profile API credential.",
    );
    await callback
      .getByRole("link", { name: "Token Exchange", exact: true })
      .click();
    await page.waitForURL(
      (url) => url.pathname === "/console/docs/token-exchange",
      { timeout: 30_000 },
    );

    const transition = page.locator("#code-to-token");
    await expect(transition).toContainText("You are here");
    await expect(transition).toContainText(
      "Exchange it server-side for an access token before calling the Profile API.",
    );
    const steps = transition.locator("ol > li");
    await expect(steps).toHaveCount(6);
    await expect(steps.nth(0)).toContainText("Browser · front channel");
    await expect(steps.nth(1)).toContainText("?code=");
    await expect(steps.nth(2)).toContainText("Your server · server-side");
    await expect(steps.nth(3)).toContainText(
      "POST /oauth/token with the client_secret",
    );
    await expect(steps.nth(4)).toContainText("Access token returned");
    await expect(steps.nth(5)).toContainText(
      "Your server · protected API request",
    );
    await expect(steps.nth(5)).toContainText(
      "Authorization: Bearer <ACCESS_TOKEN>",
    );
    // The client secret appears only in the server-side steps.
    for (const index of [0, 1]) {
      await expect(steps.nth(index)).not.toContainText("client_secret");
    }
    expect(await main(page).innerText()).not.toContain(E2E_CLIENT.clientSecret);

    await capture(page, "#code-to-token", "b1-code-to-token-transition.png");

    await follow(
      page,
      "code-to-token",
      "Profile API",
      "/console/docs/profile-api",
    );
    await expect(main(page)).toContainText(
      "not the authorization code from the callback",
    );
  });

  test("B2: a rejected profile read leads to the recovery path and back to authorization", async ({
    page,
  }) => {
    await openDocs(page, "profile-api");

    // Where the evaluation recorded the first search: the failed request.
    await follow(
      page,
      "profile",
      "recovering from revoked or expired access",
      "/console/docs/errors",
    );
    await expectAnchorLanded(page, "Recovering from revoked or expired access");
    const recovery = page.locator("#recovery ol");
    await expect(page.locator("#recovery ol > li")).toHaveCount(7);
    await expect(recovery).toContainText("401 Access token has been revoked");
    await expect(recovery).toContainText(
      "The identity owner authorizes your application again",
    );

    // Errors → the lifecycle cause.
    await follow(page, "errors", "Grants & Revocation", "/console/docs/grants");
    await expect(main(page)).toContainText(
      "Re-authorization is required; nothing else restores access.",
    );

    // Grants & Revocation → the step-by-step recovery.
    await follow(
      page,
      "grants",
      "recovery sequence in the Error reference",
      "/console/docs/errors",
    );
    await expectAnchorLanded(page, "Recovering from revoked or expired access");

    await capture(page, "#recovery", "b2-revocation-recovery.png");

    // Errors → the beginning of the new authorization.
    await follow(
      page,
      "errors",
      "authorization request",
      "/console/docs/authorization",
    );
    await expect(page.locator("#authorize")).toContainText("/oauth/authorize");
  });
});
