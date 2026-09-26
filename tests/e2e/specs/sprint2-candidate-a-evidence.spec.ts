import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "../fixtures/test";
import { prepareEvidencePage } from "../helpers/evidence-screenshots";
import {
  approveConsent,
  expectPrymeCabProfileContext,
  openActivity,
  openGrants,
  openPrymeCabLanding,
  reachConsentScreen,
  selectContextByInternalName,
} from "../helpers/oauth-flow";
import { E2E_CLIENT, E2E_CONTEXTS } from "../fixtures/test-data";
import type { Page } from "@playwright/test";

const EVIDENCE_ROOT = path.resolve(
  __dirname,
  "../../../docs/sprints/evidence/sprint2-candidate-a",
);
const SCREENSHOT_DIR = path.join(EVIDENCE_ROOT, "screenshots");

const FILES = {
  activeGrant: "s2-01-active-prymecab-grant.png",
  revokeDialog: "s2-02-revoke-confirmation.png",
  revokedGrant: "s2-03-revoked-grant.png",
  accessRevokedActivity: "s2-04-activity-access-revoked.png",
  prymecabAccessLost: "s2-05-prymecab-access-lost.png",
} as const;

async function captureSprint2(page: Page, filename: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: false,
    animations: "disabled",
  });
}

/**
 * Deterministic Sprint 2 Candidate A evidence.
 * Tagged @sprint2-evidence so it stays out of the default E2E suite.
 */
test.describe("Sprint 2 Candidate A evidence @sprint2-evidence", () => {
  test.describe.configure({ mode: "serial" });

  test("capture Grants revoke journey states", async ({ page }) => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await prepareEvidencePage(page);

    await reachConsentScreen(page);
    await selectContextByInternalName(page, E2E_CONTEXTS.SOCIAL.internalName);
    await approveConsent(page);
    await expectPrymeCabProfileContext(page, "SOCIAL");

    await openGrants(page);
    const revokeName = new RegExp(
      `Revoke ${E2E_CLIENT.name} access to ${E2E_CONTEXTS.SOCIAL.displayName}`,
      "i",
    );
    await expect(page.getByText("Active").first()).toBeVisible();
    await expect(page.getByText(E2E_CLIENT.name).first()).toBeVisible();
    await captureSprint2(page, FILES.activeGrant);

    await page.getByRole("button", { name: revokeName }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/invalidate active access/i)).toBeVisible();
    await captureSprint2(page, FILES.revokeDialog);

    await dialog.getByRole("button", { name: revokeName }).click();
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: revokeName })).toHaveCount(0);
    await expect(
      page.locator('[data-slot="badge"]', { hasText: /^Revoked$/ }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await captureSprint2(page, FILES.revokedGrant);

    await openActivity(page);
    await expect(page.getByText("Access revoked").first()).toBeVisible({
      timeout: 15_000,
    });
    await captureSprint2(page, FILES.accessRevokedActivity);

    await openPrymeCabLanding(page);
    await expect(page.getByTestId("access-lost")).toBeVisible({
      timeout: 15_000,
    });
    await captureSprint2(page, FILES.prymecabAccessLost);

    writeFileSync(
      path.join(EVIDENCE_ROOT, "screenshots", "manifest.md"),
      [
        "# Sprint 2 Candidate A screenshots",
        "",
        `| File | State |`,
        `| --- | --- |`,
        `| ${FILES.activeGrant} | Active PrymeCab Grant on \`/console/grants\` |`,
        `| ${FILES.revokeDialog} | Revoke confirmation for PrymeCab + Context |`,
        `| ${FILES.revokedGrant} | Revoked Grant after mutation |`,
        `| ${FILES.accessRevokedActivity} | Activity \`ACCESS_REVOKED\` |`,
        `| ${FILES.prymecabAccessLost} | PrymeCab access-lost state |`,
        "",
      ].join("\n"),
      "utf8",
    );
  });
});
