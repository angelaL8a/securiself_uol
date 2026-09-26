import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";
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

const PRO = E2E_CONTEXTS.PROFESSIONAL;

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
    await signInToConsole(page);
    await openProfessionalEditor(page);

    await page.locator("#pronouns-en").fill(PRO.pronouns);
    await page.locator("#jobTitle-en").fill(PRO.jobTitle);
    await page.locator("#shortBio-en").fill(PRO.shortBio);
    await expect(page.locator("#company")).toHaveValue(PRO.company);

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
  });

  test("returns the same authorised profile in English and Spanish", async ({
    page,
  }) => {
    await reachConsentScreen(page);
    await selectContextByInternalName(page, PRO.internalName);
    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "PROFESSIONAL");
    await expect(page.getByText("Founder")).toBeVisible();

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

    await page.getByRole("button", { name: "EN" }).click();
    await expect(
      page.getByRole("definition").filter({ hasText: "Founder" }),
    ).toBeVisible();
  });

  test("falls back per field when Spanish job title is missing", async ({
    page,
  }) => {
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
  });
});
