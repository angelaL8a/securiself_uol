import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";
import { E2E_CLIENT, E2E_ORIGINS, E2E_USER } from "../fixtures/test-data";
import {
  clearBrowserAuthState,
  signInAsE2EOwner,
} from "../helpers/oauth-flow";

/**
 * Developer Docs in a real browser: the Console auth boundary in front of
 * `/console/docs`, and the nine route-backed areas behind a sticky vertical
 * sidebar, neither of which the component suite can observe.
 *
 * Backend contract behaviour (token exchange, privacy filtering, localization,
 * revocation) is covered by the backend and other E2E suites and is not
 * re-tested here.
 */

const DOCS_PATH = "/console/docs";
const DOCS_URL = `${E2E_ORIGINS.platform}${DOCS_PATH}`;

/** The docs tables need a wider viewport than the Playwright default. */
const DOCS_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * The nine documentation areas, restated independently of
 * `DOCS_AREAS` so that dropping an area or a section from the implementation
 * fails this test instead of silently shrinking the expectation.
 */
const AREAS = [
  {
    number: "01",
    tab: "Overview",
    path: "/console/docs",
    sections: [
      { id: "overview", title: "Overview" },
      { id: "flow", title: "End-to-end authorization sequence" },
      { id: "artifacts", title: "Credentials and authorization artifacts" },
    ],
  },
  {
    number: "02",
    tab: "Application Setup",
    path: "/console/docs/setup",
    sections: [
      { id: "register", title: "Register an application" },
      { id: "credentials", title: "Credentials and the security boundary" },
    ],
  },
  {
    number: "03",
    tab: "Authorization",
    path: "/console/docs/authorization",
    sections: [
      { id: "authorize", title: "Authorization request" },
      { id: "callback", title: "Authorization code callback" },
    ],
  },
  {
    number: "04",
    tab: "Token Exchange",
    path: "/console/docs/token-exchange",
    sections: [
      { id: "code-to-token", title: "From authorization code to access token" },
      { id: "token", title: "Server-side token exchange" },
    ],
  },
  {
    number: "05",
    tab: "Profile API",
    path: "/console/docs/profile-api",
    sections: [{ id: "profile", title: "Retrieve the context-bound profile" }],
  },
  {
    number: "06",
    tab: "Contexts & Localization",
    path: "/console/docs/contexts",
    sections: [
      { id: "payloads", title: "Context payload reference" },
      { id: "localization", title: "Localization and Accept-Language" },
    ],
  },
  {
    number: "07",
    tab: "Grants & Revocation",
    path: "/console/docs/grants",
    sections: [{ id: "grants", title: "Grants and revocation" }],
  },
  {
    number: "08",
    tab: "Errors",
    path: "/console/docs/errors",
    sections: [{ id: "errors", title: "Error reference" }],
  },
  {
    number: "09",
    tab: "Reference Integration",
    path: "/console/docs/reference-integration",
    sections: [
      { id: "reference-integration", title: "PrymeCab reference integration" },
    ],
  },
] as const;

function areaNav(page: Page) {
  return page.getByRole("navigation", {
    name: "Documentation areas",
    exact: true,
  });
}

/** The numbered sidebar entry for an area, e.g. "04 Token Exchange". */
function areaLink(page: Page, area: (typeof AREAS)[number]) {
  return areaNav(page).getByRole("link", {
    name: `${area.number} ${area.tab}`,
    exact: true,
  });
}

/** The active area's section links, nested under its sidebar entry. */
function sectionList(page: Page, area: (typeof AREAS)[number]) {
  return areaNav(page).getByRole("list", {
    name: `Sections in ${area.tab}`,
    exact: true,
  });
}

/** Bottom edge of the sticky Console topbar, the only sticky bar left. */
async function topbarBottom(page: Page) {
  const box = await page.getByRole("banner").boundingBox();
  expect(box).not.toBeNull();
  return box!.y + box!.height;
}

/** Asserts the area is the one on screen: its sections, and nobody else's. */
async function expectAreaRendered(page: Page, area: (typeof AREAS)[number]) {
  expect(new URL(page.url()).pathname).toBe(area.path);

  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  expect(headings).toEqual(area.sections.map((section) => section.title));

  for (const section of area.sections) {
    await expect(page.locator(`#${section.id}`)).toHaveCount(1);
  }

  await expect(areaLink(page, area)).toHaveAttribute("aria-current", "page");

  // Only the active area expands, into its own sections, unnumbered.
  await expect(
    areaNav(page).getByRole("list", { name: /^Sections in / }),
  ).toHaveCount(1);
  const sections = sectionList(page, area).getByRole("link");
  await expect(sections).toHaveText(area.sections.map((section) => section.title));
  for (const [index, section] of area.sections.entries()) {
    await expect(sections.nth(index)).toHaveAttribute("href", `#${section.id}`);
  }

  // No area may render a live credential.
  const text = await page.locator("main").innerText();
  expect(text).not.toContain(E2E_CLIENT.clientSecret);
  expect(text).not.toContain(E2E_USER.password);
}

