import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";
import { E2E_CLIENT, E2E_ORIGINS, E2E_USER } from "../fixtures/test-data";
import {
  clearBrowserAuthState,
  signInAsE2EOwner,
} from "../helpers/oauth-flow";

/**
 * Browser evidence for the Developer Docs surface.
 *
 * The first test is the Sprint 5 protected-route boundary: an unauthenticated
 * request to `/console/docs` is bounced to sign-in and only a real session
 * reaches the documentation inside the Console shell.
 *
 * The second test is the post-evaluation validation added after
 * `docs/sprint5/sprint5-post-evaluation-refinement.md`: the single continuous
 * page became nine route-backed areas with two levels of sticky navigation, and
 * neither the routing nor the sticky behaviour can be observed by the component
 * suite. It also re-checks that the restructure did not drop the reference
 * material the external evaluation rated highest.
 *
 * Backend contract behaviour (token exchange, privacy filtering, localization,
 * revocation) is proven by the backend and E2E suites and is not re-tested here.
 *
 * Permanent post-refinement screenshots are written to `docs/sprint5/images/`
 * with a `post-` prefix, so the evidence pack can only be produced by an
 * execution that also passes the assertions above it.
 */

const DOCS_PATH = "/console/docs";
const DOCS_URL = `${E2E_ORIGINS.platform}${DOCS_PATH}`;

/** Wider than the shared 1280x720 evidence viewport: the docs tables need it. */
const DOCS_VIEWPORT = { width: 1440, height: 900 } as const;

const IMAGES_DIR = path.resolve(__dirname, "../../../docs/sprint5/images");

/**
 * The nine focused areas the refinement introduced, restated independently of
 * `DOCS_AREAS` so that dropping an area or a section from the implementation
 * fails this test instead of silently shrinking the expectation.
 */
const AREAS = [
  {
    tab: "Overview",
    path: "/console/docs",
    sections: [
      { id: "overview", title: "Overview" },
      { id: "flow", title: "End-to-end authorization sequence" },
      { id: "artifacts", title: "Credentials and authorization artifacts" },
    ],
  },
  {
    tab: "Application Setup",
    path: "/console/docs/setup",
    sections: [
      { id: "register", title: "Register an application" },
      { id: "credentials", title: "Credentials and the security boundary" },
    ],
  },
  {
    tab: "Authorization",
    path: "/console/docs/authorization",
    sections: [
      { id: "authorize", title: "Authorization request" },
      { id: "callback", title: "Authorization code callback" },
    ],
  },
  {
    tab: "Token Exchange",
    path: "/console/docs/token-exchange",
    sections: [
      { id: "code-to-token", title: "From authorization code to access token" },
      { id: "token", title: "Server-side token exchange" },
    ],
  },
  {
    tab: "Profile API",
    path: "/console/docs/profile-api",
    sections: [{ id: "profile", title: "Retrieve the context-bound profile" }],
  },
  {
    tab: "Contexts & Localization",
    path: "/console/docs/contexts",
    sections: [
      { id: "payloads", title: "Context payload reference" },
      { id: "localization", title: "Localization and Accept-Language" },
    ],
  },
  {
    tab: "Grants & Revocation",
    path: "/console/docs/grants",
    sections: [{ id: "grants", title: "Grants and revocation" }],
  },
  {
    tab: "Errors",
    path: "/console/docs/errors",
    sections: [{ id: "errors", title: "Error reference" }],
  },
  {
    tab: "Reference Integration",
    path: "/console/docs/reference-integration",
    sections: [
      { id: "reference-integration", title: "PrymeCab reference integration" },
    ],
  },
] as const;

function areaNav(page: Page) {
  return page.getByRole("navigation", { name: "Documentation areas" });
}

function sectionNav(page: Page) {
  return page.getByRole("navigation", {
    name: "Documentation sections",
    exact: true,
  });
}

function captureDir() {
  mkdirSync(IMAGES_DIR, { recursive: true });
  return IMAGES_DIR;
}

async function captureViewport(page: Page, filename: string) {
  // Park the cursor: a tab left under the pointer keeps its hover background
  // and would read as a second active area in the captured frame.
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: path.join(captureDir(), filename),
    animations: "disabled",
  });
}

async function captureSection(locator: Locator, filename: string) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: path.join(captureDir(), filename),
    animations: "disabled",
  });
}

