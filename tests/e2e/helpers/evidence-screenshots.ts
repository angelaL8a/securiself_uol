import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

export const EVIDENCE_VIEWPORT = { width: 1280, height: 720 } as const;

export const SCREENSHOT_DIR = path.resolve(
  __dirname,
  "../../../writeup-evidence/screenshots",
);

/** Resolves HEAD at capture time; fails closed if git is unavailable. */
export function resolveEvaluatedCommit(): string {
  return execSync("git rev-parse HEAD", {
    cwd: path.resolve(__dirname, "../../.."),
    encoding: "utf8",
  }).trim();
}

export const EVALUATED_COMMIT = resolveEvaluatedCommit();

/** Filenames aligned with writeup-evidence/screenshots-plan.md */
export const SCREENSHOT_FILES = {
  prymecabLanding: "ss-03-prymecab-landing.png",
  oauthConsent: "ss-04-oauth-consent.png",
  consentPreviewSocial: "ss-05-consent-preview-social.png",
  prymecabProfileSocial: "ss-06-prymecab-profile-social.png",
  activityProfileRead: "ss-07-activity-profile-read.png",
  consentDenied: "ss-08-consent-denied.png",
  playwrightE2eSummary: "ss-01-playwright-e2e-summary.png",
  socialDisclosureReport: "ss-02-social-disclosure-report.png",
  a11yResultView: "ss-09-a11y-result-view.png",
} as const;

export function ensureScreenshotDir(): void {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

export async function prepareEvidencePage(page: Page): Promise<void> {
  await page.setViewportSize(EVIDENCE_VIEWPORT);
}

/**
 * Captures a viewport screenshot (not full-page) unless fullPage is requested.
 * Does not open DevTools; does not include browser chrome (no address-bar secrets).
 */
export async function captureEvidenceScreenshot(
  page: Page,
  filename: string,
  options: { fullPage?: boolean } = {},
): Promise<string> {
  ensureScreenshotDir();
  const target = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({
    path: target,
    fullPage: options.fullPage ?? false,
    animations: "disabled",
  });
  return target;
}

/**
 * Captures a single locator (e.g. consent card) without a full document scroll.
 * Prefer this over fullPage when the interactive region is taller than the viewport
 * but still a single self-contained UI figure.
 */
export async function captureEvidenceLocatorScreenshot(
  locator: import("@playwright/test").Locator,
  filename: string,
): Promise<string> {
  ensureScreenshotDir();
  const target = path.join(SCREENSHOT_DIR, filename);
  await locator.screenshot({
    path: target,
    animations: "disabled",
  });
  return target;
}

export function playwrightReportIndexPath(): string {
  return path.resolve(
    __dirname,
    "../../../writeup-evidence/reports/playwright-report/index.html",
  );
}

export function a11yPlaywrightReportIndexPath(): string {
  return path.resolve(
    __dirname,
    "../../../writeup-evidence/reports/accessibility-playwright-report/index.html",
  );
}

/**
 * Serves an archived Playwright HTML report directory over HTTP so the SPA can load.
 * Returns base URL and a close function.
 */
export async function serveStaticReportDir(
  indexHtmlPath: string,
  port: number,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const root = path.dirname(indexHtmlPath);
  const mime: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  };

  const server: Server = createServer((req, res) => {
    const raw = (req.url ?? "/").split("?")[0] || "/";
    const rel = decodeURIComponent(raw === "/" ? "/index.html" : raw);
    const filePath = path.normalize(path.join(root, rel));
    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
    res.end(readFileSync(filePath));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