test.describe("developer docs", () => {
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
   * Observes what the component suite cannot: real route resolution for the
   * nine areas, the sidebar's position beside the content, and whether it
   * stays pinned through an actual browser scroll.
   */
  test("Developer Docs expose nine focused areas behind a sticky vertical sidebar", async ({
    page,
  }) => {
    await clearBrowserAuthState(page);
    await page.goto(DOCS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/sign-in\?returnTo=/, { timeout: 30_000 });
    await signInAsE2EOwner(page, /\/console\/docs/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Developer Docs" }),
    ).toBeVisible({ timeout: 30_000 });

    // --- The Overview area is what `/console/docs` opens on -----------------
    await expectAreaRendered(page, AREAS[0]);
    // Area links are routes; the nested section links are in-page anchors.
    await expect(areaNav(page).locator('a:not([href^="#"])')).toHaveCount(
      AREAS.length,
    );
    for (const area of AREAS) {
      await expect(areaLink(page, area)).toHaveAttribute("href", area.path);
    }

    // The Overview carries the credential table and the authorization sequence.
    await expect(
      page.getByRole("table", {
        name: /credential and authorization artifact/i,
      }),
    ).toBeVisible();
    await expect(page.locator("#flow ol > li")).toHaveCount(9);

    // --- Every area switches, and shows only its own sections ----------------
    for (const area of AREAS.slice(1)) {
      await areaLink(page, area).click();
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
    // resolves; the rendered result is still the not-found page.)
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
    // The docs render placeholder credentials, never a live secret.
    const tokenAreaText = await page.locator("main").innerText();
    expect(tokenAreaText).toContain("<SECURISELF_CLIENT_SECRET>");
    expect(tokenAreaText).toContain("scs_client_example");

    // --- The sidebar sits between the Console sidebar and the content --------
    const consoleBox = await page
      .getByRole("navigation", { name: "Console" })
      .boundingBox();
    const areaBoxTop = await areaNav(page).boundingBox();
    const activeBox = await areaLink(page, AREAS[3]).boundingBox();
    const sectionBox = await sectionList(page, AREAS[3]).boundingBox();
    const contentBox = await page.locator("#code-to-token").boundingBox();
    expect(consoleBox).not.toBeNull();
    expect(areaBoxTop).not.toBeNull();
    expect(activeBox).not.toBeNull();
    expect(sectionBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    // The Console sidebar occupies its own column, left of the docs sidebar.
    expect(consoleBox!.x + consoleBox!.width).toBeLessThanOrEqual(areaBoxTop!.x);
    // The docs sidebar is a column left of the content, not a bar above it.
    expect(areaBoxTop!.x + areaBoxTop!.width).toBeLessThanOrEqual(contentBox!.x);
    expect(areaBoxTop!.height).toBeGreaterThan(areaBoxTop!.width);
    // The section list is nested: directly below its area entry, indented.
    expect(activeBox!.y + activeBox!.height).toBeLessThanOrEqual(sectionBox!.y);
    expect(sectionBox!.x).toBeGreaterThan(activeBox!.x);
    // The horizontal area bar and the "On this page" aside are gone.
    await expect(page.getByText("On this page", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: /Documentation sections/ }),
    ).toHaveCount(0);

    // --- The sidebar stays on screen through a real scroll -------------------
    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThan(800);

    await expect(areaNav(page)).toBeInViewport();
    await expect(sectionList(page, AREAS[3])).toBeInViewport();
    const topbar = await topbarBottom(page);
    const areaBoxScrolled = await areaNav(page).boundingBox();
    // Pinned (`top-24`) just below the h-16 sticky Console topbar.
    expect(areaBoxScrolled!.y).toBeGreaterThanOrEqual(topbar);
    expect(areaBoxScrolled!.y).toBeLessThanOrEqual(topbar + 48);

    // --- A nested section link jumps without obscuring content ---------------
    await sectionList(page, AREAS[3])
      .getByRole("link", { name: "Server-side token exchange", exact: true })
      .click();
    await expect(page).toHaveURL(/#token$/);
    const tokenHeading = page.getByRole("heading", {
      level: 2,
      name: "Server-side token exchange",
    });
    await expect(tokenHeading).toBeInViewport();
    const headingBox = await tokenHeading.boundingBox();
    // `scroll-mt-32` must clear the sticky Console topbar.
    expect(headingBox!.y).toBeGreaterThanOrEqual(await topbarBottom(page));
    await expect(areaNav(page)).toBeInViewport();

    // --- The sidebar is keyboard operable ------------------------------------
    const overviewLink = areaLink(page, AREAS[0]);
    await overviewLink.focus();
    await expect(overviewLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(areaLink(page, AREAS[1])).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForURL(
      (url) => url.pathname === "/console/docs/setup",
      { timeout: 30_000 },
    );
    await expectAreaRendered(page, AREAS[1]);

    // --- Nested section links follow the active area in document tab order ---
    await areaLink(page, AREAS[1]).focus();
    await page.keyboard.press("Tab");
    await expect(
      sectionList(page, AREAS[1]).getByRole("link", {
        name: AREAS[1].sections[0].title,
        exact: true,
      }),
    ).toBeFocused();

    // --- The credential lifecycle and authorization sequence on the Overview -
    await areaLink(page, AREAS[0]).click();
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

    // --- Profile API request examples ----------------------------------------
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

    // --- Context payload and localization reference --------------------------
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

    // --- Token exchange, revocation and error material -----------------------
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