/** Asserts the area is the one on screen: its sections, and nobody else's. */
async function expectAreaRendered(page: Page, area: (typeof AREAS)[number]) {
  expect(new URL(page.url()).pathname).toBe(area.path);

  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  expect(headings).toEqual(area.sections.map((section) => section.title));

  for (const section of area.sections) {
    await expect(page.locator(`#${section.id}`)).toHaveCount(1);
  }

  await expect(
    areaNav(page).getByRole("link", { name: area.tab, exact: true }),
  ).toHaveAttribute("aria-current", "page");

  // No area may render a live credential: this is what makes the screenshots
  // below safe to keep in the repository.
  const text = await page.locator("main").innerText();
  expect(text).not.toContain(E2E_CLIENT.clientSecret);
  expect(text).not.toContain(E2E_USER.password);
}

test.describe("developer docs @sprint5", () => {
  test.use({ viewport: DOCS_VIEWPORT });

  test("an authenticated owner reaches Developer Docs through the Console auth boundary", async ({
    page,
  }) => {
    // --- Protected-route boundary -------------------------------------------
    await clearBrowserAuthState(page);
    await page.goto(DOCS_URL, { waitUntil: "domcontentloaded" });

    await page.waitForURL(/\/sign-in\?returnTo=/, { timeout: 30_000 });
    expect(page.url()).toContain(`returnTo=${encodeURIComponent(DOCS_PATH)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Developer Docs" }),
    ).toHaveCount(0);

    // --- Sign in with the established email/password fixture -----------------
    await signInAsE2EOwner(page, /\/console\/docs/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Developer Docs" }),
    ).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe(DOCS_PATH);

    // --- Console shell integration -------------------------------------------
    const consoleNav = page.getByRole("navigation", { name: "Console" });
    const docsNavLink = consoleNav.getByRole("link", { name: "Developer Docs" });
    await expect(docsNavLink).toBeVisible();
    await expect(docsNavLink).toHaveAttribute("aria-current", "page");

    // --- The documentation renders placeholders, not live credentials --------
    // (The Console topbar legitimately shows the signed-in test account; the
    // assertion is scoped to the documentation content itself.)
    const docsText = await page.locator("main").innerText();
    expect(docsText).not.toContain(E2E_CLIENT.clientSecret);
    expect(docsText).not.toContain(E2E_USER.password);
  });

  test("the console sidebar navigates from the Overview page to Developer Docs", async ({
    page,
  }) => {
    await clearBrowserAuthState(page);
    await page.goto(`${E2E_ORIGINS.platform}/console`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL(/\/sign-in\?returnTo=/, { timeout: 30_000 });
    await signInAsE2EOwner(page, /\/console$/);

    await page
      .getByRole("navigation", { name: "Console" })
      .getByRole("link", { name: "Developer Docs" })
      .click();

    await page.waitForURL(/\/console\/docs$/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { level: 1, name: "Developer Docs" }),
    ).toBeVisible();
  });

  /**
   * Post-evaluation refinement validation. Everything below observes behaviour
   * the component suite cannot: real route resolution for the nine areas, and
   * whether the two sticky navigation levels survive an actual browser scroll.
   */
  test("the refined Developer Docs expose nine focused areas behind sticky navigation @post-refinement", async ({
    page,
  }) => {
    await clearBrowserAuthState(page);
    await page.goto(DOCS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/sign-in\?returnTo=/, { timeout: 30_000 });
    await signInAsE2EOwner(page, /\/console\/docs/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Developer Docs" }),
    ).toBeVisible({ timeout: 30_000 });

    // --- Change 1: the Overview area is what `/console/docs` opens on --------
    await expectAreaRendered(page, AREAS[0]);
    await expect(areaNav(page).getByRole("link")).toHaveCount(AREAS.length);
    for (const area of AREAS) {
      await expect(
        areaNav(page).getByRole("link", { name: area.tab, exact: true }),
      ).toHaveAttribute("href", area.path);
    }

    // The Overview carries the two blocks the refinement added.
    await expect(
      page.getByRole("table", {
        name: /credential and authorization artifact/i,
      }),
    ).toBeVisible();
    await expect(page.locator("#flow ol > li")).toHaveCount(9);

    // POST-VIS-01 — the refined surface inside the protected Console.
    await captureViewport(page, "post-01-docs-overview.png");

    // --- Change 1: every area switches, and shows only its own sections ------
    for (const area of AREAS.slice(1)) {
      await areaNav(page)
        .getByRole("link", { name: area.tab, exact: true })
        .click();
      await page.waitForURL(
        (url) => url.pathname === area.path,
        { timeout: 30_000 },
      );
      await expectAreaRendered(page, area);
    }

    // --- The area routes are real, prerendered URLs, not client-side state ---
    await page.goto(`${E2E_ORIGINS.platform}/console/docs/token-exchange`, {
      waitUntil: "domcontentloaded",
    });
    await expectAreaRendered(page, AREAS[3]);

    // An unknown slug hits `notFound()`: the not-found page, not an empty
    // documentation shell. (The response carries HTTP 200 rather than 404 —
    // the Console layout's Suspense boundary streams the shell before the page
    // resolves. Recorded in the post-validation document; the rendered result
    // is still the not-found page.)
    await page.goto(`${E2E_ORIGINS.platform}/console/docs/not-an-area`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(/could not be found/i)).toBeVisible();
    await expect(areaNav(page)).toHaveCount(0);
    await expect(page.locator("#token")).toHaveCount(0);

    await page.goto(`${E2E_ORIGINS.platform}/console/docs/token-exchange`, {
      waitUntil: "domcontentloaded",
    });
    await expectAreaRendered(page, AREAS[3]);
    // The placeholder credentials the docs render, in the areas that carry
    // them: nothing in this evidence pack shows a live secret.
    const tokenAreaText = await page.locator("main").innerText();
    expect(tokenAreaText).toContain("<SECURISELF_CLIENT_SECRET>");
    expect(tokenAreaText).toContain("scs_client_example");

    // --- Change 2: the two navigation levels are distinct from the Console ---
    const consoleBox = await page
      .getByRole("navigation", { name: "Console" })
      .boundingBox();
    const areaBoxTop = await areaNav(page).boundingBox();
    const sectionBox = await sectionNav(page).boundingBox();
    expect(consoleBox).not.toBeNull();
    expect(areaBoxTop).not.toBeNull();
    expect(sectionBox).not.toBeNull();
    // The Console sidebar occupies its own column, left of both docs navs.
    expect(consoleBox!.x + consoleBox!.width).toBeLessThanOrEqual(areaBoxTop!.x);
    expect(consoleBox!.x + consoleBox!.width).toBeLessThanOrEqual(sectionBox!.x);
    // The area bar sits above the section list.
    expect(areaBoxTop!.y + areaBoxTop!.height).toBeLessThanOrEqual(sectionBox!.y);

    // --- Change 2: both stay on screen through a real scroll -----------------
    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThan(800);

    await expect(areaNav(page)).toBeInViewport();
    await expect(sectionNav(page)).toBeInViewport();
    const areaBoxScrolled = await areaNav(page).boundingBox();
    // Pinned just below the h-16 (64px) sticky Console topbar, not scrolled away.
    expect(areaBoxScrolled!.y).toBeGreaterThanOrEqual(56);
    expect(areaBoxScrolled!.y).toBeLessThanOrEqual(80);

    // POST-VIS-02 — sticky area bar + sticky section list, deep in an area.
    await captureViewport(page, "post-02-focused-navigation.png");

    // --- Change 2: the sticky section list jumps without obscuring content ---
    await sectionNav(page)
      .getByRole("link", { name: /Server-side token exchange/i })
      .click();
    await expect(page).toHaveURL(/#token$/);
    const tokenHeading = page.getByRole("heading", {
      level: 2,
      name: "Server-side token exchange",
    });
    await expect(tokenHeading).toBeInViewport();
    const headingBox = await tokenHeading.boundingBox();
    const navBox = await areaNav(page).boundingBox();
    // `scroll-mt-32` must clear the topbar and the sticky area bar.
    expect(headingBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);

    // --- Change 2: the sticky area bar is keyboard operable ------------------
    const overviewTab = areaNav(page).getByRole("link", {
      name: "Overview",
      exact: true,
    });
    await overviewTab.focus();
    await expect(overviewTab).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      areaNav(page).getByRole("link", { name: "Application Setup", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForURL(
      (url) => url.pathname === "/console/docs/setup",
      { timeout: 30_000 },
    );
    await expectAreaRendered(page, AREAS[1]);

    // --- Changes 3 and 4: the new explanatory blocks, on the Overview --------
    await areaNav(page).getByRole("link", { name: "Overview", exact: true }).click();
    await page.waitForURL((url) => url.pathname === DOCS_PATH, {
      timeout: 30_000,
    });

    const lifecycle = page.getByRole("table", {
      name: /credential and authorization artifact/i,
    });
    await expect(lifecycle).toBeVisible();
    const lifecycleText = await lifecycle.innerText();
    for (const value of [
      "SecuriSelf session credential",
      "client_id",
      "client_secret",
      "Authorization code",
      "access_token",
    ]) {
      expect(lifecycleText).toContain(value);
    }
    // Server-only values say "Never" in words, not only through an icon.
    expect(lifecycleText).toContain("Never. Not in bundles");
    expect(lifecycleText).toContain("Never. Treat it as a bearer credential");
    expect(lifecycleText).toContain("Your server");
    expect(lifecycleText).toContain("Browser");

    const flowText = await page.locator("#flow ol").innerText();
    const order = [
      "selects one Context and approves",
      "single-use authorization code",
      "returns to your registered callback",
      "receives the code",
      "client_secret",
      "validates the exchange",
      "Context-bound access token is returned",
      "GET /api/v1/profiles/me",
      "Context-filtered profile is returned",
    ].map((marker) => flowText.indexOf(marker));
    expect(order).not.toContain(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    await expect(
      page.getByText(/Sending the code to the profile endpoint returns/i),
    ).toBeVisible();

    // Element captures: unpin the sticky bars so they cannot overlay the top of
    // a section shot. The real sticky behaviour is recorded in POST-VIS-02.
    await page.addStyleTag({
      content:
        "header { position: static !important; } nav[aria-label='Documentation areas'] { position: static !important; }",
    });

    // POST-VIS-04 — the authorization sequence.
    await captureSection(page.locator("#flow"), "post-04-authorization-flow.png");
    // POST-VIS-03 — the credential lifecycle reference.
    await captureSection(
      page.locator("#artifacts"),
      "post-03-credential-lifecycle.png",
    );

    // --- Preservation: the request examples the evaluation rated 4.6/5 -------
    await page.goto(`${E2E_ORIGINS.platform}/console/docs/profile-api`, {
      waitUntil: "domcontentloaded",
    });
    await expectAreaRendered(page, AREAS[4]);
    const profileText = await page.locator("main").innerText();
    expect(profileText).toContain("/api/v1/profiles/me");
    expect(profileText).toContain("Authorization: Bearer <ACCESS_TOKEN>");
    expect(profileText).toContain("Accept-Language");
    await expect(
      page.getByRole("button", { name: /^Copy Profile request/ }).first(),
    ).toBeVisible();
    // POST-VIS-05 — the profile request/response reference under the tab bar.
    await captureViewport(page, "post-05-token-profile-reference.png");

    // --- Preservation: the Context payload reference rated 4.6/5 -------------
    await page.goto(`${E2E_ORIGINS.platform}/console/docs/contexts`, {
      waitUntil: "domcontentloaded",
    });
    await expectAreaRendered(page, AREAS[5]);
    for (const label of ["Professional", "Legal", "Social", "Private"]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
    const contextsText = await page.locator("main").innerText();
    expect(contextsText).toContain("Accept-Language");
    expect(contextsText).toContain("Supported locales are en and es");
    // POST-VIS-06 — Context payload reference + localization under the tab bar.
    await captureViewport(page, "post-06-context-revocation-reference.png");

    // --- Preservation: token exchange, revocation and error material ---------
    await page.goto(`${E2E_ORIGINS.platform}/console/docs/token-exchange`, {
      waitUntil: "domcontentloaded",
    });
    const tokenText = await page.locator("main").innerText();
    expect(tokenText).toContain("/oauth/token");
    expect(tokenText).toContain("grant_type");
    expect(tokenText).toContain("authorization_code");
    expect(tokenText).toContain("Authorization code has already been used");

    await page.goto(`${E2E_ORIGINS.platform}/console/docs/authorization`, {
      waitUntil: "domcontentloaded",
    });
    const authText = await page.locator("main").innerText();
    expect(authText).toContain("/oauth/authorize");
    expect(authText).toContain("response_type");
    expect(authText).toContain("identity_context");

    await page.goto(`${E2E_ORIGINS.platform}/console/docs/grants`, {
      waitUntil: "domcontentloaded",
    });
    expect(await page.locator("main").innerText()).toContain(
      "Access token has been revoked",
    );

    await page.goto(`${E2E_ORIGINS.platform}/console/docs/errors`, {
      waitUntil: "domcontentloaded",
    });
    expect(await page.locator("main").innerText()).toContain(
      "Invalid client credentials",
    );
  });
});
