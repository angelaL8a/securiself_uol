import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "../fixtures/test";
import { fetchPrymeCabProfile } from "../helpers/api";
import {
  approveConsent,
  expectPrymeCabProfileContext,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import {
  E2E_CONTEXTS,
  E2E_ORIGINS,
  E2E_USER,
} from "../fixtures/test-data";

const SCREENSHOT_DIR = path.join(
  __dirname,
  "../../../docs/sprint3/images/multilanguage-e2e",
);

const PRO = E2E_CONTEXTS.PROFESSIONAL;
const VIEWPORT = { width: 1280, height: 720 } as const;
const PRYMECAB_VIEWPORT = { width: 1280, height: 1100 } as const;

async function capture(page: Page, filename: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    animations: "disabled",
  });
}

async function capturePrymeCabProfile(
  page: Page,
  filename: string,
): Promise<void> {
  await page.setViewportSize(PRYMECAB_VIEWPORT);
  const card = page
    .locator("div.max-w-sm")
    .filter({ has: page.getByRole("button", { name: /Log out/i }) });
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await capture(page, filename);
}

async function signInToConsole(page: Page): Promise<void> {
  await page.goto(`${E2E_ORIGINS.platform}/sign-in`);
  await page.getByLabel("Email").fill(E2E_USER.email);
  await page.getByLabel("Password").fill(E2E_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console/);
}

async function openProfessionalEditor(page: Page): Promise<void> {
  await page.goto(`${E2E_ORIGINS.platform}/console/contexts`);
  await page.getByRole("heading", { name: PRO.internalName }).click();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
}

test.describe("PROFESSIONAL localization", () => {
  test("enters English and Spanish values and keeps them after reload", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT);
    await signInToConsole(page);
    await openProfessionalEditor(page);

    await page.locator("#pronouns-en").fill(PRO.pronouns);
    await page.locator("#jobTitle-en").fill(PRO.jobTitle);
    await page.locator("#shortBio-en").fill(PRO.shortBio);
    await expect(page.locator("#company")).toHaveValue(PRO.company);

    await page.getByRole("tab", { name: "English" }).scrollIntoViewIfNeeded();
    await capture(page, "01-context-multilingual-input.png");

    await page.getByRole("tab", { name: "Español" }).click();
    await page.locator("#pronouns-es").fill(PRO.pronounsI18n.es);
    await page.locator("#jobTitle-es").fill(PRO.jobTitleI18n.es);
    await page.locator("#shortBio-es").fill(PRO.shortBioI18n.es);
    await expect(page.locator("#company")).toHaveValue(PRO.company);

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Context updated")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
    await page.getByRole("tab", { name: "Español" }).click();
    await expect(page.locator("#pronouns-es")).toHaveValue(PRO.pronounsI18n.es);
    await expect(page.locator("#jobTitle-es")).toHaveValue(PRO.jobTitleI18n.es);
    await expect(page.locator("#shortBio-es")).toHaveValue(PRO.shortBioI18n.es);
    await expect(page.locator("#company")).toHaveValue(PRO.company);

    await page.getByRole("tab", { name: "Español" }).scrollIntoViewIfNeeded();
    await capture(page, "02-context-spanish-values.png");
  });

  test("returns the same authorised profile in English and Spanish", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT);
    await reachConsentScreen(page);
    await selectContextByInternalName(page, PRO.internalName);
    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "PROFESSIONAL");
    await expect(page.getByText("Founder")).toBeVisible();
    await capturePrymeCabProfile(page, "04-prymecab-english-profile.png");

    const englishRes = await fetchPrymeCabProfile(page.request, {
      "Accept-Language": "en",
    });
    expect(englishRes.ok()).toBeTruthy();
    const english = (await englishRes.json()) as {
      context: string;
      data: Record<string, string | null>;
    };
    expect(english.context).toBe("PROFESSIONAL");
    expect(english.data.short_bio).toBe("Founder");
    expect(english.data.job_title).toBe(PRO.jobTitle);
    expect(english.data.pronouns).toBe(PRO.pronouns);

    const spanishRes = await fetchPrymeCabProfile(page.request, {
      "Accept-Language": "es",
    });
    expect(spanishRes.ok()).toBeTruthy();
    const spanish = (await spanishRes.json()) as {
      data: Record<string, string | null>;
    };
    expect(spanish.data.short_bio).toBe("Fundadora");
    expect(spanish.data.job_title).toBe("Ingeniera de software");
    expect(spanish.data.pronouns).toBe("ella");
    expect(spanish.data.company).toBe(PRO.company);

    await page.getByRole("button", { name: "ES" }).click();
    await expect(
      page.getByRole("definition").filter({ hasText: "Fundadora" }),
    ).toBeVisible();
    await expect(page.getByText("Founder")).toHaveCount(0);
    await capturePrymeCabProfile(page, "05-prymecab-spanish-profile.png");

    await page.getByRole("button", { name: "EN" }).click();
    await expect(
      page.getByRole("definition").filter({ hasText: "Founder" }),
    ).toBeVisible();
  });

  test("falls back per field when Spanish job title is missing", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT);
    await signInToConsole(page);
    await openProfessionalEditor(page);
    await page.getByRole("tab", { name: "Español" }).click();
    await page.locator("#jobTitle-es").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Context updated")).toBeVisible();

    await reachConsentScreen(page);
    await selectContextByInternalName(page, PRO.internalName);
    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "PROFESSIONAL");

    const spanishRes = await fetchPrymeCabProfile(page.request, {
      "Accept-Language": "es",
    });
    expect(spanishRes.ok()).toBeTruthy();
    const spanish = (await spanishRes.json()) as {
      context: string;
      data: Record<string, string | null>;
    };
    expect(spanish.context).toBe("PROFESSIONAL");
    expect(spanish.data.job_title).toBe(PRO.jobTitle);
    expect(spanish.data.pronouns).toBe("ella");
    expect(spanish.data.short_bio).toBe("Fundadora");
    expect(spanish.data.company).toBe(PRO.company);

    await page.getByRole("button", { name: "ES" }).click();
    await expect(
      page.getByRole("definition").filter({ hasText: "Ingeniera de software" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("definition").filter({ hasText: PRO.jobTitle }),
    ).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: "Fundadora" }),
    ).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: "ella" }),
    ).toBeVisible();
    await capturePrymeCabProfile(page, "06-language-fallback.png");
  });
});
